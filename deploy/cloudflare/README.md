# 🚀 Cloudflare Workers 部署指南

> **最新动态（2025）**: Cloudflare 已将 Pages 和 Workers 统一为一个平台。现在推荐使用 **Workers** 部署，它包含了 Pages 的所有功能，并且静态资产请求完全免费！

## ⚡ 一键部署（真正的自动化！）

点击按钮，Cloudflare 会自动完成所有配置：

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/telagod/V0TV)

### 自动完成的操作

点击按钮后，Cloudflare 会自动：
1. **Fork 仓库** → 在你的 GitHub 账号下创建副本
2. **配置资源** → 自动创建 D1 数据库、KV 命名空间
3. **设置 CI/CD** → 配置 Workers Builds 自动部署
4. **首次部署** → 立即部署应用到全球边缘网络
5. **配置环境** → 引导你设置 `PASSWORD` 等环境变量

就这么简单！🎉

### 部署完成后

访问你的应用：`https://你的项目名.你的账号.workers.dev`

---

## 📦 其他部署方式

<details>
<summary><b>方式一：使用命令行（Wrangler CLI）</b></summary>

### 前置要求
- 已安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare 账号

### 快速部署

```bash
# 克隆仓库
git clone https://github.com/telagod/V0TV.git
cd V0TV

# 登录 Cloudflare
wrangler login

# 构建项目
pnpm install
pnpm run pages:build

# 部署到 Workers
wrangler deploy
```

Wrangler 会自动：
- ✅ 上传构建产物
- ✅ 配置路由
- ✅ 部署到全球边缘网络

</details>

<details>
<summary><b>方式二：GitHub Actions 自动部署</b></summary>

### 配置步骤

**1. 获取 Cloudflare 凭证**

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)，获取：
- **Account ID**（右侧栏）
- **API Token**（My Profile → API Tokens → Create Token → 使用 "Edit Cloudflare Workers" 模板）

**2. 配置 GitHub Secrets**

在你的仓库中：Settings → Secrets → Actions → New repository secret

添加：
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**3. 启用自动部署**

取消注释 `.github/workflows/cloudflare-pages.yml` 中的 `push` 触发器：

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

推送代码后自动部署到 Workers！

</details>

---

## ⚙️ 环境变量配置

部署后在 Cloudflare Dashboard 中配置：

**Workers & Pages → 你的项目 → Settings → Variables**

### 基础配置（必填）

```env
PASSWORD=你的访问密码
```

### 可选配置

```env
# 管理员用户名（多用户模式）
USERNAME=admin

# 存储类型（单用户用 localStorage，多用户用 d1）
NEXT_PUBLIC_STORAGE_TYPE=localStorage

# 允许用户注册（多用户模式）
NEXT_PUBLIC_ENABLE_REGISTER=false

# Node.js 版本
NODE_VERSION=18
```

---

## 💾 D1 数据库设置（可选）

多用户功能需要 Cloudflare D1 数据库。如果你使用了一键部署，D1 数据库会自动创建和绑定。

### 手动创建数据库（如需要）

```bash
# 1. 创建数据库
wrangler d1 create v0tv-db

# 2. 初始化表结构
wrangler d1 execute v0tv-db --file=D1用到的相关所有.sql

# 3. 在 wrangler.toml 中配置
```

### 配置绑定

编辑 `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "v0tv-db"
database_id = "你的数据库ID"
```

### 更新环境变量

```env
NEXT_PUBLIC_STORAGE_TYPE=d1
```

重新部署后生效。

---

## 🔧 故障排除

<details>
<summary><b>构建失败</b></summary>

**检查构建命令**：
```bash
pnpm run pages:build
```

**常见错误**：
- `pnpm not found` → 在环境变量中添加 `PNPM_VERSION=8`
- `Build timeout` → 检查依赖安装是否正常
- `wrangler.toml not found` → 确保文件在项目根目录

</details>

<details>
<summary><b>部署成功但无法访问</b></summary>

1. 检查 `PASSWORD` 环境变量是否已设置
2. 查看日志：Dashboard → Workers & Pages → 项目 → Logs
3. 确认路由配置正确

</details>

<details>
<summary><b>D1 数据库连接失败</b></summary>

1. 确认 `wrangler.toml` 配置正确
2. 检查 binding 名称为 `"DB"`
3. 验证数据库 ID 匹配
4. 重新部署项目

</details>

---

## 🚀 高级配置

### 自定义域名

Dashboard → Workers & Pages → 项目 → Custom Domains → Add domain

### 路由配置

Workers 支持更灵活的路由规则，可以在 `wrangler.toml` 中配置。

### 性能优化

- ✅ 静态资产请求免费（Workers 静态资产特性）
- ✅ 全球边缘网络（超过 300 个数据中心）
- ✅ 智能缓存和预热
- 📊 使用 [Workers Analytics](https://www.cloudflare.com/web-analytics/) 监控性能

### Durable Objects（可选）

Workers 支持 Durable Objects，可用于实时功能、WebSocket 连接等。

---

## 📚 相关资源

- [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- [Workers 静态资产](https://developers.cloudflare.com/workers/static-assets/)
- [从 Pages 迁移到 Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [返回主文档](../../README.md)

---

## 💡 提示

### Workers vs Pages（2025年最新）

- ✅ **Pages 已弃用**，现在统一使用 Workers
- ✅ **静态资产免费**，和之前的 Pages 一样
- ✅ **更多功能**：Durable Objects、Cron Triggers、更好的可观测性
- ✅ **更好的性能**：优化的边缘计算和路由

### 免费配额

- 每天 100,000 次请求
- 静态资产请求不计入配额
- D1 数据库：5GB 存储，500 万次读取/天
- 10ms CPU 时间/请求

---

需要帮助？[提交 Issue](https://github.com/telagod/V0TV/issues) 或查看 [常见问题](../../docs/faq.md)
