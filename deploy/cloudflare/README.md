# 🚀 Cloudflare Pages 快速部署指南

## ⚡ 快速开始（最简单）

点击下方按钮，即可开始在 Cloudflare Pages 上部署：

[![Deploy to Cloudflare Pages](https://raw.githubusercontent.com/telagod/V0TV/main/public/deploy-to-cloudflare.svg)](https://dash.cloudflare.com/sign-up/pages)

**部署步骤**：
1. 点击按钮跳转到 Cloudflare Pages
2. 使用 GitHub 账号登录
3. 授权 Cloudflare 访问你的 GitHub
4. Fork 或选择 V0TV 仓库
5. 配置构建设置（见下方）
6. 点击"保存并部署"

**构建配置**：
- **构建命令**: `pnpm pages:build` 或 `npm run pages:build`
- **输出目录**: `.vercel/output/static`
- **环境变量**:
  - `PASSWORD` = 你的访问密码（必填）
  - `NODE_VERSION` = 18

---

## 一键部署脚本

最简单的部署方式，5分钟完成！

```bash
git clone https://github.com/your-username/V0TV.git
cd V0TV
./deploy-cloudflare.sh
```

## GitHub 自动部署（推荐）

### 步骤一：Fork 项目

访问 https://github.com/your-username/V0TV 点击右上角 Fork

### 步骤二：获取 Cloudflare 凭证

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 记录 **Account ID**（右侧栏可见）
3. 创建 **API Token**：
   - My Profile → API Tokens → Create Token
   - 使用 "Edit Cloudflare Workers" 模板
   - 保存生成的 Token

### 步骤三：配置 GitHub Secrets

1. 进入你 Fork 的仓库
2. Settings → Secrets and variables → Actions
3. 添加两个 secrets：
   - `CLOUDFLARE_API_TOKEN` = 你的 API Token
   - `CLOUDFLARE_ACCOUNT_ID` = 你的 Account ID

### 步骤四：触发部署

推送任何代码到 `main` 分支，或在 Actions 页面手动运行 workflow

### 步骤五：配置环境变量

1. Cloudflare Dashboard → Pages → v0tv
2. Settings → Environment variables
3. 添加生产环境变量：
   - `PASSWORD` = 你的访问密码（必填）
   - `USERNAME` = admin（多用户时需要）
   - `NEXT_PUBLIC_STORAGE_TYPE` = d1（使用数据库时）
   - `NEXT_PUBLIC_ENABLE_REGISTER` = true（允许注册）

### 完成！

访问 `https://v0tv.pages.dev` 查看你的应用

---

## D1 数据库设置（多用户功能）

如果需要多用户支持、收藏同步等功能，需要配置 D1 数据库：

```bash
# 创建数据库
wrangler d1 create v0tv-db

# 初始化表结构
wrangler d1 execute v0tv-db --file=./scripts/d1-init.sql

# 查看数据库信息
wrangler d1 info v0tv-db
```

然后在 `wrangler.toml` 中填入数据库 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "v0tv-db"
database_id = "你的数据库ID"
```

重新部署即可生效。

---

## 故障排除

### 构建失败

检查 Actions 日志，常见问题：
- pnpm 版本不匹配 → 更新 package.json 中的 packageManager
- 依赖安装失败 → 删除 pnpm-lock.yaml 重新生成

### 部署成功但无法访问

1. 检查环境变量是否正确配置
2. 查看 Functions 日志（Dashboard → Pages → v0tv → Functions）
3. 确认 `PASSWORD` 环境变量已设置

### D1 数据库连接失败

1. 确认 wrangler.toml 中数据库配置正确
2. 检查 binding 名称是否为 "DB"
3. 重新部署项目

---

## 高级配置

### 自定义域名

Cloudflare Dashboard → Pages → v0tv → Custom domains → Add domain

### 设置访问规则

Pages → v0tv → Settings → Access policies

### 性能优化

- 启用 Brotli 压缩（默认已启用）
- 配置 CDN 缓存策略
- 使用 Cloudflare Images 优化图片加载

---

需要帮助？查看 [完整文档](README.md) 或 [提交 Issue](https://github.com/your-username/V0TV/issues)
