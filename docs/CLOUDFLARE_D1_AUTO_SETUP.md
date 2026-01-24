# Cloudflare Workers D1 自动配置指南

## 🎉 重大更新：完全自动化部署

**Wrangler 4.45.0+ 支持 D1 数据库自动创建！**

现在部署时会自动：

- ✅ 创建 D1 数据库
- ✅ 配置 database_id
- ✅ 初始化数据库表结构

**无需任何手动操作！**

---

## 快速部署步骤（仅需 2 步）

### 步骤 1: 在 Dashboard 配置环境变量

访问: **Workers & Pages → v0tv → Settings → Variables**

添加以下环境变量：

```bash
PASSWORD=your_password
NEXT_PUBLIC_STORAGE_TYPE=d1
USERNAME=admin
NEXT_PUBLIC_ENABLE_REGISTER=true
```

### 步骤 2: 构建并部署

```bash
pnpm run pages:build && npx wrangler deploy
```

**就这么简单！** 🚀

---

## 自动化流程说明

### 第一次部署时会发生什么？

1. **Wrangler 自动创建数据库**
   - 检测到 `wrangler.jsonc` 中的 D1 binding
   - 自动创建名为 `v0tv-db` 的 D1 数据库
   - 自动更新 `wrangler.jsonc`，填入 `database_id`

2. **Worker 自动初始化表结构**
   - 首次请求时，自动创建所有表（users, play_records, favorites 等）
   - 使用 `CREATE TABLE IF NOT EXISTS` 确保幂等性
   - 自动创建索引优化查询性能

3. **完成！**
   - 访问你的 Worker URL
   - 使用管理员账号登录（用户名：admin，密码：你设置的 PASSWORD）
   - 在管理面板中添加播放源

---

## 自动创建的表结构

| 表名             | 用途                   |
| ---------------- | ---------------------- |
| `users`          | 用户账号               |
| `play_records`   | 播放记录               |
| `favorites`      | 收藏                   |
| `search_history` | 搜索历史               |
| `skip_configs`   | 片头片尾跳过配置       |
| `user_settings`  | 用户设置               |
| `admin_configs`  | 管理员配置（播放源等） |

---

## 验证部署

### 1. 检查部署日志

部署完成后，查看 Worker 日志：

```
[D1] 开始自动初始化数据库...
[D1] 数据库初始化完成
```

### 2. 检查 wrangler.jsonc

部署后 `wrangler.jsonc` 会自动更新：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "v0tv-db",
    "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  // 自动填入
  }
]
```

### 3. 访问管理面板

- 打开你的 Worker URL
- 使用管理员账号登录
- 进入管理面板
- 添加播放源配置

---

## 技术细节

### Wrangler Auto-Provisioning

Wrangler 4.45.0+ 引入的新特性：

- **无需 database_id**：只需定义 `binding` 和 `database_name`
- **自动创建资源**：首次部署时自动创建 D1 数据库
- **自动更新配置**：创建后自动填入 `database_id`

### 数据库表自动初始化

代码位置：`src/lib/d1.db.ts`

- **单例模式**：全局只初始化一次
- **幂等性**：使用 `CREATE TABLE IF NOT EXISTS`
- **并发安全**：多个请求共享同一个初始化 Promise

---

## 与旧版本的区别

### 旧方式（Wrangler < 4.45.0）

```bash
# 1. 手动创建数据库
npx wrangler d1 create v0tv-db

# 2. 复制 database_id

# 3. 手动编辑 wrangler.jsonc
# "database_id": "粘贴你的ID"

# 4. 取消注释配置

# 5. 部署
pnpm run pages:build && npx wrangler deploy
```

### 新方式（Wrangler >= 4.45.0）✨

```bash
# 1. 配置环境变量（Dashboard）
# 2. 直接部署
pnpm run pages:build && npx wrangler deploy
```

---

## 常见问题

### Q: 需要手动创建数据库吗？

**A**: 不需要！Wrangler 4.45.0+ 会自动创建。

### Q: 需要运行 SQL 脚本吗？

**A**: 不需要！Worker 首次运行时会自动创建表结构。

### Q: 如何查看数据库内容？

**A**: 使用 Wrangler CLI：

```bash
# 查看表列表
npx wrangler d1 execute v0tv-db --command "SELECT name FROM sqlite_master WHERE type='table';"

# 查看用户表
npx wrangler d1 execute v0tv-db --command "SELECT * FROM users;"
```

### Q: 如何重置数据库？

**A**: 删除并重新部署：

```bash
# 1. 删除数据库
npx wrangler d1 delete v0tv-db

# 2. 从 wrangler.jsonc 删除 database_id
# 将这一行删除：
#   "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 3. 重新部署
pnpm run pages:build && npx wrangler deploy
```

### Q: 多个环境如何配置？

**A**: 使用环境变量区分：

```jsonc
{
  "env": {
    "production": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "v0tv-production",
        },
      ],
    },
    "staging": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "v0tv-staging",
        },
      ],
    },
  },
}
```

### Q: 如何备份数据？

**A**: 导出数据库：

```bash
# 导出所有表
npx wrangler d1 export v0tv-db --output backup.sql
```

---

## 故障排查

### 部署时提示认证错误

```bash
# 重新登录
npx wrangler logout
npx wrangler login
```

### 数据库初始化失败

检查 Worker 日志：

1. 访问 Dashboard → Workers & Pages → v0tv → Logs
2. 查找 `[D1]` 相关日志
3. 如有错误，检查 binding 名称是否为 `DB`（必须大写）

### 环境变量未生效

确认在 **Dashboard** 中配置，而不是本地 `.env` 文件：

- Workers & Pages → v0tv → Settings → **Variables and Secrets**

---

## 支持

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Wrangler 配置文档](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [项目 Issues](https://github.com/telagod/V0TV/issues)
