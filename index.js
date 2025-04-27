const TradeManager = require('./src/TradeManager');
const { config, accountsList } = require('./src/config');

async function main() {
    try {
        const accountPromises = accountsList.map(async (accountConfig) => {
            const tradeManager = new TradeManager(accountConfig);

            // 取消所有订单
            // await tradeManager.cancelAllOrders();

            // 市价卖出
            await tradeManager.placeMarketOrders(config.coin.symbol, 'Sell');

            // 限价卖出(可等待交易开启, 自行设置限价单的价格)
            // await tradeManager.placeLimitOrders(config.coin.symbol, 'Sell', '0.0003');

            // 查询账户余额
            await tradeManager.queryAccountBalances(config.coin.symbol);

            // 修改API绑定的IP, 多个IP写法为'1.1.1.1,2.2.2.2'
            // await tradeManager.updateAPIIP('154.64.226.176')
        });
        await Promise.all(accountPromises);
    } catch (error) {
        console.error("交易执行失败:", error);
    }
}

main();