# 同步 Fork 仓库

如果你通过 Cloudflare 一键部署创建了 fork 仓库，当原仓库有更新时，你的 fork 不会自动同步。需要手动同步。

## 🔄 方式一：GitHub 网页同步（推荐）

### 步骤

1. **访问你的 fork 仓库**

   ```
   https://github.com/你的用户名/V0TV
   ```

   或者

   ```
   https://github.com/你的用户名/myv0tv
   ```

2. **查看是否有更新**

   在仓库页面顶部，如果看到类似这样的提示：

   ```
   This branch is X commits behind telagod:main
   ```

   说明原仓库有新的提交。

3. **点击同步按钮**

   点击提示右侧的 **"Sync fork"** 按钮，然后点击 **"Update branch"**

4. **等待同步完成**

   GitHub 会自动将原仓库的最新代码合并到你的 fork

5. **触发重新部署**

   同步完成后，Cloudflare 会自动检测到更新并重新部署

---

## 🖥️ 方式二：使用 GitHub CLI

### 前置要求

安装 [GitHub CLI](https://cli.github.com/)

### 步骤

```bash
# 1. 克隆你的 fork（如果还没有克隆）
gh repo clone 你的用户名/V0TV
cd V0TV

# 2. 添加原仓库为 upstream
git remote add upstream https://github.com/telagod/V0TV.git

# 3. 获取原仓库的最新代码
git fetch upstream

# 4. 合并原仓库的 main 分支
git checkout main
git merge upstream/main

# 5. 推送到你的 fork
git push origin main
```

---

## 💻 方式三：使用 Git 命令

### 步骤

```bash
# 1. 克隆你的 fork（如果还没有克隆）
git clone https://github.com/你的用户名/V0TV.git
cd V0TV

# 2. 添加原仓库为 upstream remote
git remote add upstream https://github.com/telagod/V0TV.git

# 3. 验证 remotes
git remote -v
# 应该看到：
# origin    https://github.com/你的用户名/V0TV.git (fetch)
# origin    https://github.com/你的用户名/V0TV.git (push)
# upstream  https://github.com/telagod/V0TV.git (fetch)
# upstream  https://github.com/telagod/V0TV.git (push)

# 4. 获取 upstream 的最新代码
git fetch upstream

# 5. 切换到 main 分支
git checkout main

# 6. 合并 upstream 的 main 分支
git merge upstream/main

# 7. 推送到你的 fork
git push origin main
```

---

## 🔄 定期同步

建议定期同步你的 fork，以获取最新的功能和修复：

### 快速同步脚本

创建一个同步脚本 `sync.sh`：

```bash
#!/bin/bash

echo "🔄 正在同步 fork..."

# 获取 upstream 最新代码
git fetch upstream

# 切换到 main 分支
git checkout main

# 合并 upstream 的 main 分支
git merge upstream/main

# 推送到 origin
git push origin main

echo "✅ 同步完成！"
```

使用方法：

```bash
chmod +x sync.sh
./sync.sh
```

---

## ⚠️ 注意事项

### 如果有冲突

如果你修改了原仓库中的文件，合并时可能会有冲突：

```bash
# 查看冲突文件
git status

# 解决冲突后
git add .
git commit -m "resolve conflicts"
git push origin main
```

### 如果想要完全覆盖

如果你没有做任何自定义修改，想要完全同步原仓库：

```bash
# ⚠️ 这会丢失你的所有本地修改！
git fetch upstream
git checkout main
git reset --hard upstream/main
git push origin main --force
```

---

## 🚀 同步后

同步完成后：

1. ✅ Cloudflare 会自动检测到更新
2. ✅ 自动触发重新部署
3. ✅ 使用最新代码构建
4. ✅ 修复之前的构建错误

可以在 Cloudflare Dashboard 中查看部署状态：

```
Workers & Pages → 你的项目 → Deployments
```

---

## 🤔 为什么需要同步？

- **获取最新功能** - 原仓库的新特性
- **获取 Bug 修复** - 修复已知问题
- **获取安全更新** - 重要的安全补丁
- **获取性能优化** - 代码改进和优化

建议每周检查一次是否有更新！

---

## 📚 相关文档

- [GitHub - 同步 Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
- [GitHub CLI 文档](https://cli.github.com/manual/)
- [Git Remote 管理](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes)

---

需要帮助？[提交 Issue](https://github.com/telagod/V0TV/issues)
