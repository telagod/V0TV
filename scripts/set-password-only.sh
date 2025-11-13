#!/bin/bash

# 仅设置 PASSWORD secret 的脚本
# 适用于已经通过 Git 自动部署的情况

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================="
echo "V0TV - 仅设置 PASSWORD Secret"
echo "================================="
echo ""

# 生成随机密码函数
generate_password() {
    openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# 保存凭据到文件
save_credentials() {
    local password=$1
    local username="admin"
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
}

main() {
    echo -e "${BLUE}此脚本适用于：${NC}"
    echo "  - 你的项目已通过 Cloudflare Git 集成自动部署"
    echo "  - 但 PASSWORD secret 尚未设置"
    echo ""

    # 检查是否已登录 Wrangler
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

    # 生成随机密码
    echo -e "${BLUE}🎲 生成随机密码...${NC}"
    PASSWORD=$(generate_password)
    echo -e "${GREEN}✅ 已生成随机密码${NC}"
    echo ""

    # 保存凭据
    save_credentials "$PASSWORD"
    echo ""

    # 设置密码 secret
    echo -e "${BLUE}🔐 设置 PASSWORD secret...${NC}"
    if echo "$PASSWORD" | npx wrangler secret put PASSWORD; then
        echo -e "${GREEN}✅ PASSWORD secret 已设置${NC}"
    else
        echo -e "${RED}❌ 设置失败${NC}"
        echo -e "${YELLOW}请手动运行：${NC}"
        echo "  echo '$PASSWORD' | npx wrangler secret put PASSWORD"
        exit 1
    fi
    echo ""

    # 验证
    echo -e "${BLUE}🔍 验证 secret 设置...${NC}"
    if npx wrangler secret list 2>/dev/null | grep -q "PASSWORD"; then
        echo -e "${GREEN}✅ PASSWORD secret 已成功设置${NC}"
    else
        echo -e "${YELLOW}⚠️  无法验证，请检查 Cloudflare Dashboard${NC}"
    fi
    echo ""

    # 完成
    echo -e "${GREEN}=================================${NC}"
    echo -e "${GREEN}🎉 设置完成！${NC}"
    echo -e "${GREEN}=================================${NC}"
    echo ""
    echo -e "${BLUE}📋 登录信息：${NC}"
    echo -e "  管理员用户名: ${GREEN}admin${NC}"
    echo -e "  管理员密码: ${GREEN}$PASSWORD${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  凭据已保存到: .credentials.txt${NC}"
    echo ""
    echo -e "${BLUE}📝 下一步：${NC}"
    echo "  1. 访问你的 Worker URL"
    echo "  2. 使用上述凭据登录"
    echo "  3. 进入管理面板添加播放源"
    echo ""
    echo -e "${BLUE}💡 提示：${NC}"
    echo "  - Git 推送会自动触发 Cloudflare 部署"
    echo "  - PASSWORD secret 不会被覆盖，只需设置一次"
    echo "  - 建议首次登录后修改密码"
    echo ""
}

main
