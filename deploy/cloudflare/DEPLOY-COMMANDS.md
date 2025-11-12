# Cloudflare Workers 部署命令说明

## 📌 重要区别

### Workers vs Pages 部署命令

虽然项目最终部署到 **Cloudflare Workers** 平台，但由于使用了 `@cloudflare/next-on-pages`，需要使用 **Pages 部署命令**：

| 场景 | 错误命令 ❌ | 正确命令 ✅ |
|------|-----------|-----------|
| 纯 Workers 项目 | - | `wrangler deploy` |
| Next.js + next-on-pages | `wrangler deploy` | `wrangler pages deploy` |

**错误示例**（会导致 "Workers-specific command in a Pages project"）：
```bash
npx wrangler deploy  # ❌ 错误！
```

**正确示例**：
```bash
npx wrangler pages deploy  # ✅ 正确！
```

---

## 🚀 部署方式

### 方式 1：Git 集成（推荐）

通过 GitHub 连接到 Cloudflare，**无需手动运行部署命令**。

#### Cloudflare Dashboard 配置

```
Build command: pnpm run pages:build
Build output directory: .vercel/output/static
Deploy command: 留空或删除
```

#### 工作流程

1. 推送代码到 GitHub
2. Cloudflare 自动触发构建
3. 运行 `pnpm run pages:build`
4. 自动部署到 Workers 平台

---

### 方式 2：命令行手动部署

使用 Wrangler CLI 手动构建和部署。

#### 完整流程

```bash
# 1. 构建项目
pnpm run pages:build

# 2. 部署到 Cloudflare
npx wrangler pages deploy .vercel/output/static --project-name=v0tv

# 或者简化为（如果 wrangler.toml 已配置）
npx wrangler pages deploy
```

#### wrangler.toml 配置

```toml
name = "v0tv"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".vercel/output/static"
```

---

### 方式 3：CI/CD（GitHub Actions）

在 GitHub Actions 中自动化部署。

#### 工作流配置

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 10.12.4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm run pages:build

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .vercel/output/static --project-name=v0tv
```

**关键点**：
- ✅ 使用 `pages deploy` 而不是 `deploy`
- ✅ 指定输出目录 `.vercel/output/static`
- ✅ 需要配置 Secrets：`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`

---

## 🔧 常见错误和解决方法

### 错误 1：Workers-specific command in a Pages project

**错误命令**：
```bash
npx wrangler deploy
```

**错误信息**：
```
✘ [ERROR] It looks like you've run a Workers-specific command in a Pages project.
For Pages, please run `wrangler pages deploy` instead.
```

**解决方法**：
```bash
# 使用 Pages 命令
npx wrangler pages deploy .vercel/output/static --project-name=v0tv
```

---

### 错误 2：输出目录不存在

**错误信息**：
```
Error: Could not find build output directory at .vercel/output/static
```

**原因**：
- 使用了 `pnpm run build` 而不是 `pnpm run pages:build`
- `build` 只生成 `.next` 目录
- `pages:build` 才会生成 `.vercel/output/static`

**解决方法**：
```bash
# 使用正确的构建命令
pnpm run pages:build
```

---

### 错误 3：项目名称不匹配

**错误信息**：
```
Error: Project "v0tv" not found
```

**解决方法**：
```bash
# 方法 1：创建新项目
wrangler pages create v0tv

# 方法 2：使用正确的项目名称
npx wrangler pages deploy .vercel/output/static --project-name=你的实际项目名
```

---

## 📋 部署命令速查表

### 本地开发

```bash
# 开发服务器
pnpm dev

# 本地预览（Workers 环境）
pnpm run pages:build && npx wrangler pages dev .vercel/output/static
```

### 部署

```bash
# 构建
pnpm run pages:build

# 部署（指定项目名）
npx wrangler pages deploy .vercel/output/static --project-name=v0tv

# 部署（使用 wrangler.toml 配置）
npx wrangler pages deploy

# 部署到特定分支
npx wrangler pages deploy .vercel/output/static --project-name=v0tv --branch=dev
```

### 管理

```bash
# 查看部署列表
npx wrangler pages deployments list

# 查看项目信息
npx wrangler pages project list

# 删除部署
npx wrangler pages deployment delete <deployment-id>
```

---

## 🔑 环境变量

### 设置环境变量（CLI）

```bash
# Production 环境
wrangler pages secret put PASSWORD
# 输入密码后回车

# Preview 环境
wrangler pages secret put PASSWORD --env=preview
```

### 批量设置（使用 .env 文件）

**注意**：Wrangler CLI 不支持自动读取 .env 文件，需要在 Dashboard 手动配置。

---

## 💡 最佳实践

1. **推荐使用 Git 集成**
   - 自动触发部署
   - 自动回滚支持
   - 部署历史记录
   - 无需本地 wrangler

2. **CI/CD 用于多环境**
   - Production 分支：自动部署
   - Development 分支：预览部署
   - PR：临时预览部署

3. **本地测试使用 wrangler pages dev**
   ```bash
   pnpm run pages:build && npx wrangler pages dev .vercel/output/static
   ```

4. **部署前检查**
   - ✅ 运行 `pnpm run pages:build` 成功
   - ✅ `.vercel/output/static` 目录存在
   - ✅ wrangler.toml 配置正确
   - ✅ 环境变量已配置

---

## 📚 相关文档

- [部署指南](README.md)
- [配置说明](CONFIGURATION.md)
- [故障排除](TROUBLESHOOTING.md)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Pages 部署](https://developers.cloudflare.com/pages/platform/direct-upload/)
