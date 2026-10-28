# q-server-next

`q-server-nest`（@chosan/server）的 **1:1 功能现代复刻**。一个带登录鉴权的个人文件服务器 CLI：浏览器里浏览目录、上传、单文件直下、多文件/目录自动打包成 zip 下载。

旧栈：NestJS 7 + Vue2 + express-session（2020 年）。
新栈：**Fastify 5 + Vue 3 + Vite 6 + TypeScript 5**，全部依赖均为周下载量数十万~千万级的活跃维护包。

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

## 快速开始

```bash
# 1. 装依赖（根目录一条命令，自动装 server + web）
npm install

# 2. 构建前端 + 编译后端
npm run build

# 3. 启动（参数透传，-- 后面跟 CLI 参数）
npm start -- -p 8888 -d . -u --user zhang/123 -t "我的文件服务"
```

开发模式（一条命令同时起 Fastify :8888 + Vite :5173，日志带前缀）：
```bash
npm run dev
```

根目录脚本一览：`npm install`(装全部依赖) / `npm run dev`(前后端同启) / `npm run build`(构建) / `npm start -- ...`(启动)。

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
npm start -- -p 9000 -d ~/Downloads -u --user alice/abc123 --user bob/456
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
q-server-next/
├── server/            # Fastify 后端
│   └── src/
│       ├── cli.ts          # 命令行解析
│       ├── config.ts       # 全局配置单例
│       ├── app.ts         # 装配：插件/鉴权钩子/路由/静态托管
│       ├── index.ts       # 入口
│       ├── lib/           # 路径越权校验、HMAC Cookie、错误
│       ├── services/      # 列目录、zip 流
│       └── routes/        # auth / files / upload / download / sysConf
└── web/              # Vue3 + Vite 前端（构建产物被 server 托管）
    └── src/
        ├── views/Login.vue
        ├── views/FileManager.vue   # 面包屑+表格+多选+拖拽上传
        └── api.ts
```
