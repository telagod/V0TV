#!/bin/bash
# Vercel 一键部署脚本

set -e

# 切换到项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🚀 V0TV - Vercel 部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安装 Vercel CLI..."
    npm install -g vercel
fi

# 登录
echo "📝 登录 Vercel..."
vercel login

# 询问是否配置环境变量
echo ""
read -p "是否需要配置环境变量？(y/N): " config_env

if [[ $config_env =~ ^[Yy]$ ]]; then
    echo ""
    read -sp "请输入访问密码: " PASSWORD
    echo ""

    echo "配置环境变量..."
    vercel env add PASSWORD production <<< "$PASSWORD"

    read -p "是否配置 Upstash（多用户支持）？(y/N): " use_upstash
    if [[ $use_upstash =~ ^[Yy]$ ]]; then
        read -p "Upstash URL: " UPSTASH_URL
        read -p "Upstash Token: " UPSTASH_TOKEN

        vercel env add NEXT_PUBLIC_STORAGE_TYPE production <<< "upstash"
        vercel env add UPSTASH_URL production <<< "$UPSTASH_URL"
        vercel env add UPSTASH_TOKEN production <<< "$UPSTASH_TOKEN"
        vercel env add USERNAME production <<< "admin"
        vercel env add NEXT_PUBLIC_ENABLE_REGISTER production <<< "true"
    fi
fi

# 部署
echo ""
echo "🚀 开始部署..."
vercel --prod

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 访问你的应用: 查看上方输出的 URL"
echo ""
