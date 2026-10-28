import type { FastifyPluginAsync } from 'fastify';
import { listDir } from '../services/dirListing.js';

/** 列目录：POST /api/files  body: { dir } */
export const filesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/files', async (req) => {
    const body = (req.body ?? {}) as { dir?: string };
    try {
      const files = await listDir(body.dir ?? '.');
      return { result: files, success: true };
    } catch (err) {
      req.log.error(err, 'list dir failed');
      return { result: [], success: false, message: '获取文件列表失败' };
    }
  });
};
