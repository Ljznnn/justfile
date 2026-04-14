# JustFlile

一个高效、美观的文件处理工具集桌面应用。

## 功能特性

- 图片压缩 - 智能压缩图片，保持画质
- 图床上传 - 上传图片到 GitHub 仓库
- PDF 转 Word - PDF 文档转换为 Word
- 更多功能开发中...

## 项目结构

```
justflile/
├── desktop/    # Electron 桌面端
├── mobile/     # 移动端（预留）
└── backend/    # 云后端（预留）
```

## 快速开始

```bash
# 进入桌面端目录
cd desktop

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建应用
npm run build
```

## 技术栈

- Electron + Vue 3 + TypeScript
- Vite 构建
- Tailwind CSS + 毛玻璃样式
- Pinia 状态管理

## 配置

首次使用前，请在设置页面配置 API Key：

1. TinyPNG API Key - 用于图片压缩
2. GitHub Token - 用于图床上传
3. PDF.co API Key - 用于 PDF 转换