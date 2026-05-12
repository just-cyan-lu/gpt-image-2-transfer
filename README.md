# Chat - AI 聊天与图片生成应用

一个基于 React + Koa 的 ChatGPT 风格聊天应用，支持流式对话和图片生成功能。本项目是对 OpenAI API 中转站的封装，提供友好的 Web 界面和本地数据持久化。

![Demo](demo.png)

## 功能特性

- 💬 流式对话，仅支持openai
- 🎨 图片生成与编辑（GPT Image 2）
- 📝 对话历史本地持久化（SQLite）
- 🌓 深色/浅色主题切换
- 🔧 灵活的 API 配置（支持自定义中转站地址）
- 📱 响应式设计，支持移动端

## 快速开始

### 1. 安装依赖

```bash
npm install
npm run install
```

### 2. 配置 API

启动应用后，点击左下角的 **设置** 按钮，配置以下信息：

- **API 地址**：你的 OpenAI API 中转站地址（例如：`https://your-api-proxy.com`）
- **聊天 API Key**：用于聊天模型的 API 密钥
- **生图 API Key**：用于图片生成的 API 密钥（可与聊天 Key 相同）

> 💡 提示：本项目需要配合 OpenAI API 兼容的中转站使用，请确保你的中转站支持 `/v1/chat/completions` 和 `/v1/images/generations` 接口。

### 3. 启动应用

```bash
npm run dev
```

启动后访问：
- 前端：http://localhost:5566 （只访问这个就可以了）
- 后端：http://localhost:6677

## 项目结构

```
frontend/          # React + Vite + TypeScript 前端
backend/           # Koa3 + SQLite 后端
data/              # 运行时数据（自动创建）
  ├── chat.db      # SQLite 数据库
  ├── images/      # 生成的图片文件
  └── config.json  # API 配置
```

## 使用说明

### 创建对话

点击左上角的 **新建对话** 按钮，开始一个新的聊天会话。

### 发送消息

- 在底部输入框输入消息，按 **Enter** 发送
- 按 **Shift + Enter** 换行
- 支持 Markdown 格式渲染

### 图片生成

在输入框中描述你想要生成的图片，AI 会自动识别并调用图片生成功能。

### 管理对话

- **重命名**：鼠标悬停在对话上，点击编辑图标
- **删除**：鼠标悬停在对话上，点击删除图标
- **删除消息**：鼠标悬停在消息气泡上，点击删除按钮

## 技术栈

### 前端
- React 19
- TypeScript
- Vite
- CSS Variables（主题系统）

### 后端
- Koa 3
- better-sqlite3
- node-fetch

## 开发命令

```bash
npm run dev              # 并发启动前后端
npm run dev:frontend     # 仅启动前端
npm run dev:backend      # 仅启动后端
npm run install      # 安装所有依赖
```

## 注意事项

- 首次使用前必须在设置中配置 API 地址和密钥
- 生成的图片存储在 `data/images/` 目录，不会存入数据库
- 对话数据存储在本地 SQLite 数据库中
- 建议定期备份 `data/` 目录
- 全部都是vibe coding，人类看一眼代码就会爆炸

## License

MIT
