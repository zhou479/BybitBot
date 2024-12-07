## 功能
1. 自动划转并市价卖出
2. 限价卖出
3. 查询账户余额

## 使用方法
0. git clone此脚本，之后执行npm install安装需要的依赖
1. 需要创建Bybit API，并在API配置中添加自己电脑IP(可到https://www.ipaddress.my/?lang=zh_CN查看IP)，同时开启现货交易和资金划转权限
2. 复制.env_example为.env或者自行创建.env文件，将创建好的API写入.env文件中
3. src/config.js文件设置需要交易的币种，index.js中开启需要的操作（市价还是限价挂单），保存文件
4. 执行```node index.js```命令运行程序

## 注意事项
该脚本不会任何保存API信息，可咨询其他专业人士审查代码。
使用时需要有一定代码基础。