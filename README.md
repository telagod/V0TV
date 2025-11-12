<div align="center">
  <img src="public/logo.png" alt="V0TV Logo" width="128" />

  <h1>V0TV</h1>
  <p><strong>自托管影视聚合播放器</strong></p>
  <p>基于 Next.js 14 · TypeScript · Tailwind CSS</p>
</div>

---

## 📰 项目声明

本项目 fork 自 [KatelyaTV](https://github.com/katelya77/KatelyaTV)，其演进自 MoonTV。保留并致谢原作者与社区贡献者。

---

## ✨ 核心特性

- 🔍 **聚合搜索** - 多源影视内容聚合
- 📺 **高清播放** - 基于 ArtPlayer 播放器
- ⏭️ **智能跳过** - 自动跳过片头片尾
- 🎯 **断点续播** - 跨设备同步播放进度
- ⭐ **收藏功能** - 多设备数据同步
- 🔒 **内容过滤** - 智能成人内容过滤
- 📱 **响应式设计** - 适配各种设备

---

## 🚀 快速部署

> 📁 所有部署文件已整理到 `deploy/` 目录，[查看完整部署指南](deploy/README.md)

### 方式一：Cloudflare Pages（推荐，免费）⭐

#### 一键脚本部署

```bash
cd deploy/cloudflare
./deploy.sh
```

#### GitHub 自动部署

1. Fork 项目
2. 配置 Cloudflare Secrets
3. 推送代码自动部署

[详细教程](deploy/cloudflare/README.md)

---

### 方式二：Docker 单容器（个人使用）

```bash
cd deploy/docker
./deploy-single.sh
```

[详细教程](deploy/docker/README.md)

---

### 方式三：Docker + Redis（多用户）

```bash
cd deploy/docker
./deploy-redis.sh
```

[详细教程](deploy/docker/README.md)

---

### 方式四：Vercel 一键部署（免费）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/V0TV)

[详细教程](deploy/vercel/README.md)

---

### 方式五：Railway 部署

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/v0tv)

[详细教程](deploy/railway/README.md)

---

### 方式六：VPS 服务器

```bash
curl -fsSL https://raw.githubusercontent.com/your-username/V0TV/main/deploy/vps/install.sh | bash
```

[详细教程](deploy/vps/README.md)

---

## 📋 部署方式对比

| 方式 | 难度 | 成本 | 推荐场景 |
|-----|------|------|---------|
| Cloudflare | ⭐⭐ | 免费 | 全球访问 |
| Docker | ⭐ | 免费* | 个人使用 |
| Docker+Redis | ⭐⭐ | 免费* | 多用户 |
| Vercel | ⭐ | 免费 | 快速部署 |
| Railway | ⭐ | 付费 | 简单管理 |
| VPS | ⭐⭐⭐ | 付费 | 完全控制 |

> 查看[完整对比](deploy/README.md)

---

## ⚙️ 环境变量

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `PASSWORD` | 是 | 访问密码 | `your_password` |
| `USERNAME` | 否* | 管理员用户名 | `admin` |
| `NEXT_PUBLIC_STORAGE_TYPE` | 否 | 存储类型 | `redis/upstash/d1` |
| `NEXT_PUBLIC_ENABLE_REGISTER` | 否 | 用户注册开关 | `true/false` |
| `REDIS_URL` | 否** | Redis连接地址 | `redis://localhost:6379` |
| `UPSTASH_URL` | 否** | Upstash地址 | `https://xxx.upstash.io` |
| `UPSTASH_TOKEN` | 否** | Upstash令牌 | `AX_xxx` |

> *多用户部署必填
> **对应存储类型必填

---

## 📝 视频源配置

### 配置格式

编辑 `config.json` 文件：

```json
{
  "cache_time": 7200,
  "api_site": {
    "site1": {
      "api": "https://api.example.com/provide/vod",
      "name": "资源站名称",
      "is_adult": false
    }
  }
}
```

### 配置方式

1. **Docker**：挂载配置文件 `-v ./config.json:/app/config.json:ro`
2. **Vercel**：提交到仓库根目录
3. **管理员界面**：访问 `/admin` 上传配置

---

## 🔧 故障排除

### 无法登录
```bash
# 检查环境变量
echo $PASSWORD

# 重启服务
docker compose restart
```

### 数据库连接失败
```bash
# Redis连接测试
redis-cli -u $REDIS_URL ping

# 检查容器状态
docker compose ps
```

### 视频无法播放
- 检查 config.json 格式
- 验证视频源可用性
- 查看浏览器控制台错误

---

## 📚 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

---

## 🙏 致谢

感谢以下项目：
- [KatelyaTV](https://github.com/katelya77/KatelyaTV) - 项目源头
- [Next.js](https://nextjs.org/) - React框架
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) - 视频播放器
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架

---

## 📄 开源协议

本项目基于 MIT License 开源。

---

<div align="center">
  <p>Made with ❤️</p>
</div>
