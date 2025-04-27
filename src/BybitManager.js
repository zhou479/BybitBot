const { RestClientV5 } = require('bybit-api');
const { v4: uuidv4 } = require('uuid');
const logger = require('./SetLogger');
const Decimal = require('decimal.js');

class BybitManager {
    // 构造函数
    constructor(apiKey, apiSecret) {
        this.client = new RestClientV5({
            key: apiKey,
            secret: apiSecret,
            parseAPIRateLimits: true,
        });
    }

    // 查询所有币种余额，返回值为币种余额列表
    async BMgetAllCoinsBalance(accountNum, accountType, coin) {
        try {
            let coinsList = [];
            const allCoinBalanceResult = await this.client.getAllCoinsBalance({accountType: accountType, coin: coin});
            if (allCoinBalanceResult.retCode !== 0) {
                throw new Error(`查询${accountType}账户余额失败: ${allCoinBalanceResult.retMsg}`);
            }

            const allCoinBalance = allCoinBalanceResult.result.balance;
            if (allCoinBalance.length === 0) {
                throw new Error(`${accountType}账户余额为空`);
            }

            allCoinBalance.forEach(coin => {
                if (coin.walletBalance > 0) {
                    coinsList.push({
                        symbol: coin.coin,
                        balance: coin.walletBalance,
                        accountType: accountType
                    })
                }
            });

            return {
                success: true,
                coinsList: coinsList
            }
        } catch(error) {
            logger.error(`Account${accountNum} | getCoinsBalance出现错误: ${error.message}`);
            return {
                success: false,
                coinsList: null
            };
        }
    }

    async BMgetCoinBalance(accountNum, accountType, coinType) {
        try {
            const coinBalanceResult = await this.client.getCoinBalance({
                accountType: accountType,
                coin: coinType
            });
            if (coinBalanceResult.retCode !== 0) {
                throw new Error(`获取${accountType}账户 ${coinType} 余额失败: ${coinBalanceResult.retMsg}`);
            }

            const coinBalance = coinBalanceResult.result.balance.transferBalance;
            return {
                success: true,
                coinBalance: coinBalance
            };
        } catch(error) {
            logger.error(`Account${accountNum} | coinsBalance出现错误 ${error.message}`);
            return {
                success: false,
                coinBalance: null
            };
        }
    }

    // 内部划转代币
    async interTransferCoin(accountNum, coinType, coinAmount, fromAccountType, toAccountType) {
        try {
            const interTransferUUID = uuidv4();
            const createInternalTransferResult = await this.client.createInternalTransfer(
                interTransferUUID,
                coinType,
                coinAmount,
                fromAccountType,
                toAccountType,
            );
            if (createInternalTransferResult.retCode !== 0) {
                throw new Error(`${coinType} 划转失败 : ${createInternalTransferResult.retMsg}`);
            }

            if (createInternalTransferResult.result.transferId !== null) {
                // console.log(`Account${accountNum} | 划转id ${createInternalTransferResult.result.transferId}`);
                return true;
            }
            return false
        } catch(error) {
            logger.error(`Account${accountNum} | createInterTransfer出现错误 ${error.message}`);
            return false;
        }
    }

    // 获取下单币种的数量精度和数量
    async getCoinBasePrecisionAndMinOrderQty(accountNum, coinType) {
        try {
            const coinInstrumentsInfoResult = await this.client.getInstrumentsInfo({
                category: 'spot',
                symbol: `${coinType}USDT`
            });

            if (coinInstrumentsInfoResult.retCode !== 0) {
                throw new Error(`获取 ${coinType} 下单币种信息请求失败: ${coinInstrumentsInfoResult.retMsg}`);
            }
            if (coinInstrumentsInfoResult.result.list.length === 0) {
                throw new Error(`获取 ${coinType} 币种信息列表失败`);
            }

            const coinBasePrecision = coinInstrumentsInfoResult.result.list[0].lotSizeFilter.basePrecision;
            const coinMinOrderQty = coinInstrumentsInfoResult.result.list[0].lotSizeFilter.minOrderQty;

            return {
                success: true,
                coinBasePrecision: coinBasePrecision,
                coinMinOrderQty: coinMinOrderQty
            }
        } catch(error) {
            logger.error(`Account${accountNum} | getCoinBasePrecisionAndMinOrderQty出现错误 ${error.message}`);
            return {
                success: false,
                coinBasePrecision: null,
                coinMinOrderQty: null
            }
        }
    }

    // 计算单币最大可挂单的数量
    async calCoinAmount(accountNum, coinBalance, coinBasePrecision, coinMinOrderQty) {
        try {
            // bug代码
            // const coinBalanceNum = Number(coinBalance);
            // const coinBasePrecisionNum = Number(coinBasePrecision);
            // const coinMinOrderQtyNum = Number(coinMinOrderQty);
            // const coinAmount = (Math.floor(coinBalanceNum / coinBasePrecisionNum) * coinBasePrecisionNum).toString();

            // 使用decimal避免精度问题
            const coinBalanceNum = new Decimal(coinBalance);
            const coinBasePrecisionNum = new Decimal(coinBasePrecision);
            const coinMinOrderQtyNum = new Decimal(coinMinOrderQty);

            // 使用Decimal的div和floor方法进行精确计算
            const coinAmount = coinBalanceNum
                .div(coinBasePrecisionNum)
                .floor()
                .mul(coinBasePrecisionNum)
                .toString();

            // 使用Decimal比较大小
            if (new Decimal(coinAmount).lessThan(coinMinOrderQtyNum)) {
                throw new Error(`余额不足最小下单数量, 余额: ${coinAmount}, 最小下单量: ${coinMinOrderQty}`);
            }

            return {
                success: true,
                coinAmount: coinAmount
            };
        } catch(error) {
            logger.error(`Account${accountNum} | calCoinAmount出现错误 ${error.message}`);
            return {success: false, coinAmount: null};
        }
    }

    // 挂市价卖出单
    async placeMarketOrder(accountNum, coinType, orderSide, coinAmount) {
        try {
            const placeMarketOrderResult = await this.client.submitOrder({
                category: 'spot',
                symbol: `${coinType}USDT`,
                side: orderSide,
                orderType: 'Market',
                qty: coinAmount,
            });
            if (placeMarketOrderResult.retCode !== 0) {
                throw new Error(`${coinType} 市价卖出挂单失败: ${placeMarketOrderResult.retMsg}`);
            }
            if(placeMarketOrderResult.result.orderId == null) {
                throw new Error(`${coinType} 市价卖出挂单失败`);
            }
            return {
                success: true,
                orderId: placeMarketOrderResult.result.orderId
            };
        } catch(error) {
            logger.error(`Account${accountNum} | placeMarketOrder出现错误: ${error.message}`);
            return {success: false, orderId: null};
        }
    }

    // 挂限价卖出单
    async placeLimitOrder(accountNum, coinType, orderSide, coinAmount, coinPrice) {
        try {
            const placeLimitOrderResult = await this.client.submitOrder({
                category: 'spot',
                symbol: `${coinType}USDT`,
                side: orderSide,
                orderType: 'Limit',
                qty: coinAmount,
                price: coinPrice
            });

            if (placeLimitOrderResult.retCode !== 0) {
                throw new Error(`${coinType} 限价挂单请求失败: ${placeLimitOrderResult.retMsg}`);
            }
            if(placeLimitOrderResult.result.orderId == null) {
                throw new Error(`${coinType} 市价卖出挂单失败`);
            }

            return {
                success: true,
                orderId: placeLimitOrderResult.result.orderId
            };
        } catch(error) {
            logger.error(`Account${accountNum} | placeLimitOrder出现错误 ${error.message}`);
            return {
                success: false,
                orderId: null
            };
        }
    }

    // 提现功能
    async coinWithdraw(accountNum, coinType, coinAmount, forceChain = '1', chain = '', toAddress = '', toAddressTag = '') {
        try {
            // 构造提现参数
            let withdrawParams = {
                coin: coinType,
                address: toAddress,
                amount: coinAmount,
                feeType: 1      // 0:手动计算手续费 1:自动扣除手续费
            }

            if (forceChain === '1') {
                // 走链上
                if (chain === '') {
                    logger.error(`Account${accountNum} | 通过链上提现，需要填写链名称`);
                    return;
                }

                if (chain === 'TON') {
                    if (toAddressTag === '') {
                        logger.warn(`Account${accountNum} | 通过TON链提现, 提现地址为: ${toAddress}, 未填写tag`);
                    } else {
                        logger.info(`Account${accountNum} | 通过TON链提现, 提现地址为: ${toAddress}, 提现tag为: ${toAddressTag}`);
                        withdrawParams[tag] = toAddressTag;
                    }
                } else {
                    logger.info(`Account${accountNum} | 通过${chain}链提现, 提现地址为: ${toAddress}`);
                }
                withdrawParams[chain] = chain;

            } else if (forceChain === '2') {
                // 内转走uid
                logger.info(`Account${accountNum} | 内转UID提现, 提现UID为: ${toAddress}`);
            }
            const withdrawParamsWithTimestamp = {
                ...withdrawParams,
                timestamp: Date.now(),
            };
            
            // 进行提现
            const coinWithdrawResult = await this.client.submitWithdrawal(withdrawParamsWithTimestamp);
            if (coinWithdrawResult.retCode !== 0) {
                throw new Error(`${coinType} 发送提现请求失败: ${coinWithdrawResult.retMsg}`);
            }
    
            if (coinWithdrawResult.retMsg === 'OK') {
                logger.success(`Account${accountNum} | ${coinType} 提现成功, 订单ID: ${coinWithdrawResult.result.id}`);
            } else {
                throw new Error(coinWithdrawResult.retMsg);
            }
        } catch(error) {
            logger.error(`Account${accountNum} | ${coinType} 提现失败: ${error.message}`);
            return false;
        }
    }

    // 获取最新成交价
    async getLastPrice(accountNum, coinType) {
        try {
            const tickerInfoResult = await this.client.getTickers({
                category: 'spot',
                symbol: `${coinType}USDT`
            })

            if (tickerInfoResult.retCode != 0) {
                throw new Error(`获取 ${coinType} 交易行情失败: ${tickerInfoResult.retMsg}`);
            }
            if (tickerInfoResult.result.list == null) {
                throw new Error(`${coinType}交易对未上线`);
            }

            const tickerLastPrice = tickerInfoResult.result.list[0].lastPrice;
            return {
                success: true,
                lastPrice: tickerLastPrice
            };
        } catch(error) {
            logger.error(`Account${accountNum} | getLastPrice出现错误: ${error.message}`);
            return {success: false, lastPrice: null};
        }
    }

    // 取消所有挂单
    async cancelAllOrders(accountNum) {
        try {
            const cancelAllOrdersResult = await this.client.cancelAllOrders({
                category: 'spot',
            });
            if (cancelAllOrdersResult.retCode !== 0) {
                throw new Error(`请求取消所有挂单失败: ${cancelAllOrdersResult.retMsg}`);
            }
            if (cancelAllOrdersResult.result.success === '1') {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            logger.error(`Account${accountNum} | callAllOrders出现错误: ${error.message}`);
            return false;
        }
    }

    // 查询API信息
    async getAPIInfo(accountNum) {
        try {
            const getAPIInfoResult = await this.client.getQueryApiKey();
            if (getAPIInfoResult.retCode !== 0) {
                throw new Error(`查询API信息失败: ${getAPIInfoResult.retMsg}`);
            }
            // console.log(getAPIInfoResult.result);
            return {
                success: true,
                APIInfo: getAPIInfoResult.result
            }
        } catch (error) {
            logger.error(`Account${accountNum} | getAPIInfo出现错误: ${error.message}`);
            return {success: false, APIInfo: null}
        }
    }

    // 更新API权限
    async updateAPI(accountNum, APIParams) {
        try {
            const updateAPIResult = await this.client.updateMasterApiKey(APIParams);
            if (updateAPIResult.retCode !== 0) {
                throw new Error(`修改API信息失败: ${updateAPIResult.retMsg}`);
            }
            return {
                success: true,
                updateAPIInfo: updateAPIResult.result
            }
        } catch (error) {
            logger.error(`Account${accountNum} | UpdateAPI出现错误: ${error.message}`);
            return {success: false, updateAPIInfo: null}
        }

    }


}

module.exports = BybitManager;
