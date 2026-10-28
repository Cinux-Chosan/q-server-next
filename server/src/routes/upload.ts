import type { FastifyPluginAsync } from 'fastify';
import { createWriteStream } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { safeJoin } from '../lib/paths.js';
import { createError } from '../lib/httpError.js';

/**
 * 上传：POST /api/upload  multipart 表单
 *   - 文件字段名：file
 *   - 文本字段 dir：目标子目录（默认根目录）
 *
 * 实现要点：multipart 字段是流式到达的，且顺序不保证（常见情况是文件先到、dir 后到）。
 * 所以先把文件流写到系统临时目录，等所有字段读完、拿到 dir 后，再移动到目标目录。
 * 这样无论客户端按什么顺序 append 字段都正确。
 * 注意：旧版这里是空壳（没真正写盘），本版补全为真正落盘。
 */
export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/upload', async (req, reply) => {
    if (!config.uploadEnabled) {
      throw createError(403, '未启用上传功能');
    }

    let targetDir = '.';
    let savedName = '';
    let tempPath: string | null = null;

    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        savedName = basename(part.filename || 'upload.bin');
        tempPath = join(tmpdir(), `qsupload-${randomUUID()}`);
        await pipeline(part.file, createWriteStream(tempPath));
      } else if (part.fieldname === 'dir') {
        targetDir = String(part.value ?? '.');
      }
    }

    if (!tempPath || !savedName) {
      throw createError(400, '未收到文件');
    }

    const targetDirAbs = safeJoin(targetDir);
    await mkdir(targetDirAbs, { recursive: true });
    const finalPath = join(targetDirAbs, savedName);
    await rename(tempPath, finalPath);

    return reply.code(200).send({ success: true, result: { name: savedName, dir: targetDir } });
  });
};
