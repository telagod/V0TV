# V0TV 项目概览

## 项目简介
V0TV 是一个现代化的自托管影视聚合平台，基于 Next.js 14 构建，支持多源内容聚合、智能播放控制、跨设备数据同步等功能。

## 技术栈
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript 4.9.5
- **样式**: Tailwind CSS
- **播放器**: ArtPlayer + HLS.js
- **状态管理**: React Hooks
- **数据存储**: Redis / Upstash / Cloudflare D1 / LocalStorage
- **包管理器**: pnpm 10.12.4

## 项目结构
```
V0TV/
├── src/
│   ├── app/              # Next.js App Router 页面
│   │   ├── play/         # 播放页面（v0.8.0 重构）
│   │   ├── admin/        # 管理页面
│   │   ├── api/          # API 路由
│   │   ├── login/        # 登录页面
│   │   ├── search/       # 搜索页面
│   │   ├── settings/     # 设置页面
│   │   ├── config/       # 配置页面
│   │   ├── douban/       # 豆瓣相关
│   │   ├── tvbox/        # TVBox 相关
│   │   └── warning/      # 警告页面
│   ├── components/       # 全局组件
│   ├── lib/              # 工具库
│   ├── styles/           # 样式文件
│   └── middleware.ts     # 中间件
├── public/               # 静态资源
├── deploy/               # 部署配置
├── docs/                 # 文档
├── scripts/              # 脚本工具
└── config.json           # 视频源配置
```

## 核心功能
- 智能聚合搜索 - 多源影视内容聚合
- 高清播放 - 基于 ArtPlayer 和 HLS.js
- 智能跳过 - 自定义跳过片头片尾
- 断点续播 - 自动记录播放进度
- 收藏管理 - 收藏喜爱的影视
- 键盘快捷键 - 支持快捷键操作
- 响应式设计 - 完美适配多端
- 主题切换 - 浅色/深色主题
- 用户系统 - 支持多用户
- 多种存储 - 支持多种存储方式

## 部署方式
- Docker 单容器
- Docker + Redis
- Cloudflare Pages/Workers
- Vercel
- Railway
- VPS 服务器

## 开发命令
- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm lint` - 代码检查
- `pnpm typecheck` - 类型检查
- `pnpm format` - 代码格式化
- `pnpm pages:build` - 构建 Cloudflare Pages 版本

## TypeScript 配置
- 严格模式启用
- 模块系统: Node16
- 路径别名: @/* -> ./src/*, ~/* -> ./public/*
- 目标: ES5
- JSX: preserve

## 最新版本
v0.8.0 - 播放页面完全重构，代码减少 67%，性能大幅提升
