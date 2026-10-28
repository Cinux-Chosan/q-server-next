/**
 * 全局运行时配置（单例）
 * 启动时由 cli.ts 解析命令行参数后填充，之后整个进程只读使用。
 */
export interface ServerConfig {
  port: number;
  /** 文件服务根目录（绝对路径）。所有用户传入的相对路径都拼到它下面 */
  rootDir: string;
  /** 是否允许上传 */
  uploadEnabled: boolean;
  /** 自动退出时长（毫秒）；null 表示常驻 */
  autoKillMs: number | null;
  /** 是否列出/下载隐藏文件（以 . 开头的文件或目录） */
  showHidden: boolean;
  /** 上传大小上限（字节） */
  uploadLimitBytes: number;
  /** 网页标题 */
  title: string;
  /** 用户表：username -> password；为空表示开放访问、无需登录 */
  users: Map<string, string>;
}

export const config: ServerConfig = {
  port: 8888,
  rootDir: process.cwd(),
  uploadEnabled: false,
  autoKillMs: null,
  showHidden: false,
  uploadLimitBytes: 200 * 1024 * 1024,
  title: 'q-server',
  users: new Map(),
};
