const TradeManager = require('./src/TradeManager');
const { config, accountsList } = require('./src/config');

async function main() {
    try {
        const accountPromises = accountsList.map(async (accountConfig) => {
            const tradeManager = new TradeManager(accountConfig);

            // 取消所有订单
            // await tradeManager.cancelAllOrders();

            // 市价卖出
            // await tradeManager.placeMarketOrders(config.coin.symbol, 'Sell');

            // 限价卖出(可等待交易开启, 自行设置限价单的价格)
            // await tradeManager.placeLimitOrders(config.coin.symbol, 'Sell', '0.16');

            // 查询账户所有余额
            await tradeManager.queryAccountBalances();
        });
        await Promise.all(accountPromises);
    } catch (error) {
        console.error("交易执行失败:", error);
    }
}

main();