# 🚀 Cloudflare Pages 部署指南

## ⚡ 一键部署（推荐）

点击按钮，3分钟完成部署：

[![Deploy to Cloudflare Pages](https://raw.githubusercontent.com/telagod/V0TV/main/public/deploy-to-cloudflare.svg)](https://dash.cloudflare.com/sign-up/pages)

### 部署步骤

1. **点击按钮** → 跳转到 Cloudflare Pages
2. **登录 GitHub** → 授权 Cloudflare 访问
3. **选择仓库** → Fork 或连接 V0TV 仓库
4. **配置构建** → 填写以下信息：
   ```
   构建命令: pnpm pages:build
   输出目录: .vercel/output/static
   环境变量: PASSWORD=你的访问密码
   ```
5. **开始部署** → 点击"保存并部署"
6. **访问应用** → 部署完成后访问 `https://你的项目.pages.dev`

就这么简单！🎉

---

## 📦 其他部署方式

<details>
<summary><b>方式一：使用命令行脚本</b></summary>

### 前置要求
- 已安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare 账号

### 快速部署

```bash
# 克隆仓库
git clone https://github.com/telagod/V0TV.git
cd V0TV/deploy/cloudflare

# 登录 Cloudflare
wrangler login

# 执行部署脚本
chmod +x deploy.sh
./deploy.sh
```

脚本会自动完成：
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 部署到 Cloudflare Pages
- ✅ 配置环境变量

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

推送代码后自动部署！

</details>

---

## ⚙️ 环境变量配置

部署后在 Cloudflare Dashboard 中配置：

**Pages → 你的项目 → Settings → Environment variables**

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

多用户功能需要 Cloudflare D1 数据库。

### 创建数据库

```bash
# 1. 创建数据库
wrangler d1 create v0tv-db

# 2. 初始化表结构
wrangler d1 execute v0tv-db --file=../../D1用到的相关所有.sql

# 3. 记录数据库 ID
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
构建命令: pnpm pages:build 或 npm run pages:build
输出目录: .vercel/output/static
```

**常见错误**：
- `pnpm not found` → 在环境变量中添加 `PNPM_VERSION=8`
- `Build timeout` → 检查依赖安装是否正常

</details>

<details>
<summary><b>部署成功但无法访问</b></summary>

1. 检查 `PASSWORD` 环境变量是否已设置
2. 查看 Functions 日志：Dashboard → Pages → 项目 → Functions
3. 确认域名 DNS 解析正常

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

Dashboard → Pages → 项目 → Custom domains → Add domain

### 访问控制

Dashboard → Pages → 项目 → Settings → Access policies

### 性能优化

- ✅ Brotli 压缩（默认启用）
- ✅ 全球 CDN 加速
- ✅ 边缘计算优化
- 📊 使用 [Cloudflare Analytics](https://www.cloudflare.com/web-analytics/) 监控性能

---

## 📚 相关资源

- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [返回主文档](../../README.md)

---

## 💡 提示

- 免费计划每月 500 次构建，无限流量
- 支持自动 HTTPS 和全球 CDN
- 边缘计算提供更快的响应速度
- D1 数据库免费配额：5GB 存储，500 万次读取/天

---

需要帮助？[提交 Issue](https://github.com/telagod/V0TV/issues) 或查看 [常见问题](../../docs/faq.md)
