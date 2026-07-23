# Daily Review — 本地版

把 妙搭 上的 daily-review 应用搬出来，变成可以本地跑、自己调试的版本。

## 改造内容

- **去掉所有 `@lark-apaas/*` 妙搭专有依赖**
- **数据库从 PostgreSQL 换成 SQLite**（一个文件 `data/app.db`，不需要起数据库服务）
- **HTTP 客户端从 `axiosForBackend` 换成原生 `fetch`**
- **构建系统从 `@lark-apaas/coding-vite-preset` 换成标准 Vite**
- **新增 `.env` 配置**（DB 路径、LLM key 等）

## 技术栈

- 前端：React 19 + TypeScript + Vite 6 + Tailwind v4
- 后端：Express 5 + TypeScript + tsx
- 数据库：SQLite (better-sqlite3) + Drizzle ORM
- 路由：react-router-dom v7
- 表单/校验：zod
- 时间：date-fns

## 快速开始

```bash
# 1. 安装依赖（首次）
pnpm install
# 或：npm install

# 2. 复制环境变量
cp .env.example .env
# （可改可不改，默认就能跑）

# 3. 启动开发模式
pnpm dev
```

打开浏览器：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000/api/...

## 测试登录

本地版固定验证码 **`1234`**（任意手机号）。点开应用 → 输任意手机号 → 点"获取验证码" → 输 `1234` → 登录。

## 目录结构

```
daily-review-local/
├── client/                  # 前端
│   ├── index.html           # HTML 入口
│   └── src/
│       ├── api/             # API 客户端（fetch 封装）
│       ├── components/      # 业务组件
│       ├── hooks/           # React Hooks
│       ├── pages/           # 页面模块
│       │   ├── DailyPage/
│       │   ├── HomePage/
│       │   ├── WeeklyPage/
│       │   ├── MonthlyPage/
│       │   └── YearlyPage/
│       ├── app.tsx          # 路由配置
│       └── index.tsx        # React 入口
├── server/                  # 后端
│   ├── index.ts             # Express 入口
│   ├── routes/              # 路由
│   │   ├── auth.ts          # 手机号登录
│   │   ├── reviews.ts       # 复盘 CRUD
│   │   ├── ai.ts            # AI 复盘生成
│   │   └── calendar.ts      # 日历导入
│   └── db/
│       ├── index.ts         # Drizzle 实例
│       ├── schema.ts        # 表结构（SQLite 版）
│       └── migrate.ts       # 启动时建表
├── shared/                  # 前后端共享类型
├── data/                    # SQLite 文件位置（自动创建）
│   └── app.db               # 数据库（首次启动后生成）
├── package.json
├── vite.config.ts
└── .env.example
```

## 调试技巧

### 前端调试
- 在浏览器里打开 DevTools
- Console 看 React 报错
- Network 看 API 请求
- Sources 可以加断点调试 React 代码
- 改了 `client/src/**` 后 Vite 会热更新（HMR），不用刷新

### 后端调试
- `tsx watch` 模式，改了 `server/**` 自动重启
- 在 VSCode 里：
  - Run and Debug → "Add Configuration" → Node.js
  - 配 `"runtimeExecutable": "tsx"`, `"program": "server/index.ts"`
  - 下断点直接 F5 启动

### 数据库调试
- 装个 SQLite 客户端（[DB Browser for SQLite](https://sqlitebrowser.org/) 是免费的）
- 打开 `data/app.db`
- 看 `daily_entries` / `users` / `period_reviews` 等表

## 常用命令

| 命令 | 作用 |
|------|------|
| `pnpm dev` | 启动开发模式（前端 + 后端） |
| `pnpm dev:server` | 只启动后端 |
| `pnpm dev:client` | 只启动前端 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 跑生产版本 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm db:reset` | 删数据库重来（数据全清） |

## 接入真实 AI（可选）

默认走**智能分析引擎**（本地关键词提取）。要接真 LLM：

1. 去 [火山引擎控制台](https://www.volcengine.com/) 开通"方舟 ARK"
2. 创建 API Key
3. 在 `.env` 里填：
   ```
   VOLCANO_ENGINE_API_KEY=你的key
   VOLCANO_ENGINE_MODEL=doubao-1-5-pro-32k-250115
   ```
4. 重启 `pnpm dev`

## 部署到云

- **Vercel / Netlify**：可以，需要把后端拆出来（数据库换成 Postgres / Turso）
- **Railway / Render**：直接推 GitHub 仓库，自动识别 Node 项目
- **自己的服务器**：`pnpm build && pnpm start`，用 nginx 反代

## 跟妙搭版的差异

| 项目 | 妙搭版 | 本地版 |
|------|--------|--------|
| 数据库 | 妙搭托管的 PostgreSQL | 本地 SQLite 文件 |
| 短信 | 测试验证码 `1234` | 同上（要真短信就接阿里云/腾讯云 SMS） |
| AI | 火山引擎 / 智能引擎 | 同上 |
| 部署 | 妙搭控制台 | 自己跑 |
| 数据迁移 | 无需 | 见下方 |

## 数据迁移（从妙搭到本地）

如果要把 妙搭 上的复盘记录搬过来：

1. 从 妙搭 控制台导出数据（JSON/CSV）
2. 用我写一个导入脚本（`scripts/import-from-miaoda.ts`）
3. 跑 `pnpm tsx scripts/import-from-miaoda.ts <exported.json>`

(还没写，需要的话告诉我)
