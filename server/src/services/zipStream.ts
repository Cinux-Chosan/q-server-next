import archiver from 'archiver';
import { statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { config } from '../config.js';
import { safeJoin } from '../lib/paths.js';

/** 判断相对路径是否是一个目录（同步，仅用于下载分支判断） */
export function isDirSync(relPath: string): boolean {
  try {
    return statSync(safeJoin(relPath)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 把一组相对路径打包成 zip 流。
 * 对齐旧版逻辑：每个条目用 glob 同时匹配"文件本身"和"目录及其内容"，
 * dot 选项跟随 --hidden 配置。
 */
export function buildZip(relPaths: string[]): archiver.Archiver {
  const archive = archiver('zip', { zlib: { level: 6 } });
  for (const rel of relPaths) {
    const abs = safeJoin(rel);
    const cwd = join(abs, '..');
    const name = basename(abs);
    archive.glob(name, { cwd, dot: config.showHidden });
    archive.glob(`${name}/**/*`, { cwd, dot: config.showHidden });
  }
  void archive.finalize();
  return archive;
}
