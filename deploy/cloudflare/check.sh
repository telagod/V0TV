#!/bin/bash
# Cloudflare Pages 部署前检查脚本

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🔍 V0TV - Cloudflare 部署环境检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0
WARNINGS=0

# 检查必要工具
echo "📦 检查必要工具..."

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo "  ✅ Node.js: $NODE_VERSION"
else
    echo "  ❌ Node.js 未安装"
    ERRORS=$((ERRORS + 1))
fi

if command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION=$(pnpm -v)
    echo "  ✅ pnpm: $PNPM_VERSION"
else
    echo "  ⚠️  pnpm 未安装（运行: npm install -g pnpm）"
    WARNINGS=$((WARNINGS + 1))
fi

if command -v wrangler >/dev/null 2>&1; then
    WRANGLER_VERSION=$(wrangler --version)
    echo "  ✅ wrangler: $WRANGLER_VERSION"
else
    echo "  ⚠️  wrangler 未安装（运行: npm install -g wrangler）"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "📄 检查配置文件..."

# 检查配置文件
if [ -f "wrangler.toml" ]; then
    echo "  ✅ wrangler.toml 存在"
else
    echo "  ❌ wrangler.toml 不存在"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "package.json" ]; then
    echo "  ✅ package.json 存在"

    # 检查pages:build脚本
    if grep -q "pages:build" package.json; then
        echo "  ✅ pages:build 脚本已配置"
    else
        echo "  ❌ pages:build 脚本未配置"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ❌ package.json 不存在"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "config.json" ]; then
    echo "  ✅ config.json 存在"
else
    echo "  ⚠️  config.json 不存在（部署后需要配置视频源）"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f ".github/workflows/cloudflare-pages.yml" ]; then
    echo "  ✅ GitHub Actions 工作流已配置"
else
    echo "  ⚠️  GitHub Actions 工作流未配置"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "scripts/d1-init.sql" ]; then
    echo "  ✅ D1 初始化脚本存在"
else
    echo "  ⚠️  D1 初始化脚本不存在"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "🔐 检查 Cloudflare 认证..."

# 检查是否已登录
if wrangler whoami >/dev/null 2>&1; then
    WHOAMI=$(wrangler whoami 2>&1)
    echo "  ✅ 已登录 Cloudflare"
    echo "     $(echo "$WHOAMI" | head -n 2 | tail -n 1)"
else
    echo "  ⚠️  未登录 Cloudflare（运行: wrangler login）"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "   ✅ 所有检查通过！准备部署"
    echo ""
    echo "🚀 下一步："
    echo "   运行: ./deploy-cloudflare.sh"
    echo "   或: pnpm run pages:build && wrangler pages deploy .vercel/output/static"
elif [ $ERRORS -eq 0 ]; then
    echo "   ⚠️  发现 $WARNINGS 个警告，建议修复后再部署"
    echo ""
    echo "💡 你仍然可以尝试部署，但可能遇到问题"
else
    echo "   ❌ 发现 $ERRORS 个错误和 $WARNINGS 个警告"
    echo ""
    echo "❗ 请先修复错误再尝试部署"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $ERRORS
