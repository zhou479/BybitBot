const { loggers } = require("winston");
const BybitManager = require("../src/BybitManager");
const { accountsList } = require("../src/config");


(async () => {
    const bybitmanager = new BybitManager(
        accountsList[0].apiKey,
        accountsList[0].apiSecret
    )
    const AccountNum = '1';

    // 测试getAllCoinsBalanceMe函数
    if (false) {
        const fundCoinsList = await bybitmanager.getAllCoinsBalanceMe('FUND');
        const unifiedCoinsList = await bybitmanager.getAllCoinsBalanceMe('UNIFIED');
        const allCoinsList = [...fundCoinsList,...unifiedCoinsList]
        for (const coin of allCoinsList) {
            console.log(`账户${coin.accountType} 币种 ${coin.symbol} 余额 ${coin.balance}`);
        }
    }

    // 测试BMgetCoinBalance函数
    if (false) {
        const btcBalance = await bybitmanager.BMgetCoinBalance('FUND', 'BTC');
        console.log(btcBalance);
    }

    // 测试interTransferCoin函数
    if (false) {
        const result = await bybitmanager.interTransferCoin('USDT', '1', 'UNIFIED', 'FUND');
        console.log(result);
    }

    // 测试getCoinBasePrecisionAndMinOrderQty函数
    if (false) {
        const result = await bybitmanager.getCoinBasePrecisionAndMinOrderQty('USDC');
        console.log(result);
    }

    // 测试calCoinAmount函数
    if (false) {
        const result = await bybitmanager.calCoinAmount('34.88888888', '100', '0.0001');
        console.log(result);
    }

    // 测试placeMarketOrder函数
    if (false) {``
        const result = await bybitmanager.placeMarketOrder('USDC', 'Sell', '8');
        if (result.success) {
            console.log(`挂单成功, 订单ID: ${result.orderId}`);
        } else {
            console.log('挂单失败');
        }
    }

    // 测试placeLimitOrder函数
    if (false) {
        const result = await bybitmanager.placeLimitOrder('USDC', 'Limit', '1', '2000000');
        if (result.success) {
            console.log(`挂单成功, 订单ID: ${result.orderId}`);
        } else {
            console.log('挂单失败');
        }
    }

    // 测试getLastPrice函数
    if (false) {
        const {success, lastPrice} = await bybitmanager.getLastPrice('USDC123');
        if (success) {
            console.log(`最新成交价为: ${lastPrice}`);
        } else {
            console.log('获取最新成交价失败');
        }
    }

    // 测试cancelOrder函数
    if (false) {
        const result = await bybitmanager.cancelAllOrders();
        if (result) {
            console.log(`取消所有订单成功`);
        } else {
            console.log('取消所有订单失败');
        }
    }


    // 测试updateAPI函数
    if (true) {
        const APIParams = {
            ips: ['154.64.226.176,154.64.226.177'],
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
        const result = await bybitmanager.updateAPI(AccountNum, APIParams);
        if (result.success) {
            console.log(`修改API信息成功 修改后的API IP为 ${result.updateAPIInfo.ips} permission为 ${result.updateAPIInfo.permissions}`);
        } else {
            console.log(`修改API信息失败`);
        }
    }

    // 测试getAPIInfo函数
    if (true) {
        await bybitmanager.getAPIInfo(AccountNum);
    }
    
})();