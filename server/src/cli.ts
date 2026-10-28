import { Command } from 'commander';
import { resolve, isAbsolute } from 'node:path';
import bytes from 'bytes';
import ms from 'ms';
import { config } from './config.js';

// @types/bytes 把入参收窄成了字面量品牌类型，这里放宽为 string -> number
const toBytes = bytes as unknown as (s: string) => number;
const toMs = ms as unknown as (s: string) => number;

/**
 * 解析大小字符串。
 * bytes 包本身要求带 b 后缀才按倍数换算（裸写 1g 会被当成 1 字节），
 * 这里补全缩写：大小写不敏感，k/m/g/t/p 后可省略 b。
 *   1024 -> 1024 B ; 512k / 512K -> 512 KB ; 1m / 1M / 1mb -> 1 MB ; 1g / 1G / 1gb -> 1 GB
 */
function parseSize(s: string): number {
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*([kmgtp]?)(b?)$/i);
  if (!m) return NaN;
  const [, num, unit] = m;
  if (!unit) return Number(num); // 纯数字按字节
  return toBytes(`${num}${unit.toLowerCase()}b`);
}

/**
 * 解析命令行参数，填充全局 config。
 * 设计目标与旧版 q-server-nest 完全一致：
 *   -p 端口 / -d 根目录 / -u 开上传 / -k 自动退出 / --hidden 显示隐藏文件
 *   -l 上传上限 / -t 标题 / --user u/p 多用户（可重复传）
 */
export function parseArgs(argv: string[]): void {
  const program = new Command();

  program
    .name('server')
    .description('现代版个人文件服务器：浏览 / 上传 / 打包下载')
    .version('1.0.0')
    .option('-p, --port <number>', '监听端口', (v) => parseInt(v ?? '8888', 10), 8888)
    .option('-d, --dir <path>', '文件服务根目录', (v) => (isAbsolute(v) ? v : resolve(process.cwd(), v)), process.cwd())
    .option('-u, --upload', '是否启用上传功能', false)
    .option('-k, --kill <duration>', '自动退出时长（如 30m / 2h），默认常驻', undefined)
    .option('--hidden', '是否允许浏览/下载隐藏文件（.开头）', false)
    .option('-l, --limit <size>', '上传大小上限。支持缩写、大小写不敏感：如 200mb / 1g / 1G=1GB / 512k / 1m=1MB，纯数字按字节', (v) => parseSize(v ?? '200mb') || 200 * 1024 * 1024, 200 * 1024 * 1024)
    .option('-t, --title <title>', '网页标题', 'q-server')
    // 可重复：--user zhang/123 --user li/456
    .option('--user <pair...>', '登录账号，格式 username/password，可重复传', (v, acc: string[]) => acc.concat([v]), [] as string[]);

  program.parse(argv);
  const opts = program.opts();

  // 端口合法性兜底
  const port = Number.isFinite(opts.port) && opts.port > 0 && opts.port < 65536 ? opts.port : 8888;

  // 解析用户表："zhang/123" -> { zhang: "123" }
  const users = new Map<string, string>();
  for (const pair of (opts.user as string[]) ?? []) {
    const idx = pair.indexOf('/');
    if (idx <= 0 || idx === pair.length - 1) {
      throw new Error(`--user 格式错误：${pair}，应为 username/password`);
    }
    users.set(pair.slice(0, idx), pair.slice(idx + 1));
  }

  // 自动退出时长
  let autoKillMs: number | null = null;
  if (opts.kill) {
    const parsed = toMs(opts.kill as string);
    if (parsed && parsed > 0) autoKillMs = parsed;
  }

  config.port = port;
  config.rootDir = opts.dir;
  config.uploadEnabled = !!opts.upload;
  config.autoKillMs = autoKillMs;
  config.showHidden = !!opts.hidden;
  config.uploadLimitBytes = opts.limit;
  config.title = opts.title;
  config.users = users;
}
