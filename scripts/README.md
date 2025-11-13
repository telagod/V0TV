# 一键自动部署脚本

使用此脚本可以**自动生成随机密码**并**一键部署**到 Cloudflare Workers，无需手动配置任何环境变量。

## 🚀 使用方法

```bash
bash scripts/auto-deploy.sh
```

就这么简单！

## ✨ 功能特性

- ✅ **自动生成 32 位随机密码**
- ✅ **自动配置所有环境变量**
- ✅ **自动创建 D1 数据库**
- ✅ **自动初始化数据库表**
- ✅ **保存登录凭据到本地文件**

## 📋 脚本执行流程

1. **生成随机密码**
   - 使用 OpenSSL 生成 32 字符的安全随机密码
   - 默认管理员用户名：`admin`

2. **保存凭据**
   - 凭据保存到 `.credentials.txt`
   - 此文件已加入 `.gitignore`，不会被提交到 Git

3. **检查登录状态**
   - 自动检测 Wrangler 登录状态
   - 未登录时自动启动浏览器登录

4. **构建项目**
   - 执行 `pnpm run pages:build`
   - 编译 Next.js 应用为 Cloudflare Workers 格式

5. **设置密码 Secret**
   - 使用 `wrangler secret put` 设置 PASSWORD
   - 非交互式自动设置

6. **验证 Secret 设置**
   - 使用 `wrangler secret list` 验证 PASSWORD 是否已设置
   - 失败时会提示手动设置方法

7. **部署到 Cloudflare**
   - 自动创建 D1 数据库（首次部署）
   - 部署 Worker 代码
   - 首次访问时自动初始化数据库表

## 🔍 验证部署

### 使用验证脚本

```bash
bash scripts/verify-secret.sh
```

这个脚本会：
- 检查 Wrangler 登录状态
- 列出所有已设置的 Secrets
- 验证 PASSWORD secret 是否存在
- 提供详细的故障排查建议

### 在 Cloudflare Dashboard 中查看

**重要：Secrets 和 Environment Variables 是分开显示的！**

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → 你的项目（v0tv）→ Settings → Variables
3. 你会看到两个部分：

   **Environment Variables（环境变量）**
   - `USERNAME`: admin（明文显示）
   - `NEXT_PUBLIC_STORAGE_TYPE`: d1（明文显示）
   - `NEXT_PUBLIC_ENABLE_REGISTER`: true（明文显示）

   **Secrets（加密变量）**
   - `PASSWORD`（只显示名称，不显示值）

**💡 这是正常的！** Secrets 不会显示明文值，这是 Cloudflare 的安全设计。

## 📝 部署后操作

脚本执行完成后会显示：

```
🎉 部署成功！

📋 部署信息：
  管理员用户名: admin
  管理员密码: AbCd1234EfGh5678...

⚠️  凭据已保存到: .credentials.txt
```

### 登录应用

1. 访问你的 Worker URL（例如：`https://v0tv.你的账号.workers.dev`）
2. 使用显示的用户名和密码登录
3. 进入**管理面板** → **播放源配置**
4. 添加你需要的播放源

### 修改密码（可选）

建议首次登录后修改密码：

1. 登录应用
2. 进入**用户设置**
3. 修改密码

## 🔐 凭据文件

凭据保存在：`.credentials.txt`

```
# V0TV 部署凭据
# ⚠️  请妥善保管此文件，包含敏感信息！

管理员用户名: admin
管理员密码: AbCd1234EfGh5678...

访问地址: https://v0tv.你的账号.workers.dev
```

**⚠️ 重要提示：**
- 请妥善保管此文件
- 不要分享给他人
- 此文件已添加到 `.gitignore`，不会被 Git 跟踪

## 🛠️ 手动部署

如果你想手动控制密码，可以使用传统方式：

```bash
# 1. 构建
pnpm run pages:build

# 2. 设置密码（交互式）
npx wrangler secret put PASSWORD

# 3. 部署
npx wrangler deploy
```

环境变量已在 `wrangler.jsonc` 中预配置：
- `USERNAME=admin`
- `NEXT_PUBLIC_STORAGE_TYPE=d1`
- `NEXT_PUBLIC_ENABLE_REGISTER=true`

## 🔄 更新部署

如果要更新已部署的应用：

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新部署（保留现有密码）
pnpm run pages:build && npx wrangler deploy
```

不需要重新设置密码，除非你想修改它。

## ❓ 常见问题

### Q: 如何查看我的密码？

**A**: 查看 `.credentials.txt` 文件。

### Q: 如何验证 PASSWORD secret 是否已设置？

**A**: 有两种方法：

**方法 1 - 使用验证脚本**（推荐）：
```bash
bash scripts/verify-secret.sh
```

**方法 2 - 手动检查**：
```bash
npx wrangler secret list
```

如果看到 `PASSWORD` 在列表中，说明已设置成功。

**方法 3 - Cloudflare Dashboard**：
1. 访问 Dashboard → Workers & Pages → v0tv → Settings → Variables
2. 在 "Secrets" 部分（不是 "Environment Variables"）查看
3. 应该能看到 `PASSWORD`（只显示名称，不显示值）

### Q: 为什么我在 Dashboard 只看到 3 个纯文本变量，没有看到 PASSWORD？

**A**: 这是正常的！PASSWORD 是 **Secret（加密变量）**，不是普通的 Environment Variable。

在 Cloudflare Dashboard 中：
- **Environment Variables 部分** 显示 3 个公开变量的明文：
  - USERNAME
  - NEXT_PUBLIC_STORAGE_TYPE
  - NEXT_PUBLIC_ENABLE_REGISTER

- **Secrets 部分** 显示 PASSWORD（只显示名称，不显示密码明文）

这是 Cloudflare 的安全设计，Secrets 永远不会显示明文值。

### Q: 如何确认 PASSWORD secret 真的生效了？

**A**: 最简单的方法是尝试登录：
1. 访问你的 Worker URL
2. 使用 `.credentials.txt` 中的用户名和密码登录
3. 如果能成功登录，说明 PASSWORD secret 已正确设置

### Q: 忘记密码怎么办？

**A**: 重新运行脚本并使用新密码部署：

```bash
bash scripts/auto-deploy.sh
```

### Q: 如何自定义用户名？

**A**: 编辑 `wrangler.jsonc` 中的 `vars.USERNAME` 字段，然后重新部署。

### Q: 密码安全吗？

**A**:
- 密码使用 OpenSSL 生成，32 字符随机字符串
- 使用 Cloudflare Secrets 存储（加密）
- 不会出现在 Git 历史或日志中

## 📚 相关文档

- [CLOUDFLARE_D1_AUTO_SETUP.md](../CLOUDFLARE_D1_AUTO_SETUP.md) - D1 自动配置详细说明
- [deploy/cloudflare/.env.example](../deploy/cloudflare/.env.example) - 环境变量参考

## 🆘 故障排查

### 脚本执行失败

1. **检查依赖**
   ```bash
   # 确保已安装 Node.js 和 pnpm
   node --version
   pnpm --version
   ```

2. **重新登录 Wrangler**
   ```bash
   npx wrangler logout
   npx wrangler login
   ```

3. **查看详细日志**
   - Dashboard → Workers & Pages → v0tv → Logs

### 部署成功但无法访问

- 等待 1-2 分钟让 Cloudflare 全球网络同步
- 检查 Worker URL 是否正确
- 查看浏览器控制台是否有错误

---

**享受你的自动化部署体验！** 🎉
