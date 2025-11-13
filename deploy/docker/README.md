# Docker 部署指南

V0TV 提供多种 Docker 部署方案，适合不同使用场景。

## 🚀 快速开始

### 方式一：单容器部署（最简单）

适合个人使用，无需数据库。

```bash
cd deploy/docker
./deploy-single.sh
```

或手动运行：

```bash
docker run -d \
  --name v0tv \
  -p 3000:3000 \
  -e PASSWORD=your_password \
  -v $(pwd)/config.json:/app/config.json:ro \
  --restart unless-stopped \
  ghcr.io/telagod/v0tv:latest
```

### 方式二：Docker Compose + Redis（推荐）

适合多用户使用，支持数据同步。

```bash
cd deploy/docker
./deploy-redis.sh
```

或手动运行：

```bash
# 复制环境变量
cp .env.example .env

# 编辑 .env 文件
nano .env

# 启动服务
docker compose up -d
```

---

## ⚙️ 环境变量配置

在 `.env` 文件中配置：

```bash
# 必填
PASSWORD=your_secure_password

# 多用户配置
USERNAME=admin
NEXT_PUBLIC_STORAGE_TYPE=redis
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_ENABLE_REGISTER=true

# 可选
SITE_NAME=V0TV
NEXT_PUBLIC_SEARCH_MAX_PAGE=5
```

---

## 🔧 常用命令

```bash
# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新镜像
docker compose pull
docker compose up -d

# 进入容器
docker compose exec v0tv sh
```

---

## 📦 自定义构建

如需修改代码后重新构建：

```bash
# 在项目根目录执行
docker build -f deploy/docker/Dockerfile -t v0tv:custom .

# 运行自定义镜像
docker run -d --name v0tv -p 3000:3000 v0tv:custom
```

---

## 🗄️ 数据持久化

Redis 数据会自动持久化到 Docker volume：

```bash
# 查看数据卷
docker volume ls | grep v0tv

# 备份数据
docker run --rm \
  -v v0tv-redis-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/redis-backup.tar.gz /data

# 恢复数据
docker run --rm \
  -v v0tv_redis-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/redis-backup.tar.gz -C /
```

---

## 🔒 安全建议

1. **修改默认密码**：设置强密码
2. **限制访问**：使用反向代理（Nginx/Caddy）
3. **启用 HTTPS**：配置 SSL 证书
4. **定期备份**：备份 Redis 数据和配置文件
5. **更新镜像**：定期更新到最新版本

---

## 故障排除

### 容器无法启动

```bash
# 查看详细日志
docker compose logs v0tv

# 检查端口占用
netstat -tlnp | grep 3000

# 检查环境变量
docker compose config
```

### Redis 连接失败

```bash
# 测试 Redis 连接
docker compose exec redis redis-cli ping

# 查看 Redis 日志
docker compose logs redis
```

### 视频无法播放

检查 config.json 是否正确挂载：

```bash
docker compose exec v0tv cat /app/config.json
```

---

## 📚 相关文件

- `Dockerfile` - 镜像构建文件
- `docker-compose.yml` - Compose 配置
- `.env.example` - 环境变量模板
- `deploy-single.sh` - 单容器部署脚本
- `deploy-redis.sh` - Redis 部署脚本
