#!/bin/bash

# V0TV D1 数据库配置脚本
# 此脚本帮助你快速配置 D1 数据库

set -e

echo "================================="
echo "V0TV D1 数据库配置向导"
echo "================================="
echo ""

# 检查是否已登录 Wrangler
if ! npx wrangler whoami &>/dev/null; then
    echo "⚠️  未检测到 Wrangler 登录状态"
    echo ""
    echo "请选择创建 D1 数据库的方式："
    echo "1) 通过 Wrangler CLI 创建（需要登录）"
    echo "2) 通过 Cloudflare Dashboard 创建（推荐）"
    echo ""
    read -p "请选择 (1 或 2): " choice

    if [ "$choice" = "1" ]; then
        echo ""
        echo "正在启动 Wrangler 登录..."
        npx wrangler login
    elif [ "$choice" = "2" ]; then
        echo ""
        echo "请按以下步骤操作："
        echo "1. 访问: https://dash.cloudflare.com/"
        echo "2. 进入 Workers & Pages → D1"
        echo "3. 点击 Create database"
        echo "4. 输入数据库名称: v0tv-db"
        echo "5. 创建后复制 database_id"
        echo ""
        read -p "完成后，请输入你的 database_id: " db_id

        if [ -z "$db_id" ]; then
            echo "❌ database_id 不能为空"
            exit 1
        fi

        # 更新 wrangler.jsonc
        echo ""
        echo "正在更新 wrangler.jsonc..."

        # 使用 sed 取消注释并替换 database_id
        sed -i.bak 's|// "d1_databases":|"d1_databases":|' wrangler.jsonc
        sed -i.bak 's|//   {|  {|' wrangler.jsonc
        sed -i.bak 's|//     "binding": "DB",|    "binding": "DB",|' wrangler.jsonc
        sed -i.bak 's|//     "database_name": "v0tv-db",|    "database_name": "v0tv-db",|' wrangler.jsonc
        sed -i.bak "s|//     \"database_id\": \"your-database-id-here\"|    \"database_id\": \"$db_id\"|" wrangler.jsonc
        sed -i.bak 's|//   }|  }|' wrangler.jsonc
        sed -i.bak 's|// ],|],|' wrangler.jsonc

        echo "✅ wrangler.jsonc 已更新"
        echo ""
        echo "接下来需要在 Cloudflare Dashboard 配置环境变量："
        echo ""
        echo "访问: Workers & Pages → v0tv → Settings → Variables"
        echo ""
        echo "添加以下环境变量："
        echo "  PASSWORD=your_password"
        echo "  NEXT_PUBLIC_STORAGE_TYPE=d1"
        echo "  USERNAME=admin"
        echo "  NEXT_PUBLIC_ENABLE_REGISTER=true"
        echo ""
        echo "配置完成后，运行以下命令部署："
        echo "  pnpm run pages:build && npx wrangler deploy"
        echo ""
        exit 0
    else
        echo "❌ 无效选择"
        exit 1
    fi
fi

# 使用 CLI 创建数据库
echo ""
echo "正在创建 D1 数据库..."
output=$(npx wrangler d1 create v0tv-db 2>&1)

if echo "$output" | grep -q "database_id"; then
    # 提取 database_id
    db_id=$(echo "$output" | grep -oP 'database_id = "\K[^"]+')

    echo "✅ 数据库创建成功！"
    echo "   database_id: $db_id"
    echo ""

    # 更新 wrangler.jsonc
    echo "正在更新 wrangler.jsonc..."

    # 使用 sed 取消注释并替换 database_id
    sed -i.bak 's|// "d1_databases":|"d1_databases":|' wrangler.jsonc
    sed -i.bak 's|//   {|  {|' wrangler.jsonc
    sed -i.bak 's|//     "binding": "DB",|    "binding": "DB",|' wrangler.jsonc
    sed -i.bak 's|//     "database_name": "v0tv-db",|    "database_name": "v0tv-db",|' wrangler.jsonc
    sed -i.bak "s|//     \"database_id\": \"your-database-id-here\"|    \"database_id\": \"$db_id\"|" wrangler.jsonc
    sed -i.bak 's|//   }|  }|' wrangler.jsonc
    sed -i.bak 's|// ],|],|' wrangler.jsonc

    echo "✅ wrangler.jsonc 已更新"
    echo ""
    echo "接下来需要在 Cloudflare Dashboard 配置环境变量："
    echo ""
    echo "访问: Workers & Pages → v0tv → Settings → Variables"
    echo ""
    echo "添加以下环境变量："
    echo "  PASSWORD=your_password"
    echo "  NEXT_PUBLIC_STORAGE_TYPE=d1"
    echo "  USERNAME=admin"
    echo "  NEXT_PUBLIC_ENABLE_REGISTER=true"
    echo ""
    echo "配置完成后，运行以下命令部署："
    echo "  pnpm run pages:build && npx wrangler deploy"
else
    echo "❌ 创建数据库失败"
    echo "$output"
    exit 1
fi
