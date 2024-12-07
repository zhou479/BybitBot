const winston = require('winston');

// 自定义日志等级
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        success: 3,
        debug: 4,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'cyan',
        success: 'green',
        debug: 'blue',
    },
};

// 添加颜色配置
winston.addColors(customLevels.colors);

// 创建日志格式
const logFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => {
        return `${info.timestamp} | ${info.level} | ${info.message}`;
    })
);

// 日志配置
const logConfiguration = {
    levels: customLevels.levels,
    level: 'debug',
    transports: [
        // 控制台输出
        new winston.transports.Console(),

        // 综合日志文件
        new winston.transports.File({ 
            filename: 'logs/run.log',
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.printf(info => {
                    return `${info.timestamp} | ${info.level} | ${info.message}`;
                })
            )
        })
    ],
    format: logFormat
};

// 创建logger实例
const logger = winston.createLogger(logConfiguration);

// 导出logger实例
module.exports = logger;