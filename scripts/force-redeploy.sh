#!/bin/bash

# 强制重新部署到 Cloudflare Workers
# 适用于 Git 自动部署失败或需要清理缓存的情况

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================="
echo "V0TV - 强制重新部署到 Cloudflare"
echo "================================="
echo ""

echo -e "${YELLOW}⚠️  此脚本会清理本地构建缓存并强制重新部署${NC}"
echo -e "${YELLOW}⚠️  适用于 Git 自动部署失败的情况${NC}"
echo ""
read -p "是否继续？(y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi
echo ""

# 检查 Wrangler 登录状态
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

# 清理本地构建缓存
echo -e "${BLUE}🧹 清理本地构建缓存...${NC}"
rm -rf .next .open-next
echo -e "${GREEN}✅ 缓存已清理${NC}"
echo ""

# 构建项目
echo -e "${BLUE}🔨 构建 Next.js 项目...${NC}"
if pnpm build; then
    echo -e "${GREEN}✅ Next.js 构建成功${NC}"
else
    echo -e "${RED}❌ Next.js 构建失败${NC}"
    exit 1
fi
echo ""

# 构建 OpenNext
echo -e "${BLUE}📦 构建 OpenNext Worker...${NC}"
if pnpm run cloudflare:build; then
    echo -e "${GREEN}✅ OpenNext 构建成功${NC}"
else
    echo -e "${RED}❌ OpenNext 构建失败${NC}"
    exit 1
fi
echo ""

# 部署到 Cloudflare
echo -e "${BLUE}🚀 部署到 Cloudflare Workers...${NC}"
if npx wrangler deploy; then
    echo -e "${GREEN}✅ 部署成功${NC}"
else
    echo -e "${RED}❌ 部署失败${NC}"
    exit 1
fi
echo ""

# 完成
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}🎉 强制重新部署完成！${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}📝 下一步：${NC}"
echo "  1. 访问你的 Worker URL"
echo "  2. 使用 Ctrl+Shift+R 强制刷新浏览器缓存"
echo "  3. 测试主页和 API 路由是否正常"
echo ""
echo -e "${BLUE}💡 提示：${NC}"
echo "  - 如果仍有问题，请查看 Cloudflare Dashboard 的实时日志"
echo "  - Workers & Pages → v0tv → Logs"
echo ""
