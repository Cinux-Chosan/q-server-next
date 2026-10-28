/** 与后端约定的类型 */
export interface SysConf {
  uploadable: boolean;
  login: boolean;
  limit: number;
  title: string;
}

export interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  ext: string;
  modifiedAt: string;
  createdAt: string;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('未登录');
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('未登录');
  }
  return res.json() as Promise<T>;
}

export const api = {
  sysConf: () => post<{ success: boolean; result: SysConf }>('/sysConf'),
  me: () => get<{ success: boolean; result: { username: string } | null }>('/me'),
  login: (username: string, password: string) =>
    post<{ success: boolean; result: boolean; message: string }>('/login', { username, password }),
  logout: () => post<{ success: boolean }>('/logout'),
  list: (dir: string) =>
    post<{ success: boolean; result: FileItem[]; message?: string; code?: number }>('/files', { dir }),
  /** 提交下载任务后，直接用浏览器跳转触发下载 */
  download: async (list: string[]) => {
    const res = await post<{ success: boolean; result: string }>('/download', { downloadList: list });
    if (res.success) {
      window.location.href = `/api/download?downloadId=${res.result}`;
    }
  },
  /** XHR 上传，便于显示进度 */
  upload: (file: File, dir: string, onProgress: (pct: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      form.append('dir', dir);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.statusText)));
      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.send(form);
    }),
};

/** 友好格式化字节 */
export function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}
