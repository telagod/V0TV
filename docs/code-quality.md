# 代码质量检查

本项目使用 GitHub Actions 进行自动化代码质量检查，确保代码质量和一致性。

## 🔍 检查项目

每次推送代码到 `main` 或 `develop` 分支，或创建 Pull Request 时，会自动运行以下检查：

### 1. ESLint 检查

检查代码是否符合 ESLint 规则。

```bash
pnpm run lint
```

**必须通过**：不能有任何错误（允许警告）

### 2. TypeScript 类型检查

检查 TypeScript 类型是否正确。

```bash
pnpm run typecheck
```

**必须通过**：不能有任何类型错误

### 3. Prettier 格式检查

检查代码格式是否符合 Prettier 规则。

```bash
pnpm run format:check
```

**必须通过**：所有文件必须格式正确

### 4. 构建检查

确保项目可以成功构建。

```bash
pnpm run build
```

**必须通过**：构建必须成功完成

## 🚀 本地运行检查

在推送代码前，建议在本地运行这些检查：

```bash
# 运行所有检查
pnpm run lint && pnpm run typecheck && pnpm run format:check && pnpm run build

# 或者逐个运行
pnpm run lint          # ESLint 检查
pnpm run typecheck     # TypeScript 检查
pnpm run format:check  # 格式检查
pnpm run build         # 构建检查
```

## 🔧 自动修复

某些问题可以自动修复：

```bash
# 自动修复 ESLint 问题
pnpm run lint:fix

# 自动格式化代码
pnpm run format
```

## 📋 Pull Request 检查

创建 Pull Request 时，还会额外检查：

- **PR 标题格式**：必须遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范

示例：

- ✅ `feat: 添加用户登录功能`
- ✅ `fix: 修复播放器暂停问题`
- ✅ `docs: 更新部署文档`
- ❌ `add login feature`（不符合格式）
- ❌ `修复bug`（缺少类型前缀）

允许的类型：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统或依赖更新
- `ci`: CI/CD 配置更新
- `chore`: 其他杂项
- `revert`: 回滚提交

## ⚠️ 如果检查失败

### ESLint 错误

查看错误信息，根据提示修复代码：

```bash
# 查看详细错误
pnpm run lint

# 自动修复（如果可以）
pnpm run lint:fix
```

### TypeScript 类型错误

查看类型错误信息，修复类型问题：

```bash
pnpm run typecheck
```

### 格式问题

自动格式化代码：

```bash
pnpm run format
```

### 构建失败

查看构建错误信息，解决依赖或代码问题：

```bash
pnpm run build
```

## 🎯 最佳实践

1. **提交前运行检查**：在 `git commit` 前运行 `pnpm run lint && pnpm run typecheck`
2. **使用 Git Hooks**：项目已配置 Husky，会在提交前自动运行检查
3. **及时修复警告**：虽然警告不会阻止提交，但建议及时修复
4. **保持代码格式**：使用 `pnpm run format` 格式化代码

## 📊 查看检查状态

在 GitHub 仓库页面可以看到检查状态：

- 徽章显示在 README 中
- Actions 页面显示详细日志
- PR 页面显示检查结果

---

有问题？查看 [贡献指南](CONTRIBUTING.md) 或 [提交 Issue](https://github.com/telagod/V0TV/issues)
