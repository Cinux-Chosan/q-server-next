import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * 极简"登录票据"：登录成功后给浏览器种一个 HttpOnly Cookie。
 * 内容 = 用户名校验过的 HMAC 签名，服务端重启后密钥随机变化，
 * 旧票据自动失效（与旧版 express-session 随机 secret 的行为一致）。
 *
 * 格式：qss.<base64url(payload)>.<sig>
 * payload 内含 username + 过期时间戳，防止被篡改或无限期使用。
 */

const SECRET = randomBytes(32).toString('hex');
const COOKIE_NAME = 'qss';
const MAX_AGE_SEC = 7 * 24 * 3600; // 7 天

interface Payload {
  u: string;
  exp: number;
}

function b64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

/** 生成 Set-Cookie 头的值 */
export function buildLoginCookie(username: string): string {
  const payload: Payload = { u: username, exp: Date.now() + MAX_AGE_SEC * 1000 };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${COOKIE_NAME}=${payloadB64}.${sig}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SEC}`;
}

/** 生成清空 Cookie 的 Set-Cookie 值 */
export function clearLoginCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

/** 从 Cookie 头里取出登录用户名；非法/过期返回 null */
export function readLoginCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== COOKIE_NAME) continue;
    const value = part.slice(eq + 1).trim();
    const dot = value.lastIndexOf('.');
    if (dot === -1) return null;
    const payloadB64 = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    // 用恒定时间比较，防止计时侧信道
    const expected = sign(payloadB64);
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Payload;
      if (!payload.u || payload.exp < Date.now()) return null;
      return payload.u;
    } catch {
      return null;
    }
  }
  return null;
}
