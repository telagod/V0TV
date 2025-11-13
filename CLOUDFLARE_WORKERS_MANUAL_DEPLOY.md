# Cloudflare Workers 手动部署指南

## 1. 禁用 Cloudflare Dashboard 自动部署

### 步骤：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** 部分
3. 选择项目 **v0tv**
4. 进入 **Settings** (设置) 标签
5. 找到 **Builds & deployments** 部分
6. **禁用 Git 集成**或**禁用 Automatic deployments**

### 或者删除 Git 集成：

1. 在 Settings 中找到 **Source** 部分
2. 点击 **Disconnect** 断开 GitHub 连接
3. 这样就不会再自动触发构建了

---

## 2. 本地手动部署 Workers

### 前提条件：

确保已配置 Cloudflare 认证：

```bash
# 登录 Cloudflare
npx wrangler login
```

### 部署步骤：

```bash
# 1. 构建项目（生成 .open-next/worker.js）
pnpm run pages:build

# 2. 部署到 Cloudflare Workers
npx wrangler deploy
```

---

## 3. 问题排查

### 错误：找不到 .open-next/worker.js

**原因：** 使用了 `pnpm run build` 而不是 `pnpm run pages:build`

**解决：** 必须使用 `pnpm run pages:build` 才能生成 Workers 所需的文件

### package.json 中的命令说明：

- `pnpm run build` - 标准 Next.js 构建（不生成 worker.js）
- `pnpm run pages:build` - OpenNext Cloudflare 构建（生成 worker.js）

---

## 4. 当前部署配置

### wrangler.jsonc：

```jsonc
{
  "name": "v0tv",
  "main": ".open-next/worker.js",  // Workers 入口文件
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"  // OpenNext 要求
  ],
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "v0tv"
    }
  ]
}
```

### 环境变量：

需要在 Cloudflare Dashboard 中配置以下环境变量：

- `REDIS_URL` - Redis 连接 URL（如果使用 Redis）
- `KVROCKS_URL` - Kvrocks 连接 URL（如果使用 Kvrocks）
- 其他环境变量根据 `.env.example` 配置

---

## 5. GitHub Actions 手动部署（可选）

如果想通过 GitHub Actions 手动部署，可以使用以下工作流：

创建 `.github/workflows/deploy-workers.yml`：

```yaml
name: 手动部署到 Cloudflare Workers

on:
  workflow_dispatch:  # 仅手动触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 构建 Workers
        run: pnpm run pages:build

      - name: 部署到 Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

这样就可以在 GitHub Actions 页面手动点击运行部署了。
