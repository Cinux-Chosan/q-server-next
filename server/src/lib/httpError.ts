/** 轻量结构化错误，带 HTTP 状态码 */
export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createError(statusCode: number, message: string): HttpError {
  return new HttpError(statusCode, message);
}
