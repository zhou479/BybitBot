## 功能
1. 自动划转并市价（限价）卖出
2. 查询账户余额

## 使用方法
0. git clone此脚本，之后执行npm install安装需要的依赖
1. 需要创建Bybit API，并在API配置中添加当前自己[电脑IP](https://www.ipaddress.my/?lang=zh_CN)，同时开启现货交易和资金划转权限
2. 复制.env_example为.env或者自行创建.env文件，将创建好的API写入.env文件中
3. 在.env文件设置需要的操作（市价还是限价挂单），保存文件
4. 执行```node index.js```命令运行程序