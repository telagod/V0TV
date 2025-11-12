#!/bin/bash
# Cloudflare Pages 一键部署脚本

set -e

# 切换到项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🚀 V0TV - Cloudflare Pages 一键部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查是否安装了必要工具
command -v pnpm >/dev/null 2>&1 || { echo "❌ 请先安装 pnpm: npm install -g pnpm"; exit 1; }
command -v wrangler >/dev/null 2>&1 || { echo "❌ 请先安装 wrangler: npm install -g wrangler"; exit 1; }

# 步骤1: 登录Cloudflare
echo "📝 步骤1/5: 登录 Cloudflare..."
wrangler login

# 步骤2: 安装依赖
echo ""
echo "📦 步骤2/5: 安装项目依赖..."
pnpm install

# 步骤3: 构建项目
echo ""
echo "🔨 步骤3/5: 构建项目..."
pnpm run pages:build

# 步骤4: 询问是否创建D1数据库
echo ""
echo "💾 步骤4/5: D1数据库配置（多用户支持，可选）"
read -p "是否创建D1数据库？(y/N): " create_db

if [[ $create_db =~ ^[Yy]$ ]]; then
    echo "创建D1数据库..."

    # 创建数据库
    DB_OUTPUT=$(wrangler d1 create v0tv-db 2>&1)
    echo "$DB_OUTPUT"

    # 提取数据库ID
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk -F'"' '{print $2}')

    if [ -n "$DB_ID" ]; then
        echo "✅ 数据库创建成功！ID: $DB_ID"

        # 更新wrangler.toml
        WRANGLER_FILE="$PROJECT_ROOT/deploy/cloudflare/wrangler.toml"
        sed -i.bak "s/# database_id = \"your-database-id-here\"/database_id = \"$DB_ID\"/" "$WRANGLER_FILE"
        sed -i.bak "s/# \[\[d1_databases\]\]/[[d1_databases]]/" "$WRANGLER_FILE"
        sed -i.bak "s/# binding = \"DB\"/binding = \"DB\"/" "$WRANGLER_FILE"
        sed -i.bak "s/# database_name = \"v0tv-db\"/database_name = \"v0tv-db\"/" "$WRANGLER_FILE"
        rm "$WRANGLER_FILE.bak"

        # 初始化数据库
        echo "初始化数据库表..."
        wrangler d1 execute v0tv-db --file=./scripts/d1-init.sql
        echo "✅ 数据库初始化完成"
    else
        echo "⚠️  数据库创建失败，跳过..."
    fi
else
    echo "⏭️  跳过数据库创建"
fi

# 步骤5: 部署到Cloudflare Pages
echo ""
echo "🚀 步骤5/5: 部署到 Cloudflare Pages..."
wrangler pages deploy .vercel/output/static --project-name=v0tv --config="$PROJECT_ROOT/deploy/cloudflare/wrangler.toml"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 访问你的应用: https://v0tv.pages.dev"
echo ""
echo "⚙️  配置环境变量:"
echo "   1. 访问 Cloudflare Dashboard"
echo "   2. Pages > v0tv > Settings > Environment variables"
echo "   3. 添加以下环境变量:"
echo "      - PASSWORD=your_password"
echo "      - USERNAME=admin (可选，多用户时需要)"
echo "      - NEXT_PUBLIC_STORAGE_TYPE=d1 (如果创建了数据库)"
echo ""
