import { readdir, stat } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';
import { config } from '../config.js';
import { safeJoin, shouldExclude } from '../lib/paths.js';

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
  const entries = await readdir(abs, { withFileTypes: true });

  const items: FileItem[] = [];
  for (const entry of entries) {
    const entryAbs = join(abs, entry.name);
    if (shouldExclude(entry.name, entryAbs)) continue;
    const st = await stat(entryAbs);
    items.push({
      name: entry.name,
      path: toPosix(relative(config.rootDir, entryAbs)),
      isDir: entry.isDirectory(),
      size: st.size,
      ext: extname(entry.name),
      modifiedAt: st.mtime.toISOString(),
      createdAt: st.birthtime.toISOString(),
    });
  }

  // 文件夹排前面，其余按名称排序，浏览体验更整齐
  items.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  return items;
}
