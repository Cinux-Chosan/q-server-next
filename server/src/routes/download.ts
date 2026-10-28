import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { basename } from 'node:path';
import { safeJoin } from '../lib/paths.js';
import { buildZip, isDirSync } from '../services/zipStream.js';

/**
 * 下载分两步（对齐旧版）：
 *   1. POST /api/download { downloadList: string[] }  -> 返回任务 id
 *   2. GET  /api/download?downloadId=xx                 -> 真正下载
 * 单文件直下；多文件或目录自动打成 zip。任务是一次性的，取走即删。
 */
const tasks = new Map<string, string[]>();

export const downloadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/download', async (req) => {
    const body = (req.body ?? {}) as { downloadList?: string[] };
    const id = randomUUID();
    tasks.set(id, Array.isArray(body.downloadList) ? body.downloadList : []);
    return { success: true, result: id };
  });

  fastify.get('/download', async (req, reply) => {
    const query = (req.query ?? {}) as { downloadId?: string; isDownload?: string };
    const list = query.downloadId ? tasks.get(query.downloadId) : undefined;
    if (query.downloadId) tasks.delete(query.downloadId);

    if (!list || list.length === 0) {
      return { success: false, result: '无需要下载的文件' };
    }

    const first = list[0];
    const multi = list.length > 1;
    const singleFile = !multi && !isDirSync(first);

    if (singleFile) {
      const abs = safeJoin(first);
      reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(basename(abs))}`);
      return reply.send(createReadStream(abs));
    }

    const archive = buildZip(list);
    const name = multi ? 'batch' : basename(first);
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}.zip`);
    return reply.send(archive);
  });
};
