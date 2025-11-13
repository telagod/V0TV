#!/bin/bash
# Docker 单容器一键部署脚本

set -e

# 切换到项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🚀 V0TV - Docker 单容器部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 询问密码
read -sp "请设置访问密码: " PASSWORD
echo ""

# 询问端口
read -p "请设置端口 (默认 3000): " PORT
PORT=${PORT:-3000}

# 检查config.json
if [ ! -f "config.json" ]; then
    echo "⚠️  未找到 config.json，将使用示例配置"
    if [ -f "config.example.json" ]; then
        cp config.example.json config.json
    fi
fi

echo ""
echo "📦 拉取最新镜像..."
docker pull ghcr.io/telagod/v0tv:latest

echo ""
echo "🚀 启动容器..."

# 检查是否挂载config.json
if [ -f "config.json" ]; then
    docker run -d \
      --name v0tv \
      -p $PORT:3000 \
      -e PASSWORD="$PASSWORD" \
      -v "$(pwd)/config.json:/app/config.json:ro" \
      --restart unless-stopped \
      ghcr.io/telagod/v0tv:latest
else
    docker run -d \
      --name v0tv \
      -p $PORT:3000 \
      -e PASSWORD="$PASSWORD" \
      --restart unless-stopped \
      ghcr.io/telagod/v0tv:latest
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 访问地址: http://localhost:$PORT"
echo "🔑 访问密码: $PASSWORD"
echo ""
echo "📝 常用命令:"
echo "   查看日志: docker logs -f v0tv"
echo "   重启容器: docker restart v0tv"
echo "   停止容器: docker stop v0tv"
echo "   删除容器: docker rm -f v0tv"
echo ""
