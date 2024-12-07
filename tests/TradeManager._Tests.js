const TradeManager = require('../src/TradeManager');
const { config, accountsList } = require('../src/config');

(async () => {
    const accountConfigTest = accountsList[0];
    // 测试市价挂单placeMarketSellOrders
    if (false) {
        const tradeManager = new TradeManager(accountConfigTest);
        await tradeManager.placeMarketOrders('USDC', 'Sell');``
    }

    // 测试限价挂单placeLimitOrders
    if (false) {
        const tradeManager = new TradeManager(accountConfigTest);
        await tradeManager.placeLimitOrders(config.coin.symbol, 'Sell', '3.9');
    }

    // 测试取消所有挂单cancelAllOrders
    if (false) {
        const tradeManager = new TradeManager(accountConfigTest);
        await tradeManager.cancelAllOrders();
    }

    // 测试并发处理多个账户
    if (false) {
        try {
            const accountPromises = accountsList.map(async (accountConfig) => {
                const tradeManager = new TradeManager(accountConfig);
                try {
                    await tradeManager.placeMarketOrders(config.coin.symbol, 'Sell');

                    await tradeManager.cancelAllOrders();

                } catch (error) {
                    console.log(error.message);
                }
            });
            await Promise.all(accountPromises);
        } catch(error) {
            console.log(error);
        }
    }
})()