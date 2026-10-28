import { resolve, sep, relative, basename } from 'node:path';
import { createError } from './httpError.js';
import { config } from '../config.js';

/**
 * 把用户传入的相对路径安全地拼到根目录下，并做"越权校验"。
 *
 * 为什么需要它？用户可能传 "../../etc/passwd" 这种路径想跳出根目录。
 * 思路：先 resolve 成绝对路径，再校验它是否仍然呆在 rootDir 里面。
 * 这就像在快递柜里找格子——不管你怎么绕，最终都不能走出柜子范围。
 */
export function safeJoin(userPath: string): string {
  const requested = userPath ?? '.';
  const resolved = resolve(config.rootDir, requested);
  if (resolved !== config.rootDir && !resolved.startsWith(config.rootDir + sep)) {
    throw createError(403, '无权访问根目录以外的路径');
  }
  return resolved;
}

/** 判断某个绝对路径相对于根目录的层级里，是否存在以 . 开头的隐藏段 */
export function isHiddenInside(absPath: string): boolean {
  const rel = relative(config.rootDir, absPath);
  return rel.split(sep).some((seg) => seg.startsWith('.'));
}

/** 列出目录时过滤掉隐藏项（当未开启 showHidden 时） */
export function shouldExclude(name: string, absPath: string): boolean {
  if (config.showHidden) return false;
  return name.startsWith('.') || isHiddenInside(absPath);
}

export { basename };
