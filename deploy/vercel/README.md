# Vercel 部署指南

Vercel 是最简单的部署方式之一，提供免费托管和自动 HTTPS。

## 🚀 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/V0TV)

点击按钮，自动 fork 并部署到 Vercel。

---

## 📝 手动部署步骤

### 1. Fork 项目

访问 GitHub 仓库，点击右上角 Fork 按钮。

### 2. 导入到 Vercel

1. 访问 [Vercel](https://vercel.com/)
2. 点击 "Add New" → "Project"
3. 导入你 Fork 的仓库
4. 配置环境变量（见下方）
5. 点击 "Deploy"

### 3. 配置环境变量

在 Vercel Dashboard → Settings → Environment Variables 添加：

#### 必填变量

```bash
PASSWORD=your_password
```

#### 多用户配置（推荐使用 Upstash）

```bash
# Upstash Redis 配置
NEXT_PUBLIC_STORAGE_TYPE=upstash
UPSTASH_URL=https://xxx.upstash.io
UPSTASH_TOKEN=AX_xxx

# 管理员配置
USERNAME=admin
NEXT_PUBLIC_ENABLE_REGISTER=true
```

### 4. 创建 Upstash Redis（可选）

多用户支持需要 Redis 数据库：

1. 访问 [Upstash](https://upstash.com/)
2. 创建免费 Redis 数据库
3. 复制 `UPSTASH_URL` 和 `UPSTASH_TOKEN`
4. 添加到 Vercel 环境变量

---

## 🔧 使用脚本部署

```bash
cd deploy/vercel
./deploy.sh
```

脚本会自动：
- 检查 Vercel CLI
- 登录 Vercel
- 配置环境变量
- 部署项目

---

## 📋 手动使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd ../../  # 返回项目根目录
vercel

# 生产部署
vercel --prod
```

---

## ⚙️ 高级配置

### 自定义域名

Vercel Dashboard → Settings → Domains → Add Domain

### 环境变量管理

```bash
# 添加环境变量
vercel env add PASSWORD

# 查看环境变量
vercel env ls

# 删除环境变量
vercel env rm PASSWORD
```

### 自动部署

Vercel 自动检测 Git 推送：
- 推送到 `main` 分支 → 生产部署
- 推送到其他分支 → 预览部署

---

## 🎯 Vercel 优势

✅ **完全免费**：适合个人项目
✅ **自动 HTTPS**：免费 SSL 证书
✅ **全球 CDN**：访问速度快
✅ **持续部署**：Git 推送自动部署
✅ **零配置**：开箱即用

---

## ⚠️ Vercel 限制

- 免费版有执行时间限制（10秒）
- 函数大小限制（50MB）
- 带宽限制（100GB/月）

如需更多资源，考虑使用 Docker 或 Cloudflare Pages。

---

## 故障排除

### 构建失败

检查 pnpm 版本：

```bash
# 在 package.json 中指定 pnpm 版本
"packageManager": "pnpm@10.12.4"
```

### 环境变量未生效

1. 检查环境变量是否正确添加
2. 在 Settings → Environment Variables 中确认
3. 重新部署项目

### 视频无法播放

1. 确保 config.json 已提交到仓库
2. 检查视频源 API 是否可访问
3. 查看浏览器控制台错误

---

## 📚 相关文件

- `vercel.json` - Vercel 配置文件
- `.env.example` - 环境变量模板
- `deploy.sh` - 一键部署脚本
