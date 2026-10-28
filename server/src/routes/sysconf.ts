import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';

/** 系统配置：前端启动时拿它判断是否需要登录、是否可上传、标题等。无需鉴权。 */
export const sysConfRoutes: FastifyPluginAsync = async (fastify) => {
  const payload = () => ({
    success: true,
    result: {
      uploadable: config.uploadEnabled,
      login: config.users.size > 0,
      limit: config.uploadLimitBytes,
      title: config.title,
    },
  });
  fastify.post('/sysConf', async () => payload());
  // 兼容旧版 GET 返回占位
  fastify.get('/sysConf', async () => 1);
};
