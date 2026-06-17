const app = require('./app');
const config = require('./config');
const os = require('os');

// 显式绑定 0.0.0.0（IPv4 所有网卡），确保手机真机调试可访问
// macOS 上 app.listen(port) 默认 IPv6 双栈，部分手机/路由器兼容性差
app.listen(config.port, '0.0.0.0', () => {
  // 获取本机局域网 IP 方便真机调试
  const interfaces = os.networkInterfaces();
  const localIPs = [];
  Object.values(interfaces).forEach((iface) => {
    iface.forEach((addr) => {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIPs.push(addr.address);
      }
    });
  });

  console.log('═══════════════════════════════════════');
  console.log('  🏠 住好房装修展示平台 API Server');
  console.log('═══════════════════════════════════════');
  console.log(`  📡 本地地址: http://localhost:${config.port}`);
  console.log('  📡 局域网地址:');
  localIPs.forEach((ip) => {
    console.log(`     http://${ip}:${config.port}`);
  });
  console.log('  ❤️  健康检查: /api/health');
  console.log('  🔍 网络诊断: /api/network-check');
  console.log('═══════════════════════════════════════');
  console.log('  💡 真机调试提示：');
  console.log(`     1. 手机连接同一 WiFi`);
  console.log(`     2. 手机浏览器访问 http://${localIPs[0] || '???'}:${config.port}/api/network-check`);
  console.log(`     3. 如果能打开 → 网络通，检查小程序 constants.js 的 BASE_URL`);
  console.log('═══════════════════════════════════════');
});
