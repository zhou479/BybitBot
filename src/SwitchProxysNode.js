const axios = require('axios');
const logger = require('./SetLogger');

class SwitcherProxyNode {
  constructor(config) {
    this.clashApi = axios.create({
      baseURL: config.baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });
    this.ipInfoUrl = config.ipInfoUrl || 'https://api.ipify.org?format=json';
    this.delay = this.delay.bind(this);
  }

  // 延时函数
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 获取所有 Proxy 节点
  async getProxies() {
    try {
      const response = await this.clashApi.get('/proxies');
      return response.data.proxies;
    } catch (error) {
      logger.error('获取节点信息失败:', error.message);
      return null;
    }
  }

  // 切换到指定 Proxy 节点
  async switchProxy(groupName, proxyName, delayMs = 5000) {
    try {
        await this.clashApi.put(`/proxies/${encodeURIComponent(groupName)}`, { name: proxyName });
        const currentIp = await this.getCurrentIp();
        await this.delay(delayMs);
        logger.debug(`切换节点到 ${proxyName} 成功, 当前IP为: ${currentIp}`);
    } catch (error) {
        logger.error('切换节点失败:', error);
      throw error;
    }
  }

  // 获取当前 IP 信息
  async getCurrentIp() {
    try {
      const response = await axios.get(this.ipInfoUrl);
      return response.data.ip;
    } catch (error) {
      logger.error('获取 IP 信息失败:', error.message);
      return null;
    }
  }
}

module.exports = SwitcherProxyNode;
