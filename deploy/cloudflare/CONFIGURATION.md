# Cloudflare Workers 部署配置指南

本文档说明如何在 Cloudflare Dashboard 中正确配置 V0TV 项目。

## 📋 配置速查表

### Cloudflare Dashboard 构建配置

进入：**Workers & Pages** → 你的项目 → **Settings** → **Builds & deployments**

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Framework preset** | `Next.js` | 可选，Cloudflare 会自动检测 |
| **Build command** | `pnpm run pages:build` | ✅ 必填，不是 `pnpm run build` |
| **Build output directory** | `.vercel/output/static` | ✅ 必填，不是 `.next` |
| **Root directory** | `/` 或留空 | 项目根目录 |
| **Deploy command** | 留空或 `npx wrangler pages deploy` | ⚠️ Git 集成时留空；手动部署时使用 `wrangler pages deploy` |
| **Node version** | 自动检测 | Cloudflare 自动选择 |

### 环境变量配置

进入：**Workers & Pages** → 你的项目 → **Settings** → **Variables and Secrets**

#### 必需变量

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `PASSWORD` | `your-password-here` | 访问密码（必填） |

#### 可选变量

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `PNPM_VERSION` | `10.12.4` | 如果构建失败可尝试设置 |
| `USERNAME` | `admin` | 多用户模式管理员用户名 |
| `NEXT_PUBLIC_STORAGE_TYPE` | `d1` 或 `localStorage` | 存储类型 |
| `NEXT_PUBLIC_ENABLE_REGISTER` | `true` 或 `false` | 是否允许用户注册 |

---

## 🔧 详细配置步骤

### 1. 构建配置

#### 为什么用 `pages:build`？

`pages:build` 脚本会执行：
```bash
pnpm gen:runtime && pnpm gen:manifest && next build && npx @cloudflare/next-on-pages --experimental-minify
```

关键点：
- `next build` - 构建 Next.js 应用
- `@cloudflare/next-on-pages` - 将 Next.js 转换为 Cloudflare Workers 兼容格式
- 输出到 `.vercel/output/static` 目录

#### 常见错误

❌ **错误配置**：
```
Build command: pnpm run build
Build output directory: .next
Deploy command: npx wrangler deploy  ❌ 这是 Workers 命令，不是 Pages 命令！
```

✅ **正确配置**：
```
Build command: pnpm run pages:build
Build output directory: .vercel/output/static
Deploy command: 留空（Git 集成）或 npx wrangler pages deploy（手动部署）
```

**⚠️ 重要说明**：
- **错误**：`npx wrangler deploy` 会导致错误 "Workers-specific command in a Pages project"
- **正确**：使用 `wrangler pages deploy` 或留空让 Cloudflare 自动部署
- 虽然项目部署到 Workers 平台，但使用的是 Pages 部署方式

### 2. 环境变量配置

#### 配置步骤

1. 进入项目 **Settings** → **Variables and Secrets**
2. 选择 **Production** 标签页
3. 点击 **Add variable**
4. 输入变量名和值
5. 点击 **Deploy** 或 **Save**

#### 变量说明

**PASSWORD（必填）**
- 用于保护应用访问
- 用户访问时需要输入此密码
- 建议使用强密码

**USERNAME（可选）**
- 仅在多用户模式下需要
- 默认值：`admin`
- 管理员账号用户名

**NEXT_PUBLIC_STORAGE_TYPE（可选）**
- `localStorage` - 单用户模式（默认）
- `d1` - 多用户模式（需要配置 D1 数据库）

**NEXT_PUBLIC_ENABLE_REGISTER（可选）**
- `false` - 不允许注册（默认）
- `true` - 允许用户注册

### 3. 资源绑定配置（可选）

#### D1 数据库绑定

如果使用多用户模式，需要绑定 D1 数据库：

1. 进入项目 **Settings** → **Bindings**
2. 找到 **D1 database bindings**
3. 点击 **Add binding**
4. 配置：
   - **Variable name**: `DB`
   - **D1 database**: 选择你创建的数据库
5. 保存

#### KV 命名空间绑定

如果使用 KV 缓存，需要绑定 KV 命名空间：

1. 进入项目 **Settings** → **Bindings**
2. 找到 **KV namespace bindings**
3. 点击 **Add binding**
4. 配置：
   - **Variable name**: `KV`
   - **KV namespace**: 选择你创建的命名空间
5. 保存

---

## 🎯 不同场景的配置

### 场景 1：单用户模式（最简单）

**环境变量**：
```
PASSWORD=你的密码
```

**绑定**：无需配置

**说明**：所有数据存储在浏览器 localStorage，无需数据库。

---

### 场景 2：多用户模式（需要 D1 数据库）

**环境变量**：
```
PASSWORD=管理员密码
USERNAME=admin
NEXT_PUBLIC_STORAGE_TYPE=d1
NEXT_PUBLIC_ENABLE_REGISTER=false
```

**绑定**：
- D1 database: `DB` → `v0tv-db`

**说明**：数据存储在 D1 数据库，支持多用户登录。

---

### 场景 3：开放注册（允许用户自行注册）

**环境变量**：
```
PASSWORD=管理员密码
USERNAME=admin
NEXT_PUBLIC_STORAGE_TYPE=d1
NEXT_PUBLIC_ENABLE_REGISTER=true
```

**绑定**：
- D1 database: `DB` → `v0tv-db`

**说明**：用户可以自行注册账号，无需管理员创建。

---

## 🚨 常见问题

### Q: 修改配置后需要重新部署吗？

**A**:
- 修改 **构建配置**（Build command、Output directory）：需要重新部署
- 修改 **环境变量**：保存时会自动触发重新部署
- 修改 **绑定**：保存后立即生效，无需重新部署

### Q: 如何触发重新部署？

**A**:
1. 进入项目 **Deployments** 标签页
2. 点击最新部署旁的 **⋮**（更多选项）
3. 选择 **Retry deployment**

或者：
1. 推送新的代码到 GitHub
2. Cloudflare 会自动触发新的部署

### Q: 部署失败如何查看日志？

**A**:
1. 进入项目 **Deployments** 标签页
2. 点击失败的部署
3. 查看 **Build log** 获取构建日志
4. 查看 **Function log** 获取运行时日志

### Q: 如何验证配置是否正确？

**A**: 检查清单：
- [ ] Build command 是 `pnpm run pages:build`
- [ ] Build output directory 是 `.vercel/output/static`
- [ ] 已设置 `PASSWORD` 环境变量
- [ ] 如果用 D1，已绑定数据库且 Variable name 是 `DB`
- [ ] 保存配置后已触发重新部署

---

## 📚 相关文档

- [部署指南](README.md) - 完整的部署流程
- [故障排除](TROUBLESHOOTING.md) - 常见错误及解决方法
- [主文档](../../README.md) - 项目主页

---

## 💡 提示

1. **首次部署**建议使用单用户模式（只需配置 `PASSWORD`），等熟悉后再配置多用户模式
2. **环境变量修改**后会自动重新部署，等待 1-2 分钟即可生效
3. **构建配置错误**是最常见的部署失败原因，务必检查 Build command 和 Output directory
4. 如果遇到问题，查看 [故障排除文档](TROUBLESHOOTING.md) 或 [提交 Issue](https://github.com/telagod/V0TV/issues)
