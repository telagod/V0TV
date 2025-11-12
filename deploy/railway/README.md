# Railway 部署指南

Railway 提供简单的一键部署，支持自动扩展和多种数据库。

## 🚀 一键部署

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/v0tv)

点击按钮，选择仓库并自动部署。

---

## 📝 手动部署步骤

### 1. 创建项目

1. 访问 [Railway](https://railway.app/)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的 V0TV 仓库

### 2. 配置环境变量

添加以下环境变量：

```bash
# 必填
PASSWORD=your_password

# 多用户配置（推荐）
USERNAME=admin
NEXT_PUBLIC_STORAGE_TYPE=redis
NEXT_PUBLIC_ENABLE_REGISTER=true
```

### 3. 添加 Redis 数据库（可选）

1. 在项目中点击 "New"
2. 选择 "Database" → "Add Redis"
3. Railway 自动设置 `REDIS_URL` 环境变量

### 4. 部署设置

Railway 会自动检测 Next.js 项目并配置构建命令：

```bash
# 构建命令
pnpm install && pnpm run build

# 启动命令
pnpm start
```

---

## 🔧 使用 Railway CLI

```bash
# 安装 CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
cd /path/to/V0TV
railway init

# 添加环境变量
railway variables set PASSWORD=your_password

# 部署
railway up

# 查看日志
railway logs
```

---

## 📋 配置文件

创建 `railway.json`（项目中已包含）：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm run build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## ⚙️ 高级功能

### 自定义域名

Railway Dashboard → Settings → Domains → Add Custom Domain

### 自动部署

Railway 自动监听 GitHub 推送：
- 推送代码 → 自动部署
- PR 创建 → 创建预览环境

### 环境管理

Railway 支持多环境：
- Production（生产）
- Staging（预发布）
- Development（开发）

### 水平扩展

Railway Pro 计划支持自动扩展。

---

## 💰 费用说明

Railway 采用按使用量计费：

**免费额度**：
- $5 免费额度/月
- 支持小型项目

**Pro 计划**：
- $20/月起
- 无限项目
- 自动扩展

---

## 🎯 Railway 优势

✅ **简单易用**：一键部署
✅ **自动 HTTPS**：免费 SSL
✅ **集成数据库**：一键添加 Redis/PostgreSQL
✅ **持续部署**：Git 推送自动部署
✅ **灵活计费**：按使用量付费

---

## 故障排除

### 构建失败

检查构建日志：

```bash
railway logs --deployment
```

### 内存不足

升级 Railway 计划或优化应用内存使用。

### 端口配置

Railway 自动设置 `PORT` 环境变量，Next.js 会自动使用。

---

## 📚 相关资源

- [Railway 文档](https://docs.railway.app/)
- [Railway 社区](https://railway.app/community)
- [定价说明](https://railway.app/pricing)
