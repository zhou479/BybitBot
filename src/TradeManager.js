const logger = require('./SetLogger');
const { config } = require('./config');
const BybitManager = require('./BybitManager');

class TradeManager {
    constructor(accountConfig) {
        this.accountNum = accountConfig.accountNum;
        this.bybitmanager = new BybitManager(
            accountConfig.apiKey,
            accountConfig.apiSecret
        );
    }

    // 等待直到指定时间
    async waitUntilTime(targetTime) {
        const target = typeof targetTime === 'string' ? new Date(targetTime) : targetTime;
        while (new Date() < target) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // 等待交易开始
    async waitForTradingTime() {
        if (!config.coin.tradTime) {
            return true;
        }

        const now = new Date();
        const tradeTime = config.coin.tradTime ? new Date(config.coin.tradTime) : null;

        if (tradeTime && now < tradeTime) {
            logger.warn(`Account${this.accountNum} | 未到 ${config.coin.symbol} 交易开始时间, 等待中...`);
            await this.waitUntilTime(tradeTime);
        }

        logger.info(`Account${this.accountNum} | ${config.coin.symbol} 交易已开启或者无交易时间限制`);
    }

    // 交易前准备工作, 返回下单数量
    async tradePreparation(coinType, fromAccountType, toAccountType) {
        try {
            // 查询FUND账户是否有该币种余额
            const fundBalanceResult = await this.bybitmanager.BMgetCoinBalance(this.accountNum, 'FUND', coinType);

            // 如果FUND账户有该币种余额，则进行划转
            if (fundBalanceResult.success && fundBalanceResult.coinBalance > 0) {   
                const transferResult = await this.bybitmanager.interTransferCoin(
                    this.accountNum, coinType,
                    fundBalanceResult.coinBalance,
                    fromAccountType,
                    toAccountType
                );
                if (!transferResult) {
                    throw new Error(`${coinType} 划转到UNIFIED失败`);
                } else {
                    logger.info(`Account${this.accountNum} | ${coinType} 划转到UNIFIED成功`);
                }
            } else {
                logger.info(`Account${this.accountNum} | FUND账户无${coinType}余额, 无需划转`);
            }

            // 查询UNIFIED账户是否有该币种余额
            const unifiedBalanceResult = await this.bybitmanager.BMgetCoinBalance(this.accountNum, 'UNIFIED', coinType);
            if (!unifiedBalanceResult.success) {
                throw new Error(`UNIFIED账户无${coinType}余额, 无法交易`);
            }

            // 获取下单精度和最小下单数量
            const getCoinBasePrecisionAndMinOrderQtyResult = await this.bybitmanager.getCoinBasePrecisionAndMinOrderQty(
                this.accountNum,
                coinType
            );
            if (!getCoinBasePrecisionAndMinOrderQtyResult.success) {
                throw new Error(`获取${coinType}下单精度和最小下单数量失败`);
            }
            const coinBasePrecision = getCoinBasePrecisionAndMinOrderQtyResult.coinBasePrecision;
            const coinMinOrderQty = getCoinBasePrecisionAndMinOrderQtyResult.coinMinOrderQty;

            // 计算挂单数量并判断是否大于最小挂单量
            const calCoinAmountResult = await this.bybitmanager.calCoinAmount(
                this.accountNum,
                unifiedBalanceResult.coinBalance,
                coinBasePrecision,
                coinMinOrderQty
            );
            if (!calCoinAmountResult.success) {
                throw new Error(`计算${coinType}挂单数量失败或者小于最小挂单数量`);
            }

            return {
                success: true,
                coinAmount: calCoinAmountResult.coinAmount
            };
        } catch(error) {
            logger.error(`Account${this.accountNum} | 交易前准备工作失败 ${error.message}`);
            return {success: false, coinAmount: null};
        }
    }

    // 市价挂单模块
    async placeMarketOrders(coinType, orderSide) {
        try {
            // 完成交易前准备工作, 获取挂单数量
            const tradePreparationResult = await this.tradePreparation(coinType, 'FUND', 'UNIFIED');
            if (!tradePreparationResult.success) {
                throw new Error(`${coinType} 交易前准备工作失败`);
            }
            const coinAmount = tradePreparationResult.coinAmount;

            // 进行市价挂单
            const orderResult = await this.bybitmanager.placeMarketOrder(this.accountNum, coinType, orderSide, coinAmount);
            if (!orderResult.success) {
                throw new Error(`${coinType} 市价卖出失败`);
            }
            logger.success(`Account${this.accountNum} | ${coinType} 市价卖出成功, 数量: ${coinAmount}, 订单ID: ${orderResult.orderId}`);
            return true;
        } catch (error) {
            logger.error(`Account${this.accountNum} | 市价卖出失败 ${error.message}`);
            return false;
        }
    }


    // 限价挂单模块
    async placeLimitOrders(coinType, coinSide, coinPrice) {
        // 如果指定了开始时间，则等待
        await this.waitForTradingTime();

        try {
            const tradePreparationResult = await this.tradePreparation(coinType, 'FUND', 'UNIFIED');
            if (!tradePreparationResult.success) {
                throw new Error(`${coinType} 交易前准备工作失败`);
            }
            const coinAmount = tradePreparationResult.coinAmount;

            const orderResult = await this.bybitmanager.placeLimitOrder(this.accountNum, coinType, coinSide, coinAmount, coinPrice);
            if (!orderResult.success) {
                throw new Error(`${coinType} 限价挂单失败`);
            }
            logger.success(`Account${this.accountNum} | ${coinType} 限价挂单成功, 数量: ${coinAmount}, 价格: ${coinPrice}, 订单ID: ${orderResult.orderId}`);
            return orderResult;
        } catch (error) {
            logger.error(`Account${this.accountNum} | 限价单提交失败 ${error.message}`);
            return false;
        }
    }

    // 取消所有挂单模块
    async cancelAllOrders() {
        try {
            const cancelAllOrdersResult = await this.bybitmanager.cancelAllOrders(this.accountNum);
            if (!cancelAllOrdersResult) {
                throw new Error(`请求取消所有挂单失败`);
            }
            logger.success(`Account${this.accountNum} | 取消所有挂单成功`);
            return true;
        } catch (error) {
            logger.error(`Account${this.accountNum} | 取消所有挂单失败 ${error.message}`);
            return false;
        }
    }

    // 查询Account所有余额
    async queryAccountBalances() {
        try {
            const FUNDBalancesResult = await this.bybitmanager.BMgetAllCoinsBalance(this.accountNum, 'FUND');
            const UNIFIEDBalancesResult = await this.bybitmanager.BMgetAllCoinsBalance(this.accountNum, 'UNIFIED');
            let accountBalances = [];
            if (FUNDBalancesResult.success) {
                accountBalances = [...FUNDBalancesResult.coinsList];
            }
            if (UNIFIEDBalancesResult.success) {
                accountBalances = [...accountBalances, ...UNIFIEDBalancesResult.coinsList];
            }

            accountBalances.forEach(accountBalance => {
                logger.success(`Account${this.accountNum} | ${accountBalance.accountType}币种 ${accountBalance.symbol}: 余额 ${accountBalance.balance}`);
            });
        } catch (error) {
            logger.error(`Account${this.accountNum} | 查询账户余额失败 ${error.message}`);
            return false;
        }
    }

    // 修改API绑定的IP
    async updateAPIIP(newIPs) {
        try {
            const APIParams = {
                ips: [newIPs],
                permissions: {
                    ContractTrade: [],
                    Spot: ['SpotTrade'],
                    Wallet: ['AccountTransfer'],
                    Options: [],
                    Derivatives: ['DerivativesTrade'],
                    CopyTrading: [],
                    BlockTrade: [],
                    Exchange: [],
                  NFT: [],
                }
            }

            const updateAPIIPResult = await this.bybitmanager.updateAPI(this.accountNum, APIParams);
            if (updateAPIIPResult.success == false) {
                throw new Error(`修改API绑定IP失败`);
            }
            logger.success(`修改API绑定IP成功`);

            const getAPIInfoResult = await this.bybitmanager.getAPIInfo(this.accountNum);
            if (!getAPIInfoResult.success) {
                throw new Error(`查询API绑定IP信息失败`);
            }

            logger.success(`API绑定IP为${getAPIInfoResult.APIInfo.ips}`);
            return true;
        } catch (error) {
            logger.error(`Account${this.accountNum} | 修改API绑定IP并查询绑定IP出现失败 ${error.message}`);
            return false
        }
    }
}

module.exports = TradeManager;