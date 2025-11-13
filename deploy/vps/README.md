# VPS 服务器部署指南

适合有服务器管理经验的用户，提供完全的控制权。

## 🖥️ 服务器要求

### 最低配置

- CPU: 1 核
- 内存: 1GB
- 存储: 10GB
- 系统: Ubuntu 20.04+ / Debian 11+ / CentOS 8+

### 推荐配置

- CPU: 2 核
- 内存: 2GB
- 存储: 20GB

---

## 🚀 快速部署（使用 Docker）

### 方式一：Docker Compose

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 克隆项目
git clone https://github.com/telagod/V0TV.git
cd V0TV

# 使用部署脚本
cd deploy/docker
./deploy-redis.sh
```

### 方式二：使用一键脚本

```bash
# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/telagod/V0TV/main/deploy/vps/install.sh | bash
```

---

## 📝 手动部署步骤

### 1. 安装 Node.js

```bash
# 使用 nvm 安装 Node.js 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 安装 pnpm
npm install -g pnpm
```

### 2. 克隆并构建项目

```bash
# 克隆项目
git clone https://github.com/telagod/V0TV.git
cd V0TV

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
nano .env

# 构建项目
pnpm run build
```

### 3. 配置 PM2（进程管理）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start pnpm --name v0tv -- start

# 设置开机自启
pm2 startup
pm2 save
```

### 4. 配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt update
sudo apt install nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/v0tv
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/v0tv /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 配置 SSL（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 🗄️ 配置 Redis（可选，多用户支持）

### 使用 Docker

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  --restart unless-stopped \
  redis:alpine redis-server --appendonly yes
```

### 手动安装

```bash
# Ubuntu/Debian
sudo apt install redis-server

# 启动 Redis
sudo systemctl start redis
sudo systemctl enable redis

# 测试连接
redis-cli ping
```

在 `.env` 中配置：

```bash
NEXT_PUBLIC_STORAGE_TYPE=redis
REDIS_URL=redis://localhost:6379
```

---

## 🔧 常用管理命令

### PM2 命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs v0tv

# 重启应用
pm2 restart v0tv

# 停止应用
pm2 stop v0tv

# 删除应用
pm2 delete v0tv
```

### 更新应用

```bash
cd /path/to/V0TV

# 拉取最新代码
git pull

# 安装依赖
pnpm install

# 重新构建
pnpm run build

# 重启应用
pm2 restart v0tv
```

---

## 🔒 安全加固

### 1. 配置防火墙

```bash
# 安装 UFW
sudo apt install ufw

# 允许必要端口
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 启用防火墙
sudo ufw enable
```

### 2. 禁用 Root 登录

```bash
# 编辑 SSH 配置
sudo nano /etc/ssh/sshd_config

# 修改以下行
PermitRootLogin no
PasswordAuthentication no

# 重启 SSH
sudo systemctl restart sshd
```

### 3. 配置 fail2ban

```bash
# 安装 fail2ban
sudo apt install fail2ban

# 启动服务
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 📊 监控和日志

### 系统监控

```bash
# 安装 htop
sudo apt install htop

# 查看系统资源
htop
```

### 应用日志

```bash
# PM2 日志
pm2 logs v0tv

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 备份策略

### 备份脚本示例

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/v0tv"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份应用数据
tar -czf $BACKUP_DIR/v0tv-$DATE.tar.gz /path/to/V0TV

# 备份 Redis（如果使用）
docker exec redis redis-cli SAVE
docker cp redis:/data/dump.rdb $BACKUP_DIR/redis-$DATE.rdb

# 删除7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

设置定时任务：

```bash
# 编辑 crontab
crontab -e

# 每天凌晨3点执行备份
0 3 * * * /path/to/backup.sh
```

---

## 故障排除

### 应用无法启动

```bash
# 检查端口占用
sudo netstat -tlnp | grep 3000

# 检查日志
pm2 logs v0tv --lines 100
```

### 内存不足

```bash
# 增加 Swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Nginx 502 错误

```bash
# 检查应用是否运行
pm2 status

# 检查端口是否监听
curl http://localhost:3000

# 检查 Nginx 配置
sudo nginx -t
```

---

## 📚 相关脚本

- `install.sh` - 一键安装脚本
- `update.sh` - 更新脚本
- `backup.sh` - 备份脚本
- `monitor.sh` - 监控脚本
