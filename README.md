# q-server-next

`q-server-nest`（@chosan/server）的 **1:1 功能现代复刻**。一个带登录鉴权的个人文件服务器 CLI：浏览器里浏览目录、上传、单文件直下、多文件/目录自动打包成 zip 下载。

旧栈：NestJS 7 + Vue2 + express-session（2020 年）。
新栈：**Fastify 5 + Vue 3 + Vite 6 + TypeScript 5**，单 npm 包发布，全局安装即用。

## 功能对照（与旧版一致）

| 能力 | 说明 |
|---|---|
| 列目录 | `POST /api/files { dir }`，只列当前层 |
| 登录/登出 | `POST /api/login`、`/logout`，Cookie + HTTP Basic 双通道 |
| 上传 | `POST /api/upload`（multipart，字段 `file` + `dir`），体积受 `-l` 限制 |
| 下载 | `POST /api/download { downloadList }` 领任务 id → `GET /api/download?downloadId=xx`；单文件直下，多文件/目录打 zip |
| 系统配置 | `POST /api/sysConf` → `{ uploadable, login, limit, title }` |
| 鉴权 | 配了 `--user` 才需要登录；未配则开放 |
| 安全 | 所有用户路径做根目录越权校验（拒绝 `../` 逃逸） |

> 修复了旧版两个隐患：① 上传接口在旧版是空壳、没真正写盘，本版补全；② 登录 Cookie 用 HMAC-SHA256 签名，防篡改。

## 安装与使用

发布为单个 npm 包（前端已预构建打包在内，无需自己 build）：

```bash
npm i -g q-server-next

# 启动：把当前目录作为文件根目录，开启上传，设账号
q-server -p 8888 -d . -u --user zhang/123 -t "我的文件服务"
```

浏览器打开 `http://localhost:8888`。常用示例：
```bash
q-server                                  # 开放模式，当前目录，8888
q-server -d ~/Downloads -u -l 2g         # 上传上限 2GB
q-server --user alice/abc --user bob/456  # 多账号
q-server -k 30m                           # 30 分钟后自动退出
```

## 从源码开发

```bash
npm install          # 装全部依赖（server + web 已合并为一个包）
npm run dev          # 一条命令同时起 Fastify:8888 + Vite:5173
npm run build        # 产出 server/dist 与 web/dist
npm start -- ...     # 用刚构建的产物启动
```

## 作为 npm 包发布

- 单包发布：根目录即发布包，`bin: q-server -> server/dist/index.js`。
- `files` 仅包含 `server/dist` + `web/dist`，用户全局安装后无需构建前端。
- `prepublishOnly` 会在 `npm publish` 前自动重新构建。
- 发布：`npm login && npm publish`（包名 `q-server-next`，命令名 `q-server`）。

## 命令行参数

| 参数 | 说明 | 默认 |
|---|---|---|
| `-p, --port <n>` | 监听端口 | `8888` |
| `-d, --dir <path>` | 文件根目录 | 当前目录 |
| `-u, --upload` | 开启上传 | 关 |
| `--hidden` | 允许浏览/下载 `.` 开头的隐藏文件 | 关 |
| `-l, --limit <size>` | 上传大小上限，支持缩写、大小写不敏感：`200mb`、`1g`/`1G`=1GB、`512k`、`1m`=1MB，纯数字按字节 | `200mb` |
| `-t, --title <text>` | 网页标题 | `q-server` |
| `-k, --kill <dur>` | 自动退出时长，如 `30m` / `2h` | 常驻 |
| `--user u/p` | 登录账号，可重复传多个 | 无（开放） |

示例：
```bash
q-server -p 9000 -d ~/Downloads -u --user alice/abc123 --user bob/456
```

## 技术选型（均为高周下载量活跃包）

| 用途 | 包 | 备注 |
|---|---|---|
| HTTP 框架 | `fastify` ^5 | 替代 NestJS，更轻更快 |
| 静态托管 | `@fastify/static` | 官方插件 |
| 上传 | `@fastify/multipart` | 官方插件，自带体积限制 |
| CLI | `commander` ^12 | 替代 yargs |
| 打包 zip | `archiver` ^7 | 流式 zip |
| 大小/时长解析 | `bytes` / `ms` | 沿用 |
| 前端框架 | `vue` ^3 + `vite` ^6 | 替代 Vue2 + vue-cli |
| 并行脚本 | `concurrently` ^9 | 一条命令同时起前后端 |

## 目录结构

```
q-server-next/            # 根即发布包（bin: q-server）
├── server/src/           # Fastify 后端源码（编译到 server/dist）
│   ├── cli.ts            # 命令行解析
│   ├── config.ts         # 全局配置单例
│   ├── app.ts            # 装配：插件/鉴权钩子/路由/静态托管
│   ├── index.ts          # 入口（带 shebang）
│   ├── lib/              # 路径越权校验、HMAC Cookie、错误
│   ├── services/         # 列目录、zip 流
│   └── routes/           # auth / files / upload / download / sysConf
└── web/src/              # Vue3 + Vite 前端（构建到 web/dist，随包发布）
    ├── views/Login.vue
    ├── views/FileManager.vue   # 面包屑+表格+多选+拖拽上传
    └── api.ts
```
