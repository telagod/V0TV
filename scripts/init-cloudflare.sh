#!/bin/bash

# Cloudflare Workers 资源自动初始化脚本
# 用于自动创建和配置 D1 数据库和 KV 命名空间

set -e

echo "🚀 Cloudflare Workers 资源自动初始化"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 wrangler 是否已安装
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ 错误: wrangler CLI 未安装${NC}"
    echo ""
    echo "请先安装 wrangler:"
    echo "  npm install -g wrangler"
    echo "或"
    echo "  pnpm add -g wrangler"
    exit 1
fi

# 检查是否已登录
echo "🔐 检查 Cloudflare 登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  未登录 Cloudflare${NC}"
    echo ""
    echo "正在打开浏览器进行登录..."
    wrangler login
    echo ""
fi

echo -e "${GREEN}✅ 已登录 Cloudflare${NC}"
echo ""

# 获取项目名称
PROJECT_NAME="v0tv"
if [ -f "wrangler.toml" ]; then
    PROJECT_NAME=$(grep "^name = " wrangler.toml | cut -d'"' -f2 || echo "v0tv")
fi

echo "📦 项目名称: $PROJECT_NAME"
echo ""

# 询问是否创建 D1 数据库
echo "❓ 是否需要创建 D1 数据库？（多用户模式需要）"
read -p "   [y/N] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗄️  创建 D1 数据库..."

    DB_NAME="${PROJECT_NAME}-db"

    # 检查数据库是否已存在
    if wrangler d1 list | grep -q "$DB_NAME"; then
        echo -e "${YELLOW}⚠️  数据库 $DB_NAME 已存在${NC}"
        echo ""
        echo "是否要使用现有数据库？"
        read -p "   [Y/n] " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            # 获取现有数据库 ID
            DB_ID=$(wrangler d1 list | grep "$DB_NAME" | awk '{print $1}')
        else
            # 创建新的数据库名称
            DB_NAME="${DB_NAME}-$(date +%s)"
            echo "创建新数据库: $DB_NAME"
            DB_ID=$(wrangler d1 create "$DB_NAME" | grep "database_id" | cut -d'"' -f4)
        fi
    else
        # 创建数据库
        echo "创建数据库: $DB_NAME"
        OUTPUT=$(wrangler d1 create "$DB_NAME" 2>&1)
        DB_ID=$(echo "$OUTPUT" | grep -oP 'database_id = "\K[^"]+')

        if [ -z "$DB_ID" ]; then
            echo -e "${RED}❌ 创建数据库失败${NC}"
            echo "$OUTPUT"
            exit 1
        fi
    fi

    echo -e "${GREEN}✅ 数据库创建成功${NC}"
    echo "   名称: $DB_NAME"
    echo "   ID: $DB_ID"
    echo ""

    # 初始化数据库表结构
    if [ -f "D1用到的相关所有.sql" ]; then
        echo "📋 初始化数据库表结构..."
        if wrangler d1 execute "$DB_NAME" --file=D1用到的相关所有.sql &> /dev/null; then
            echo -e "${GREEN}✅ 数据库表结构初始化成功${NC}"
        else
            echo -e "${YELLOW}⚠️  数据库表结构初始化失败（可能已存在）${NC}"
        fi
        echo ""
    else
        echo -e "${YELLOW}⚠️  未找到 D1用到的相关所有.sql 文件${NC}"
        echo "   请手动执行: wrangler d1 execute $DB_NAME --file=D1用到的相关所有.sql"
        echo ""
    fi

    # 更新 wrangler.toml
    echo "📝 更新 wrangler.toml 配置..."

    if [ -f "wrangler.toml" ]; then
        # 检查是否已有 D1 配置
        if grep -q "^\[\[d1_databases\]\]" wrangler.toml; then
            # 更新现有配置
            sed -i.bak "s/database_id = \".*\"/database_id = \"$DB_ID\"/" wrangler.toml
            sed -i.bak "s/database_name = \".*\"/database_name = \"$DB_NAME\"/" wrangler.toml
            # 取消注释
            sed -i.bak "s/^# \?\(\[\[d1_databases\]\]\)/\1/" wrangler.toml
            sed -i.bak "s/^# \?\(binding = \"DB\"\)/\1/" wrangler.toml
            sed -i.bak "s/^# \?\(database_name = \)/\1/" wrangler.toml
            sed -i.bak "s/^# \?\(database_id = \)/\1/" wrangler.toml
            rm -f wrangler.toml.bak
        else
            # 添加新配置
            echo "" >> wrangler.toml
            echo "# D1 数据库配置（自动生成）" >> wrangler.toml
            echo "[[d1_databases]]" >> wrangler.toml
            echo "binding = \"DB\"" >> wrangler.toml
            echo "database_name = \"$DB_NAME\"" >> wrangler.toml
            echo "database_id = \"$DB_ID\"" >> wrangler.toml
        fi

        echo -e "${GREEN}✅ wrangler.toml 配置已更新${NC}"
        echo ""
    fi

    # 提示更新环境变量
    echo "⚙️  请在 Cloudflare Dashboard 中设置以下环境变量："
    echo "   NEXT_PUBLIC_STORAGE_TYPE=d1"
    echo ""
fi

# 询问是否创建 KV 命名空间
echo "❓ 是否需要创建 KV 命名空间？（缓存加速需要）"
read -p "   [y/N] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🗂️  创建 KV 命名空间..."

    KV_NAME="${PROJECT_NAME}-kv"

    # 检查 KV 是否已存在
    if wrangler kv:namespace list | grep -q "$KV_NAME"; then
        echo -e "${YELLOW}⚠️  KV 命名空间 $KV_NAME 已存在${NC}"
        KV_ID=$(wrangler kv:namespace list | grep "$KV_NAME" | grep -oP 'id = "\K[^"]+' | head -1)
    else
        # 创建 KV 命名空间
        OUTPUT=$(wrangler kv:namespace create "$KV_NAME" 2>&1)
        KV_ID=$(echo "$OUTPUT" | grep -oP 'id = "\K[^"]+')

        if [ -z "$KV_ID" ]; then
            echo -e "${RED}❌ 创建 KV 命名空间失败${NC}"
            echo "$OUTPUT"
            exit 1
        fi
    fi

    echo -e "${GREEN}✅ KV 命名空间创建成功${NC}"
    echo "   名称: $KV_NAME"
    echo "   ID: $KV_ID"
    echo ""

    # 更新 wrangler.toml
    if [ -f "wrangler.toml" ]; then
        if ! grep -q "^\[\[kv_namespaces\]\]" wrangler.toml; then
            echo "" >> wrangler.toml
            echo "# KV 命名空间配置（自动生成）" >> wrangler.toml
            echo "[[kv_namespaces]]" >> wrangler.toml
            echo "binding = \"KV\"" >> wrangler.toml
            echo "id = \"$KV_ID\"" >> wrangler.toml

            echo -e "${GREEN}✅ wrangler.toml KV 配置已添加${NC}"
            echo ""
        fi
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 初始化完成！${NC}"
echo ""
echo "📋 后续步骤:"
echo "1. 检查 wrangler.toml 配置是否正确"
echo "2. 在 Cloudflare Dashboard 中配置环境变量"
echo "3. 运行 'wrangler deploy' 或推送代码触发自动部署"
echo ""
echo "📖 查看文档: deploy/cloudflare/README.md"
echo ""
