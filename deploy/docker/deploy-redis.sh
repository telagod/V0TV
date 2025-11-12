#!/bin/bash
# Docker Compose + Redis 一键部署脚本

set -e

# 切换到 deploy/docker 目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🚀 V0TV - Docker + Redis 部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 Docker Compose
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 创建 .env 如果不存在
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env

    # 交互式配置
    read -sp "请设置访问密码: " PASSWORD
    echo ""
    read -p "请设置管理员用户名 (默认 admin): " USERNAME
    USERNAME=${USERNAME:-admin}

    sed -i "s/your_secure_password/$PASSWORD/" .env
    sed -i "s/admin/$USERNAME/" .env

    echo "✅ 环境变量配置完成"
else
    echo "⚠️  检测到现有 .env 文件，将使用现有配置"
fi

echo ""
echo "📦 拉取镜像..."
docker compose pull

echo ""
echo "🚀 启动服务..."
docker compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 5

echo ""
echo "📊 检查服务状态..."
docker compose ps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 访问地址: http://localhost:3000"
echo ""
echo "📝 常用命令:"
echo "   查看日志: docker compose logs -f"
echo "   重启服务: docker compose restart"
echo "   停止服务: docker compose down"
echo "   更新服务: docker compose pull && docker compose up -d"
echo ""
