/**
 * PM2 进程管理配置
 *
 * 安装: npm install -g pm2
 * 启动: pm2 start ecosystem.config.js
 * 停止: pm2 stop zhuhaofang-server
 * 重启: pm2 restart zhuhaofang-server
 * 日志: pm2 logs zhuhaofang-server
 * 状态: pm2 status
 * 自启: pm2 startup && pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'zhuhaofang-server',
      script: './src/index.js',
      cwd: __dirname,

      // 进程数：1（SQLite 单进程）
      instances: 1,
      exec_mode: 'fork',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // 自动重启
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,

      // 日志
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 内存限制（超过 256MB 自动重启）
      max_memory_restart: '256M',

      // 优雅退出
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
