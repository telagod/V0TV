# 查看 Cloudflare Workers 实时日志

## 方法 1：通过 Dashboard（推荐）

1. 访问 https://dash.cloudflare.com/
2. **Workers & Pages** → **v0tv** → **Logs** 标签
3. 点击 **"Begin log stream"** 开始实时日志
4. 在另一个浏览器标签中访问你的网站
5. 查看日志中的错误信息

## 方法 2：使用 Wrangler CLI

```bash
# 查看实时日志
npx wrangler tail

# 过滤错误日志
npx wrangler tail --status error

# 过滤特定 API 路由
npx wrangler tail --search "/api/playrecords"
```

## 常见错误模式

### 1. `__name is not defined`

```
ReferenceError: __name is not defined
```

**解决方案**：已通过 `keep_names: false` 修复

### 2. FinalizationRegistry 错误

```
ReferenceError: FinalizationRegistry is not defined
```

**解决方案**：已通过 `compatibility_date: 2025-05-05` 修复

### 3. I/O Request 错误

```
Error: Cannot perform I/O on behalf of a different request
```

**解决方案**：需要修改数据库客户端代码，为每个请求创建新实例

### 4. Module Resolution 错误

```
Error: Could not resolve "module-name"
```

**解决方案**：设置环境变量：

```bash
export WRANGLER_BUILD_CONDITIONS=""
export WRANGLER_BUILD_PLATFORM="node"
```

## 调试步骤

1. **清除浏览器缓存**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **检查 Worker 版本**
   - Dashboard → Deployments
   - 确认最新 commit 已部署

3. **查看实时日志**
   - 根据错误类型应用对应修复

4. **检查 Wrangler 配置**
   - 确认 `wrangler.jsonc` 的配置正确

## 需要帮助？

如果看到日志中的错误，请复制完整的错误信息，包括：

- 错误类型
- 错误消息
- 堆栈跟踪（如果有）
- 触发错误的 URL/API 路由
