import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { readLoginCookie } from './lib/cookie.js';
import { HttpError } from './lib/httpError.js';
import { authRoutes } from './routes/auth.js';
import { filesRoutes } from './routes/files.js';
import { uploadRoutes } from './routes/upload.js';
import { downloadRoutes } from './routes/download.js';
import { sysConfRoutes } from './routes/sysconf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 编译后位于 server/dist/，web 产物在项目根的 web/dist
const WEB_DIST = resolve(__dirname, '../../web/dist');

/** 无需登录即可访问的 API 子路径 */
const PUBLIC_API = new Set(['/login', '/logout', '/sysConf', '/me']);

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

  // 上传体积限制（@fastify/multipart 会在超限时报错截断）
  await app.register(multipart, {
    limits: { fileSize: config.uploadLimitBytes, files: 1 },
  });

  // 静态托管前端产物
  if (existsSync(WEB_DIST)) {
    await app.register(fastifyStatic, {
      root: WEB_DIST,
      index: false,
      wildcard: false,
    });
  }

  // 全局鉴权钩子：仅拦截 /api/*，公开接口放行
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return;
    const sub = req.url.slice('/api'.length).split('?')[0];
    if (PUBLIC_API.has(sub)) return;
    if (config.users.size === 0) return;

    // 1) HTTP Basic（浏览器/命令行工具直接弹登录框那种）
    const auth = req.headers.authorization;
    if (auth?.startsWith('Basic ')) {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const i = decoded.indexOf(':');
      if (i > 0 && config.users.get(decoded.slice(0, i)) === decoded.slice(i + 1)) return;
    }
    // 2) 登录后种下的 Cookie
    const user = readLoginCookie(req.headers.cookie);
    if (user && config.users.has(user)) return;

    return reply
      .code(401)
      .header('WWW-Authenticate', 'Basic')
      .send({ success: false, message: '未登录或登录已过期' });
  });

  // 统一错误格式
  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ success: false, message: err.message });
    }
    if (err?.statusCode === 413) {
      return reply.code(413).send({ success: false, message: '文件大小超出上传上限' });
    }
    if (err?.validation) {
      return reply.code(400).send({ success: false, message: '参数错误' });
    }
    req.log.error(err);
    return reply.code(err?.statusCode ?? 500).send({ success: false, message: err?.message ?? '服务器内部错误' });
  });

  // API 路由（统一 /api 前缀）
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(sysConfRoutes, { prefix: '/api' });
  await app.register(filesRoutes, { prefix: '/api' });
  await app.register(uploadRoutes, { prefix: '/api' });
  await app.register(downloadRoutes, { prefix: '/api' });

  // SPA 兜底：非 /api、非静态文件的 GET 一律回 index.html
  app.setNotFoundHandler(async (req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api/') && existsSync(resolve(WEB_DIST, 'index.html'))) {
      return reply.type('text/html').send(await import('node:fs/promises').then((fs) => fs.readFile(resolve(WEB_DIST, 'index.html'))));
    }
    return reply.code(404).send({ success: false, message: 'Not Found' });
  });

  return app;
}
