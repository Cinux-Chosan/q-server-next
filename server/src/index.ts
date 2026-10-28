#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { parseArgs } from './cli.js';
import { buildApp } from './app.js';
import { config } from './config.js';

/**
 * Windows 中文控制台默认是 GBK(936)，Node 输出 UTF-8 会显示成「鏈湴」之类乱码。
 * 启动时把当前控制台代码页切到 UTF-8(65001)，仅 Windows 需要；失败也不影响启动。
 */
function ensureUtf8Console(): void {
  if (process.platform !== 'win32') return;
  try {
    execSync('chcp 65001', { stdio: 'ignore' });
  } catch {
    /* 忽略：非控制台环境（如被管道调用）会失败 */
  }
}

async function main() {
  ensureUtf8Console();
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
  const line = '='.repeat(46);
  app.log.info(line);
  app.log.info(`  ${config.title}`);
  app.log.info(`  本地访问:   http://localhost:${config.port}`);
  app.log.info(`  文件根目录: ${config.rootDir}`);
  app.log.info(`  模式:       ${mode}`);
  app.log.info(`  上传:       ${config.uploadEnabled ? '开启' : '关闭'}`);
  app.log.info(line);
}

main().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});
