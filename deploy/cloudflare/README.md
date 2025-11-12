# Cloudflare Workers 部署指南（使用 OpenNext）

> 本项目使用 **@opennextjs/cloudflare** 适配器，采用标准 Cloudflare Workers 部署方式。

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 10.12.4+
- Cloudflare 账号
- wrangler CLI 4.0+

### 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/telagod/V0TV)

---

## 📦 本地构建和部署

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建项目

```bash
pnpm run pages:build
```

这将：
- 运行 `gen:runtime` 和 `gen:manifest` 生成运行时配置
- 执行 `opennextjs-cloudflare build` 构建 Worker

构建产物：
- `.open-next/worker.js` - Worker 脚本
- `.open-next/assets/` - 静态资产
- `.open-next/server-functions/` - 服务端函数

### 3. 本地预览

```bash
pnpm run preview
```

或直接使用 wrangler：
```bash
wrangler dev
```

### 4. 部署到 Cloudflare

```bash
# 首次部署
wrangler login
pnpm run deploy

# 或直接使用 wrangler
wrangler deploy
```

---

## ⚙️ 配置

### wrangler.jsonc

项目使用 `wrangler.jsonc` 配置文件：

```jsonc
{
  "name": "v0tv",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

### 环境变量

在 Cloudflare Dashboard 配置环境变量：

**Workers & Pages** → 你的项目 → **Settings** → **Variables**

#### 必需变量

| 变量名 | 说明 |
|--------|------|
| `PASSWORD` | 访问密码（必填） |

#### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `USERNAME` | 管理员用户名 | `admin` |
| `NEXT_PUBLIC_STORAGE_TYPE` | 存储类型（localStorage/d1） | `localStorage` |
| `NEXT_PUBLIC_ENABLE_REGISTER` | 是否允许注册 | `false` |

### D1 数据库绑定（可选）

如需使用 D1 数据库存储用户数据：

```bash
# 1. 创建数据库
wrangler d1 create v0tv-db

# 2. 初始化表结构
wrangler d1 execute v0tv-db --file=scripts/d1-init.sql

# 3. 在 wrangler.jsonc 中配置
```

在 `wrangler.jsonc` 添加：
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "v0tv-db",
      "database_id": "your-database-id-here"
    }
  ]
}
```

然后设置环境变量：
```
NEXT_PUBLIC_STORAGE_TYPE=d1
```

---

## 🔄 Git 集成部署

### Cloudflare Dashboard 设置

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** → **Create** → **Connect to Git**
3. 选择你的 GitHub 仓库
4. 配置构建设置：

| 配置项 | 值 |
|--------|-----|
| **Build command** | `pnpm run pages:build` |
| **Build output directory** | `.open-next` |
| **Root directory** | `/` |

5. 添加环境变量（至少需要 `PASSWORD`）
6. 点击 **Save and Deploy**

### 自动部署

推送代码到 GitHub 后，Cloudflare 会自动：
1. 拉取最新代码
2. 运行构建命令
3. 部署到全球边缘网络

---

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 本地开发服务器（Next.js）|
| `pnpm run pages:build` | 构建 Cloudflare Worker |
| `pnpm run preview` | 本地预览 Worker |
| `pnpm run deploy` | 构建并部署 |
| `wrangler dev` | 直接运行 Worker 开发服务器 |
| `wrangler deploy` | 直接部署 Worker |

---

## 📚 技术栈

- **Next.js 14** - React 框架
- **@opennextjs/cloudflare** - OpenNext Cloudflare 适配器
- **Wrangler 4** - Cloudflare Workers CLI
- **Node.js Runtime** - 完整 Node.js API 支持

---

## 🔍 故障排除

### 构建失败

**错误：`pnpm: not found`**

在 Cloudflare Dashboard 添加环境变量：
```
PNPM_VERSION=10.12.4
```

**错误：构建超时**

优化措施：
- 确保 `node_modules` 在 `.gitignore` 中
- 使用 `package.json` 中的 `packageManager` 字段

### 运行时错误

**数据库连接失败**

检查：
1. D1 数据库是否已创建
2. `wrangler.jsonc` 中的绑定配置是否正确
3. 环境变量 `NEXT_PUBLIC_STORAGE_TYPE` 是否设置为 `d1`

**环境变量未生效**

确保：
1. 环境变量已在 Cloudflare Dashboard 配置
2. 变量名拼写正确
3. 已重新部署

---

## 📖 相关文档

- [配置说明](CONFIGURATION.md) - Dashboard 配置详解
- [故障排除](TROUBLESHOOTING.md) - 常见问题
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

## 🎯 从旧适配器迁移

如果你之前使用 `@cloudflare/next-on-pages`：

### 主要变化

| 项目 | next-on-pages | @opennextjs/cloudflare |
|------|--------------|----------------------|
| 部署命令 | `wrangler pages deploy` | `wrangler deploy` |
| 配置文件 | `wrangler.toml` | `wrangler.jsonc` |
| Runtime | Edge Runtime | Node.js Runtime |
| 输出目录 | `.vercel/output/static` | `.open-next` |

### 迁移步骤

1. 移除旧依赖：
```bash
pnpm remove @cloudflare/next-on-pages
```

2. 安装新适配器：
```bash
pnpm add -D @opennextjs/cloudflare wrangler@latest
```

3. 更新配置文件（重命名 `wrangler.toml` 为 `wrangler.jsonc`）

4. 移除 API 路由中的 `export const runtime = 'edge'` 声明

5. 更新 `.gitignore`：
```
.open-next
```

6. 测试构建：
```bash
pnpm run pages:build
```

---

## 💡 提示

- ✅ 使用标准 `wrangler deploy` 命令，不再需要 `wrangler pages deploy`
- ✅ 支持完整 Node.js APIs
- ✅ 更好的性能和更小的 bundle 大小
- ✅ 官方维护和持续更新
