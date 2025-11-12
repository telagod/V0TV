# Cloudflare Workers 部署故障排除

## 常见问题

### 1. 部署失败：`wrangler: not found`

#### 错误信息
```
Executing user deploy command: npx wrangler deploy
sh: 1: wrangler: not found
Failed: error occurred while running deploy command
```

#### 原因
项目依赖中缺少 `wrangler` 包。

#### 解决方法

**方法 1：更新依赖（推荐）**

最新代码已经添加了 wrangler 依赖，拉取最新代码并重新安装：

```bash
git pull origin main
pnpm install
```

**方法 2：手动添加 wrangler**

如果是自己 fork 的仓库，在 `package.json` 的 `devDependencies` 中添加：

```json
{
  "devDependencies": {
    "wrangler": "^3.96.0"
  }
}
```

然后安装：
```bash
pnpm install
```

**方法 3：修改 Cloudflare Pages 配置**

在 Cloudflare Dashboard → Workers & Pages → 项目 → Settings → Builds：
- **Build command**: `pnpm install && pnpm run pages:build`
- **Build output directory**: `.vercel/output/static`

---

### 2. 如何配置 KV 缓存和 D1 数据库？

#### KV 命名空间配置（可选，用于缓存加速）

**方法 1：使用初始化脚本（推荐）**

```bash
# 运行自动配置脚本
bash scripts/init-cloudflare.sh
```

脚本会自动：
- 创建 KV 命名空间
- 更新 wrangler.toml 配置
- 初始化 D1 数据库（如选择）

**方法 2：手动创建**

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

**方法 1：使用初始化脚本（推荐）**

```bash
bash scripts/init-cloudflare.sh
```

**方法 2：手动创建**

```bash
# 1. 创建 D1 数据库
wrangler d1 create v0tv-db

# 2. 记录输出的 database_id

# 3. 初始化表结构
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

**配置环境变量**

在 Cloudflare Dashboard → Workers & Pages → 项目 → Settings → Variables 中添加：

```
NEXT_PUBLIC_STORAGE_TYPE=d1
```


---

### 3. 构建失败：`pnpm: not found`

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

### 4. 构建成功但访问 404

#### 可能原因
构建输出目录配置错误。

#### 解决方法

确认 **Build output directory** 设置为：
```
.vercel/output/static
```

**注意**：
- 路径开头没有 `/`
- 不是 `.next`
- 不是 `out`
- 必须是 `.vercel/output/static`

---

### 5. 访问提示需要密码但无法登录

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

### 6. D1 数据库连接失败

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

### 7. 自定义域名无法访问

#### 症状
- 默认域名（`*.pages.dev`）可以访问
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
目标: 你的项目名.pages.dev
TTL: 300 或 Auto
```

等待 DNS 生效（5-30 分钟）。

---

### 8. 构建超时

#### 错误信息
```
Build exceeded maximum time of 20 minutes
```

#### 解决方法

**方法 1：优化构建**
- 确保 `node_modules` 不在 Git 仓库中
- 使用 pnpm 的 frozen-lockfile

**方法 2：增加构建时间限制**
- Free 计划限制 20 分钟
- Pro 计划限制 30 分钟
- 考虑升级计划

**方法 3：使用缓存**
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

### 项目设置（Settings）

- [ ] **Build command**: `pnpm run pages:build`
- [ ] **Build output directory**: `.vercel/output/static`
- [ ] **Root directory**: `/` 或留空
- [ ] **Deploy command**: 留空或删除

### 环境变量（Variables）

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
- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Community](https://community.cloudflare.com/)

---

## 相关链接

- [Cloudflare Pages 部署指南](README.md)
- [项目主文档](../../README.md)
- [常见问题](../../docs/faq.md)
