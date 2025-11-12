# Cloudflare Workers 部署故障排除

## 常见问题

### 1. 部署失败：`Workers-specific command in a Pages project`

#### 错误信息
```
✘ [ERROR] It looks like you've run a Workers-specific command in a Pages project.
For Pages, please run `wrangler pages deploy` instead.
```

#### 原因
这个错误提示具有误导性。实际问题是 Cloudflare Dashboard 的构建配置不正确。

#### 解决方法

**访问项目设置并修正构建配置**：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击左侧菜单 **Workers & Pages**
3. 找到你的项目（例如：`V0TV`），点击进入
4. 点击顶部 **Settings** 标签页
5. 找到 **Builds & deployments** 部分

**正确配置**：

| 配置项 | 正确值 |
|--------|--------|
| **Build command** | `pnpm run pages:build` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | `/` 或留空 |

**重要说明**：
- ✅ 必须使用 `pnpm run pages:build` 而不是 `pnpm run build`
- ✅ `pages:build` 脚本会运行 `@cloudflare/next-on-pages` 将 Next.js 应用转换为 Workers 格式
- ✅ 输出目录必须是 `.vercel/output/static` 而不是 `.next`
- ⚠️ **Deploy command**：
  - Git 集成：留空，Cloudflare 自动部署
  - 手动部署：使用 `wrangler pages deploy` 而不是 `wrangler deploy`
  - **错误示例**：`npx wrangler deploy` 会导致此错误
  - **正确示例**：`npx wrangler pages deploy` 或留空

保存后点击 **Retry deployment**。

---

### 2. 部署失败：`wrangler: not found`

#### 错误信息
```
Executing user deploy command: npx wrangler deploy
sh: 1: wrangler: not found
Failed: error occurred while running deploy command
```

#### 原因
项目依赖中缺少 `wrangler` 包，或者设置了错误的 Deploy command。

#### 解决方法

**方法 1：检查 Deploy command（推荐）**

如果你在 Cloudflare Dashboard 设置了 Deploy command，请将其删除或留空。Cloudflare Workers 会自动处理部署，不需要手动运行 `wrangler deploy`。

**方法 2：确认 wrangler 依赖**

最新代码已经添加了 wrangler 依赖。如果你 fork 了仓库，确保 `package.json` 中包含：

```json
{
  "devDependencies": {
    "wrangler": "^3.96.0"
  }
}
```

然后重新安装：
```bash
pnpm install
```

---

### 3. 构建失败：输出目录错误

#### 症状
构建成功但访问显示 404 或白屏。

#### 原因
Build output directory 配置错误。

#### 解决方法

确认 **Build output directory** 设置为：
```
.vercel/output/static
```

**注意**：
- ✅ 路径开头没有 `/`
- ✅ 必须是 `.vercel/output/static`（由 `@cloudflare/next-on-pages` 生成）
- ❌ 不是 `.next`（这是 Next.js 原始输出）
- ❌ 不是 `out`（这是静态导出输出）

---

### 4. 如何配置 KV 缓存和 D1 数据库？

#### KV 命名空间配置（可选，用于缓存加速）

**手动创建**：

```bash
# 1. 创建 KV 命名空间
wrangler kv:namespace create v0tv-kv

# 2. 记录输出的 id，例如：
# id = "abc123def456"

# 3. 编辑 wrangler.toml，取消注释并填入 id
```

在 `wrangler.toml` 中：
```toml
[[kv_namespaces]]
binding = "KV"
id = "abc123def456"  # 替换为你的 KV ID
```

#### D1 数据库配置（可选，多用户模式需要）

**手动创建**：

```bash
# 1. 创建 D1 数据库
wrangler d1 create v0tv-db

# 2. 记录输出的 database_id

# 3. 初始化表结构（如有 SQL 文件）
wrangler d1 execute v0tv-db --file=scripts/d1-init.sql

# 4. 编辑 wrangler.toml
```

在 `wrangler.toml` 中：
```toml
[[d1_databases]]
binding = "DB"
database_name = "v0tv-db"
database_id = "your-database-id-here"  # 替换为你的 D1 ID
```

**配置环境变量**：

在 Cloudflare Dashboard → Workers & Pages → 项目 → Settings → Variables 中添加：

```
NEXT_PUBLIC_STORAGE_TYPE=d1
```

---

### 5. 构建失败：`pnpm: not found`

#### 错误信息
```
pnpm: command not found
```

#### 解决方法

在 Cloudflare Pages 项目设置中添加环境变量：

1. 进入项目设置 → **Variables and Secrets**
2. 在 **Production** 标签页添加：
   ```
   PNPM_VERSION=10.12.4
   ```
3. 保存后重新部署

---

### 6. 访问提示需要密码但无法登录

#### 原因
未配置 `PASSWORD` 环境变量。

#### 解决方法

1. 进入项目设置 → **Variables and Secrets**
2. 点击 **Add variable**
3. 添加：
   ```
   变量名: PASSWORD
   值: 你的密码
   ```
4. 点击 **Save and Deploy**
5. 等待重新部署完成（1-2 分钟）

---

### 7. D1 数据库连接失败

#### 错误信息
浏览器控制台显示数据库相关错误。

#### 解决方法

**步骤 1：确认 D1 绑定**

检查 `wrangler.toml` 文件中的配置：
```toml
[[d1_databases]]
binding = "DB"
database_name = "v0tv-db"
database_id = "你的数据库ID"
```

**步骤 2：在 Cloudflare 中绑定数据库**

1. 进入项目设置 → **Bindings**
2. 找到 **D1 database bindings**
3. 点击 **Add binding**
4. 配置：
   - Variable name: `DB`
   - D1 database: 选择你创建的数据库
5. 保存

**步骤 3：设置环境变量**

在 **Variables and Secrets** 中添加：
```
NEXT_PUBLIC_STORAGE_TYPE=d1
```

**步骤 4：初始化数据库表结构**

```bash
# 如果还没有创建数据库
wrangler d1 create v0tv-db

# 初始化表结构（如有 SQL 文件）
wrangler d1 execute v0tv-db --file=schema.sql
```

---

### 8. 自定义域名无法访问

#### 症状
- 默认域名（`*.workers.dev`）可以访问
- 自定义域名访问失败或显示 Cloudflare 错误页

#### 解决方法

**检查 DNS 配置**

1. 进入项目设置 → **Custom domains**
2. 查看自定义域名状态
3. 如果显示 "Pending"，需要：
   - 方式 A：如果域名 DNS 在 Cloudflare，点击 **Activate domain**
   - 方式 B：如果域名 DNS 在其他服务商，按提示添加 CNAME 记录

**添加 CNAME 记录示例**（DNS 不在 Cloudflare）：
```
类型: CNAME
名称: tv (或 @ 用于根域名)
目标: 你的项目名.你的账号.workers.dev
TTL: 300 或 Auto
```

等待 DNS 生效（5-30 分钟）。

---

### 9. 构建超时

#### 错误信息
```
Build exceeded maximum time of 20 minutes
```

#### 解决方法

**方法 1：优化构建**
- 确保 `node_modules` 不在 Git 仓库中
- 使用 pnpm 的 frozen-lockfile

**方法 2：使用缓存**

Cloudflare Pages 会自动缓存 `node_modules`，确保：
```json
{
  "packageManager": "pnpm@10.12.4"
}
```
在 `package.json` 中配置正确。

---

## 检查清单

部署前确认以下配置：

### 项目设置（Settings → Builds & deployments）

- [ ] **Build command**: `pnpm run pages:build`
- [ ] **Build output directory**: `.vercel/output/static`
- [ ] **Root directory**: `/` 或留空
- [ ] **Deploy command**: 留空或删除

### 环境变量（Variables and Secrets）

必需：
- [ ] `PASSWORD` - 访问密码

可选：
- [ ] `PNPM_VERSION=10.12.4` - 如果构建失败
- [ ] `USERNAME` - 多用户模式的管理员用户名
- [ ] `NEXT_PUBLIC_STORAGE_TYPE` - 存储类型（localStorage/d1）
- [ ] `NEXT_PUBLIC_ENABLE_REGISTER` - 是否允许注册

### 绑定（Bindings）

如使用 D1 数据库：
- [ ] D1 database binding: `DB` → 你的数据库

如使用 KV 缓存：
- [ ] KV namespace binding: `KV` → 你的命名空间

---

## 查看日志

如果问题仍未解决，查看详细日志：

1. 进入项目页面
2. 点击 **Deployments** 标签
3. 点击失败的部署
4. 查看 **Build log** 和 **Function log**
5. 复制错误信息到 GitHub Issues 寻求帮助

---

## 获取帮助

- [提交 Issue](https://github.com/telagod/V0TV/issues)
- [查看文档](../../docs/README.md)
- [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- [Cloudflare Community](https://community.cloudflare.com/)

---

## 相关链接

- [Cloudflare Workers 部署指南](README.md)
- [项目主文档](../../README.md)
