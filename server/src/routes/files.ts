import type { FastifyPluginAsync } from 'fastify';
import { listDir } from '../services/dirListing.js';
import { HttpError } from '../lib/httpError.js';

/** 列目录：POST /api/files  body: { dir } */
export const filesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/files', async (req) => {
    const body = (req.body ?? {}) as { dir?: string };
    try {
      const files = await listDir(body.dir ?? '.');
      return { result: files, success: true };
    } catch (err) {
      req.log.error(err, 'list dir failed');
      if (err instanceof HttpError && err.statusCode === 404) {
        return { result: [], success: false, code: 404, message: '目录不存在或已被删除' };
      }
      return { result: [], success: false, message: '获取文件列表失败' };
    }
  });
};
