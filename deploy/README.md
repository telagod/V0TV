# 🚀 V0TV 部署指南总览

V0TV 支持多种部署方式，选择最适合你的方案。

---

## 📋 部署方式对比

| 部署方式 | 难度 | 成本 | 推荐场景 | 多用户 | 自动部署 |
|---------|------|------|---------|-------|---------|
| **Cloudflare Pages** | ⭐⭐ | 免费 | 全球访问、零成本 | ✅ | ✅ |
| **Docker 单容器** | ⭐ | 免费* | 个人使用、简单快速 | ❌ | ❌ |
| **Docker + Redis** | ⭐⭐ | 免费* | 家庭/团队使用 | ✅ | ❌ |
| **Vercel** | ⭐ | 免费 | 快速部署、自动HTTPS | ✅** | ✅ |
| **Railway** | ⭐ | 按量付费 | 简单管理、集成数据库 | ✅ | ✅ |
| **VPS 服务器** | ⭐⭐⭐ | 按月付费 | 完全控制、高性能 | ✅ | ❌ |

> \*需要自己的服务器
> \*\*需要配置 Upstash Redis

---

## 🎯 快速选择

### 我是新手，想要最简单的方式
→ **Cloudflare Pages（GitHub 自动部署）**

1. Fork 项目到 GitHub
2. 配置 Cloudflare Secrets
3. 推送代码自动部署

[查看教程](cloudflare/README.md)

---

### 我有服务器，想要完全控制
→ **Docker + Redis**

```bash
cd deploy/docker
./deploy-redis.sh
```

[查看教程](docker/README.md)

---

### 我想要零配置快速部署
→ **Vercel 一键部署**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/V0TV)

[查看教程](vercel/README.md)

---

### 我需要灵活的云平台
→ **Railway**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/v0tv)

[查看教程](railway/README.md)

---

### 我有 VPS 服务器经验
→ **自托管部署**

```bash
curl -fsSL https://raw.githubusercontent.com/your-username/V0TV/main/deploy/vps/install.sh | bash
```

[查看教程](vps/README.md)

---

## 📂 目录结构

```
deploy/
├── cloudflare/          # Cloudflare Pages 部署
│   ├── deploy.sh        # 一键部署脚本
│   ├── check.sh         # 环境检查脚本
│   ├── wrangler.toml    # Cloudflare 配置
│   ├── github-actions.yml # GitHub Actions 配置
│   └── README.md        # 详细文档
│
├── docker/              # Docker 部署
│   ├── Dockerfile       # Docker 镜像文件
│   ├── docker-compose.yml # Compose 配置
│   ├── deploy-single.sh # 单容器部署
│   ├── deploy-redis.sh  # Redis 部署
│   └── README.md        # 详细文档
│
├── vercel/              # Vercel 部署
│   ├── vercel.json      # Vercel 配置
│   ├── deploy.sh        # 部署脚本
│   └── README.md        # 详细文档
│
├── railway/             # Railway 部署
│   ├── railway.json     # Railway 配置
│   └── README.md        # 详细文档
│
├── vps/                 # VPS 服务器部署
│   └── README.md        # 详细文档
│
└── README.md           # 本文件（总览）
```

---

## 🔑 环境变量说明

所有部署方式都需要配置以下环境变量：

### 必填变量

```bash
PASSWORD=your_password  # 访问密码
```

### 多用户配置（可选）

```bash
USERNAME=admin
NEXT_PUBLIC_STORAGE_TYPE=redis|upstash|d1
NEXT_PUBLIC_ENABLE_REGISTER=true

# 根据存储类型选择
REDIS_URL=redis://localhost:6379      # Docker Redis
UPSTASH_URL=https://xxx.upstash.io    # Upstash
UPSTASH_TOKEN=AX_xxx                   # Upstash Token
```

### 其他配置（可选）

```bash
SITE_NAME=V0TV
NEXT_PUBLIC_SEARCH_MAX_PAGE=5
NEXT_PUBLIC_IMAGE_PROXY=
```

---

## 🗺️ 部署流程图

```
选择部署方式
    │
    ├─→ 免费 + 全球CDN？ → Cloudflare Pages
    ├─→ 有服务器？ → Docker
    ├─→ 想要简单？ → Vercel/Railway
    └─→ 需要控制？ → VPS
```

---

## 📊 性能对比

### Cloudflare Pages
- ✅ 全球 CDN，访问速度快
- ✅ 无限带宽
- ✅ 自动 HTTPS
- ⚠️ 冷启动可能较慢

### Docker + Redis
- ✅ 性能可控
- ✅ 数据完全掌控
- ✅ 可自定义优化
- ⚠️ 需要服务器维护

### Vercel
- ✅ 部署快速
- ✅ 自动优化
- ✅ 全球 CDN
- ⚠️ 免费版有限制

### Railway
- ✅ 简单管理
- ✅ 集成数据库
- ✅ 灵活扩展
- ⚠️ 按使用量付费

---

## 🆘 获取帮助

1. **查看详细文档**：每个部署方式都有独立的 README.md
2. **常见问题**：查看各目录下的故障排除章节
3. **提交 Issue**：[GitHub Issues](https://github.com/your-username/V0TV/issues)

---

## 🎉 下一步

选择好部署方式后：

1. 📖 阅读对应目录的 README.md
2. 🔧 准备必要的工具和账号
3. 🚀 运行部署脚本或按步骤操作
4. ⚙️ 配置环境变量
5. 🎬 配置视频源（config.json）
6. ✅ 测试访问

---

<div align="center">
  <p><strong>祝你部署顺利！🚀</strong></p>
</div>
