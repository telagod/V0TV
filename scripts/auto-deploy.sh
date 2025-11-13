#!/bin/bash

# V0TV 自动部署脚本
# 自动生成随机密码，配置环境变量，部署到 Cloudflare Workers

set -e

echo "================================="
echo "V0TV 自动部署向导"
echo "================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 生成随机密码函数
generate_password() {
    # 生成 32 字符的随机密码（字母数字）
    openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# 保存凭据到文件
save_credentials() {
    local password=$1
    local username=$2
    local cred_file=".credentials.txt"

    cat > "$cred_file" << EOF
# V0TV 部署凭据
# ⚠️  请妥善保管此文件，包含敏感信息！
# 生成时间: $(date)

管理员用户名: $username
管理员密码: $password

访问地址: https://v0tv.你的账号.workers.dev

首次登录步骤：
1. 访问上述地址
2. 使用上述用户名和密码登录
3. 进入管理面板 -> 播放源配置
4. 添加你需要的播放源

⚠️  重要提示：
- 请将此文件保存到安全位置
- 不要将此文件提交到 Git
- 建议首次登录后修改密码
EOF

    echo -e "${GREEN}✅ 凭据已保存到: $cred_file${NC}"
    echo -e "${YELLOW}⚠️  请妥善保管此文件！${NC}"
}

# 配置 wrangler.jsonc 中的公开环境变量
configure_public_vars() {
    local username=$1

    echo -e "${BLUE}📝 配置公开环境变量...${NC}"

    # 检查 wrangler.jsonc 是否已有 vars 配置
    if grep -q '"vars"' wrangler.jsonc; then
        echo -e "${YELLOW}⚠️  wrangler.jsonc 已有 vars 配置，跳过${NC}"
        return
    fi

    # 使用 sed 在 services 数组后添加 vars 配置
    # 查找 services 数组的结束位置（],）
    if sed -i.bak '/^  \],$/a\
\
  \/\/ 环境变量（公开）\
  "vars": {\
    "USERNAME": "'"$username"'",\
    "NEXT_PUBLIC_STORAGE_TYPE": "d1",\
    "NEXT_PUBLIC_ENABLE_REGISTER": "true"\
  },' wrangler.jsonc 2>/dev/null; then
        echo -e "${GREEN}✅ wrangler.jsonc 已更新${NC}"
        rm -f wrangler.jsonc.bak
    else
        echo -e "${YELLOW}⚠️  自动配置失败，请手动添加以下内容到 wrangler.jsonc：${NC}"
        cat << EOF

  "vars": {
    "USERNAME": "$username",
    "NEXT_PUBLIC_STORAGE_TYPE": "d1",
    "NEXT_PUBLIC_ENABLE_REGISTER": "true"
  },
EOF
        return 1
    fi
}

# 设置密码（secret）
set_password_secret() {
    local password=$1

    echo -e "${BLUE}🔐 设置密码 secret...${NC}"

    # 使用管道传递密码给 wrangler（非交互式）
    echo "$password" | npx wrangler secret put PASSWORD 2>/dev/null || {
        echo -e "${RED}❌ 设置 secret 失败，可能需要先登录${NC}"
        echo -e "${YELLOW}请手动运行: echo '$password' | npx wrangler secret put PASSWORD${NC}"
        return 1
    }

    echo -e "${GREEN}✅ 密码 secret 已设置${NC}"
}

# 主流程
main() {
    echo -e "${BLUE}开始自动部署流程...${NC}"
    echo ""

    # 1. 生成随机密码
    echo -e "${BLUE}🎲 生成随机密码...${NC}"
    PASSWORD=$(generate_password)
    USERNAME="admin"
    echo -e "${GREEN}✅ 已生成随机密码${NC}"
    echo ""

    # 2. 保存凭据
    save_credentials "$PASSWORD" "$USERNAME"
    echo ""

    # 3. 检查是否已登录 Wrangler
    echo -e "${BLUE}🔍 检查 Wrangler 登录状态...${NC}"
    if ! npx wrangler whoami &>/dev/null; then
        echo -e "${YELLOW}⚠️  未登录 Wrangler，正在启动登录...${NC}"
        npx wrangler login || {
            echo -e "${RED}❌ 登录失败${NC}"
            exit 1
        }
    fi
    echo -e "${GREEN}✅ Wrangler 已登录${NC}"
    echo ""

    # 4. 配置公开环境变量
    configure_public_vars "$USERNAME" || {
        echo -e "${RED}❌ 配置环境变量失败${NC}"
        echo -e "${YELLOW}提示：可能是 Python 未安装或 wrangler.jsonc 格式问题${NC}"
        echo -e "${YELLOW}你可以手动在 wrangler.jsonc 中添加以下配置：${NC}"
        cat << EOF

  "vars": {
    "USERNAME": "$USERNAME",
    "NEXT_PUBLIC_STORAGE_TYPE": "d1",
    "NEXT_PUBLIC_ENABLE_REGISTER": "true"
  },
EOF
    }
    echo ""

    # 5. 构建项目
    echo -e "${BLUE}🔨 构建项目...${NC}"
    pnpm run pages:build || {
        echo -e "${RED}❌ 构建失败${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ 构建完成${NC}"
    echo ""

    # 6. 设置密码 secret
    set_password_secret "$PASSWORD"
    echo ""

    # 7. 部署
    echo -e "${BLUE}🚀 部署到 Cloudflare Workers...${NC}"
    npx wrangler deploy || {
        echo -e "${RED}❌ 部署失败${NC}"
        exit 1
    }
    echo ""

    # 8. 完成
    echo -e "${GREEN}=================================${NC}"
    echo -e "${GREEN}🎉 部署成功！${NC}"
    echo -e "${GREEN}=================================${NC}"
    echo ""
    echo -e "${BLUE}📋 部署信息：${NC}"
    echo -e "  管理员用户名: ${GREEN}$USERNAME${NC}"
    echo -e "  管理员密码: ${GREEN}$PASSWORD${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  凭据已保存到: .credentials.txt${NC}"
    echo ""
    echo -e "${BLUE}📝 下一步：${NC}"
    echo "  1. 访问你的 Worker URL"
    echo "  2. 使用上述凭据登录"
    echo "  3. 进入管理面板添加播放源"
    echo ""
    echo -e "${YELLOW}💡 提示：${NC}"
    echo "  - 首次访问会自动初始化 D1 数据库"
    echo "  - 建议首次登录后修改密码"
    echo "  - 凭据文件已添加到 .gitignore"
    echo ""
}

# 执行主流程
main
