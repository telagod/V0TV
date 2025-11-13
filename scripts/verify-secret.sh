#!/bin/bash

# V0TV Secret 验证脚本
# 用于验证 PASSWORD secret 是否已正确设置

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================="
echo "V0TV Secret 验证工具"
echo "================================="
echo ""

# 检查 Wrangler 登录状态
echo -e "${BLUE}🔍 检查 Wrangler 登录状态...${NC}"
if ! npx wrangler whoami &>/dev/null; then
    echo -e "${RED}❌ 未登录 Wrangler${NC}"
    echo -e "${YELLOW}请先运行: npx wrangler login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Wrangler 已登录${NC}"
echo ""

# 列出所有 secrets
echo -e "${BLUE}📋 当前所有 Secrets：${NC}"
npx wrangler secret list

echo ""

# 检查 PASSWORD secret
echo -e "${BLUE}🔍 检查 PASSWORD secret...${NC}"
if npx wrangler secret list 2>/dev/null | grep -q "PASSWORD"; then
    echo -e "${GREEN}✅ PASSWORD secret 已设置${NC}"
    echo ""
    echo -e "${BLUE}💡 提示：${NC}"
    echo "  - PASSWORD secret 已正确设置"
    echo "  - 在 Cloudflare Dashboard 中只会显示 'PASSWORD' 名称，不会显示密码明文"
    echo "  - 这是正常的安全设计"
    echo ""
    echo -e "${BLUE}📝 下一步：${NC}"
    echo "  1. 访问你的 Worker URL"
    echo "  2. 使用 .credentials.txt 中的凭据登录"
    echo "  3. 如果忘记密码，查看 .credentials.txt 文件"
    echo ""
else
    echo -e "${RED}❌ PASSWORD secret 未设置${NC}"
    echo ""
    echo -e "${YELLOW}🔧 如何手动设置：${NC}"
    echo "  1. 查看 .credentials.txt 获取密码"
    echo "  2. 运行以下命令："
    echo "     npx wrangler secret put PASSWORD"
    echo "  3. 输入密码并回车"
    echo ""
    echo -e "${YELLOW}或者重新运行自动部署脚本：${NC}"
    echo "  bash scripts/auto-deploy.sh"
    echo ""
    exit 1
fi
