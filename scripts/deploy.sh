#!/bin/bash

set -e

echo "🚀 开始部署 V0TV Worker..."

# 在受限环境（CI/沙盒）下，避免 Wrangler 写入 $HOME/.config 导致权限错误
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$PWD/.wrangler/tmp}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$PWD/.wrangler/tmp}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-$PWD/.wrangler/tmp}"

# 1. 生成密码（如果不存在）
echo "📝 检查密码文件..."
pnpm run gen:password

# 2. 构建项目
echo "🔨 构建项目..."
pnpm run pages:build

# 3. 读取密码
PASSWORD=$(grep "Password:" PASSWORD.txt | awk '{print $2}')

if [ -z "$PASSWORD" ]; then
  echo "❌ 错误：无法读取密码"
  exit 1
fi

echo "🔑 密码已读取"

# 4. 设置 Worker secret
echo "🔐 设置 Worker PASSWORD secret..."
echo "$PASSWORD" | wrangler secret put PASSWORD || {
  echo "⚠️  警告：无法通过 wrangler secret 设置密码（可能是网络问题）"
  echo "💡 请手动在 Cloudflare Dashboard 中设置 PASSWORD 环境变量"
  echo "   Workers & Pages > v0tv > Settings > Variables"
  echo "   PASSWORD = $PASSWORD"
}

# 5. 部署
echo "📦 部署到 Cloudflare Workers..."
wrangler deploy

echo ""
echo "✅ 部署完成！"
echo "🔗 URL: https://v0tv.cf1000-e31.workers.dev"
echo "👤 用户名: admin"
echo "🔑 密码: $PASSWORD"
echo ""
echo "💾 密码已保存在 PASSWORD.txt 文件中"
