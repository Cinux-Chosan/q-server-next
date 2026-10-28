#!/usr/bin/env node
import { parseArgs } from './cli.js';
import { buildApp } from './app.js';
import { config } from './config.js';

async function main() {
  parseArgs(process.argv);

  const app = await buildApp();

  // 自动退出（--kill）
  if (config.autoKillMs && config.autoKillMs > 0) {
    setTimeout(() => {
      app.log.info('到达自动退出时间，进程结束');
      void app.close();
      process.exit(0);
    }, config.autoKillMs).unref();
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });

  const mode = config.users.size ? `受保护(用户数 ${config.users.size})` : '开放访问';
  app.log.info('──────────────────────────────────────────────');
  app.log.info(`  ${config.title}`);
  app.log.info(`  本地访问:   http://localhost:${config.port}`);
  app.log.info(`  文件根目录: ${config.rootDir}`);
  app.log.info(`  模式:       ${mode}`);
  app.log.info(`  上传:       ${config.uploadEnabled ? '开启' : '关闭'}`);
  app.log.info('──────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
