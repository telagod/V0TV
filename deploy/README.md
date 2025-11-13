# 🚀 V0TV 部署手册

无论你是只想在家里看剧，还是要面向团队提供服务，这份部署手册都能在几分钟内帮你上线 V0TV。

---

## 🎯 如何选方案

| 目标 | 推荐方案 | 说明 |
| --- | --- | --- |
| 零成本、全球访问 | Cloudflare Pages + Pages Functions | 直接复用 GitHub 仓库，自动构建、支持 KV/Workers |
| 有一台服务器，想尽快跑起来 | Docker 单容器 | 一条脚本搞定，所有依赖都封装在镜像里 |
| 多用户 + 数据同步 | Docker Compose + Redis | 自带 Redis，支持播放记录/收藏跨设备同步 |
| 习惯前端托管平台 | Vercel | 一键部署，自动 HTTPS，配合 Upstash/Redis 即可共享数据 |
| 想托管在 Railway 之类的 PaaS | Railway | 官方模板，带 Redis/变量向导 |
| 完全自定义的 VPS | `deploy/vps` 安装脚本 | 适合需要反向代理/多应用管理的场景 |

> 如果不确定，用 **Docker 单容器** 或 **Vercel** 最省心；要做高可用或离线混合部署，再考虑其他选项。

---

## 🧭 标准部署流程

1. **拉代码**：`git clone https://github.com/telagod/V0TV.git && cd V0TV`
2. **准备配置**：复制 `config.example.json` 或者设置环境变量（详见下文）
3. **选择方案**：进入 `deploy/<方案>` 目录，阅读对应 README
4. **执行脚本/按钮**：如 `./deploy-single.sh`、Vercel/Railway 按钮等
5. **验证**：浏览器访问站点，确保首次访问需要密码且媒体源可搜索

---

## 🧱 方案细节

### 1. Docker（本地或自托管）

- **单容器（最快）**
  ```bash
  cd deploy/docker
  ./deploy-single.sh
  ```
  脚本会拉取 `ghcr.io/telagod/v0tv:latest` 镜像并提示你输入访问密码。如需自定义配置，把 `config.json` 放在仓库根目录即可自动挂载。

- **Docker Compose + Redis（推荐多用户）**
  ```bash
  cd deploy/docker
  cp .env.example .env   # 修改密码、Redis 等变量
  docker compose up -d
  ```
  Compose 文件会启动 `v0tv` 与 `v0tv-redis` 两个服务，Redis 数据持久化在 `v0tv-redis-data` 卷中。

### 2. Cloudflare Pages

1. Fork 仓库或直接导入 `telagod/V0TV`
2. 在 Cloudflare Pages 选择 **Use direct upload → Connect to Git**
3. 构建命令：`pnpm install && pnpm pages:build`
4. 输出目录：`.open-next`
5. 在 Pages 中添加以下 Secrets：
   - `PASSWORD`
   - `NEXT_PUBLIC_STORAGE_TYPE=d1`（或 upstash/redis）
   - 与存储类型匹配的凭据（如 `D1_DATABASE_ID`、`UPSTASH_URL`、`UPSTASH_TOKEN`）
6. 如需 Workers/CRON，可参考 `deploy/cloudflare/README.md`

### 3. Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/telagod/V0TV)

> 创建后在 Vercel Dashboard → Settings → Environment Variables 中配置 `PASSWORD`、`NEXT_PUBLIC_STORAGE_TYPE` 及 Redis/Upstash 相关变量。若使用 Upstash，可以直接复制连接字符串并在 Vercel “Add Integration” 中授权。

### 4. Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/v0tv)

模板已经预置了服务、环境变量说明和 Redis 依赖。部署后在 `Variables` 面板里更新密码即可。

### 5. VPS / 裸机

```bash
curl -fsSL https://raw.githubusercontent.com/telagod/V0TV/main/deploy/vps/install.sh | bash
```

脚本会自动安装 Node.js、PM2、Nginx（可选）并将应用部署为服务。详细自定义步骤见 `deploy/vps/README.md`。

---

## 🔐 环境变量速查

| 变量 | 说明 | 是否必填 |
| --- | --- | --- |
| `PASSWORD` | 访问站点的主密码 | ✅ |
| `NEXT_PUBLIC_STORAGE_TYPE` | `localstorage` / `redis` / `upstash` / `d1` | ✅ |
| `REDIS_URL` | `redis://user:pass@host:port`，Docker/自建 Redis 用 | 取决于存储类型 |
| `UPSTASH_URL` / `UPSTASH_TOKEN` | Upstash Redis 凭据 | 同上 |
| `D1_DATABASE_ID` / `D1_TOKEN` | Cloudflare D1 所需 | 同上 |
| `NEXTAUTH_SECRET` | 任意 32+ 位随机串，用于 NextAuth 加密 | ✅（生产环境） |
| `SITE_NAME` | 覆盖默认的 “V0TV” 标题 | 可选 |
| `NEXT_PUBLIC_ENABLE_REGISTER` | `true/false`，开启自助注册 | 可选 |
| `NEXT_PUBLIC_IMAGE_PROXY` | 图片代理地址 | 可选 |

> 任何方案都需要至少设置 `PASSWORD`；其余按部署目标按需配置。

---

## 🛠️ 常用维护命令

```bash
# 查看容器日志
docker logs -f v0tv

# 更新镜像
docker pull ghcr.io/telagod/v0tv:latest
docker compose down && docker compose up -d

# 备份 Redis（Docker）
docker run --rm \
  -v v0tv-redis-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/redis-backup.tgz /data
```

---

## 📚 更多资料

- `deploy/cloudflare/`：Cloudflare Pages + Workers 全流程
- `deploy/vercel/`：Vercel 特定配置、Serverless 限制说明
- `deploy/vps/`：Systemd/PM2 模板与 Nginx 示例
- `docs/troubleshooting.md`：常见错误排查

> 有新的部署需求，欢迎在 [Discussions](https://github.com/telagod/V0TV/discussions) 留言或提 Issue。
