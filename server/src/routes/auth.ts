import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { buildLoginCookie, clearLoginCookie, readLoginCookie } from '../lib/cookie.js';

/** 登录 / 登出 / 查询当前登录态。这三个接口本身不需要鉴权才能访问。 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/login', async (req, reply) => {
    const body = (req.body ?? {}) as { username?: string; password?: string };
    if (config.users.size === 0) {
      return { success: false, result: '', message: '未配置用户信息，无需登录' };
    }
    const username = body.username ?? '';
    if (config.users.get(username) === body.password) {
      reply.header('Set-Cookie', buildLoginCookie(username));
      return { success: true, result: true, message: '登录成功!' };
    }
    return { success: false, result: '', message: '登录失败：用户名或密码错误!' };
  });

  fastify.post('/logout', async (_req, reply) => {
    reply.header('Set-Cookie', clearLoginCookie());
    return { success: true, message: '登出成功!', result: true };
  });

  fastify.get('/me', async (req) => {
    const username = readLoginCookie(req.headers.cookie);
    if (username && config.users.has(username)) {
      return { success: true, result: { username } };
    }
    return { success: true, result: null };
  });
};
