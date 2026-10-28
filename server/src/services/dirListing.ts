import { readdir, stat } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';
import { config } from '../config.js';
import { safeJoin, shouldExclude } from '../lib/paths.js';
import { createError } from '../lib/httpError.js';

export interface FileItem {
  name: string;
  /** 相对根目录的 posix 路径（前端回传时直接用它） */
  path: string;
  isDir: boolean;
  size: number;
  ext: string;
  modifiedAt: string;
  createdAt: string;
}

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

/** 列出某目录下的"直接子项"（不递归），与旧版 depth:0 行为一致 */
export async function listDir(relDir: string): Promise<FileItem[]> {
  const abs = safeJoin(relDir ?? '.');
  let st: import('node:fs').Stats;
  try {
    st = await stat(abs);
  } catch {
    // 路径不存在（含中间层级被删）
    throw createError(404, '目录不存在或已被删除');
  }
  if (!st.isDirectory()) {
    throw createError(404, '该路径不是目录');
  }
  const entries = await readdir(abs, { withFileTypes: true });

  const items: FileItem[] = [];
  for (const entry of entries) {
    const entryAbs = join(abs, entry.name);
    if (shouldExclude(entry.name, entryAbs)) continue;
    const st2 = await stat(entryAbs);
    items.push({
      name: entry.name,
      path: toPosix(relative(config.rootDir, entryAbs)),
      isDir: entry.isDirectory(),
      size: st2.size,
      ext: extname(entry.name),
      modifiedAt: st2.mtime.toISOString(),
      createdAt: st2.birthtime.toISOString(),
    });
  }

  // 文件夹排前面，其余按名称排序，浏览体验更整齐
  items.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  return items;
}
