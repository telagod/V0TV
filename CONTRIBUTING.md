# 贡献指南

感谢你考虑为 V0TV 做出贡献！我们欢迎任何形式的贡献。

## 🚀 快速开始

### 1. Fork 并克隆仓库

```bash
# Fork 仓库到你的账号
# 然后克隆你的 fork
git clone https://github.com/你的用户名/V0TV.git
cd V0TV
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000`

## 📝 开发流程

### 创建功能分支

```bash
git checkout -b feature/你的功能名称
# 或
git checkout -b fix/你的修复名称
```

### 提交代码

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
git commit -m "feat: 添加新功能"
git commit -m "fix: 修复某个bug"
git commit -m "docs: 更新文档"
```

**提交类型**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建或依赖更新
- `ci`: CI/CD 更新
- `chore`: 其他杂项

### 推送并创建 PR

```bash
git push origin feature/你的功能名称
```

然后在 GitHub 上创建 Pull Request。

## ✅ 代码质量

### 必须通过的检查

每次提交会自动运行以下检查：

1. **ESLint 检查** - 不能有错误
2. **TypeScript 类型检查** - 不能有类型错误
3. **Prettier 格式检查** - 代码格式必须正确
4. **构建检查** - 项目必须能成功构建

### 本地运行检查

```bash
# 运行所有检查
pnpm run lint && pnpm run typecheck && pnpm run format:check

# ESLint 检查
pnpm run lint

# TypeScript 检查
pnpm run typecheck

# 格式检查
pnpm run format:check

# 构建检查
pnpm run build
```

### 自动修复

```bash
# 自动修复 ESLint 问题
pnpm run lint:fix

# 自动格式化代码
pnpm run format
```

详细信息请查看 [代码质量文档](docs/code-quality.md)。

## 🎯 代码规范

### TypeScript

- 优先使用 TypeScript，避免使用 `any`
- 为函数参数和返回值添加类型
- 使用接口定义数据结构

### React

- 优先使用函数组件和 Hooks
- 组件文件名使用 PascalCase（如 `VideoPlayer.tsx`）
- 提取可复用的逻辑到自定义 Hooks

### 代码风格

- 使用 Prettier 格式化代码
- 遵循 ESLint 规则
- 添加必要的注释
- 保持代码简洁易读

### 文件组织

```
src/
├── app/              # Next.js App Router 页面
│   ├── page.tsx      # 页面组件
│   └── api/          # API 路由
├── components/       # 全局组件
├── lib/              # 工具库和帮助函数
├── hooks/            # 自定义 Hooks
└── types/            # TypeScript 类型定义
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch
```

### 添加测试

为新功能和修复添加相应的测试。

## 📖 文档

### 更新文档

如果你的更改影响用户使用或开发流程：

1. 更新相关的 Markdown 文档
2. 更新代码注释
3. 更新 README 和部署指南（如有需要）

### 文档位置

- `README.md` - 项目主文档
- `docs/` - 详细文档
- `deploy/` - 部署指南

## 🐛 报告问题

### 提交 Issue

在 [Issues](https://github.com/telagod/V0TV/issues) 页面创建新 Issue：

1. 使用清晰的标题
2. 详细描述问题
3. 提供复现步骤
4. 附上截图（如适用）
5. 说明环境信息（操作系统、浏览器等）

### Issue 标签

- `bug` - 错误报告
- `enhancement` - 功能请求
- `documentation` - 文档相关
- `good first issue` - 适合新手
- `help wanted` - 需要帮助

## 💡 功能建议

我们欢迎新功能建议！请：

1. 先查看现有 Issues 避免重复
2. 创建新 Issue 描述你的想法
3. 说明为什么需要这个功能
4. 讨论实现方案

## 🤝 Pull Request 规范

### PR 标题

使用 Conventional Commits 格式：

```
feat: 添加用户登录功能
fix: 修复播放器暂停问题
docs: 更新部署文档
```

### PR 描述

清晰描述你的更改：

```markdown
## 更改内容

简要描述你的更改

## 相关 Issue

关闭 #123

## 测试

- [ ] 本地测试通过
- [ ] 代码质量检查通过
- [ ] 添加了必要的测试

## 截图

（如适用）
```

### PR 检查清单

提交 PR 前确保：

- [ ] 代码遵循项目规范
- [ ] 通过所有自动检查
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] PR 标题符合规范
- [ ] 提交信息清晰明了

## 🌟 成为贡献者

贡献被合并后，你将：

1. 出现在贡献者列表中
2. 获得项目徽章
3. 被添加到 README 的致谢部分

## 📞 联系方式

有问题？欢迎：

- [创建 Issue](https://github.com/telagod/V0TV/issues)
- [参与讨论](https://github.com/telagod/V0TV/discussions)

---

再次感谢你的贡献！❤️
