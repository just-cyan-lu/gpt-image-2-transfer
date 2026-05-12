总是用中文回复

# 生图工具

GPT Image 2 图片生成与编辑工具，React + Vite + TypeScript 前端，Koa3 + SQLite 后端。

## 启动

根目录一键启动前后端：

```bash
npm install          # 安装根目录依赖（concurrently）
npm run install:all  # 安装前后端依赖
npm run dev          # 并发启动后端（6677）和前端（5566）
```

也可以单独启动：

```bash
npm run dev:backend
npm run dev:frontend
```

## 项目结构

```
frontend/                        # React + Vite + TypeScript
  src/
    App.tsx                      # 根组件，管理全局状态，启动时从后端加载生图历史
    types.ts                     # Message / Conversation 接口
    api.ts                       # 所有后端请求（持久化 + 生图 AI）
    index.css                    # 全部样式（CSS 变量 + 组件样式）
    components/
      Sidebar.tsx                # 左侧生图历史列表，hover 显示编辑/删除按钮
      ChatArea.tsx               # 消息列表 + 空状态 + 主题切换
      ChatInput.tsx              # 输入框，支持提示词 + 参考图上传 + 尺寸/质量选择
      MessageBubble.tsx          # 单条消息，用户侧显示提示词，AI 侧显示生成图片
      ApiSettings.tsx            # API 设置弹窗

backend/
  src/
    index.js                     # Koa3 服务，所有路由
    db.js                        # better-sqlite3 数据库层

data/                            # 运行时自动创建，不进 git
  chat.db                        # SQLite 数据库
  images/                        # 生成图片存储目录，文件名为 <msgId>.png
  config.json                    # API 配置（baseUrl, imageKey）
```

## 后端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/conversations | 生图历史列表 |
| PUT | /api/conversations/:id | 创建/更新记录 |
| PATCH | /api/conversations/:id/rename | 重命名记录 |
| DELETE | /api/conversations/:id | 删除记录（级联删消息） |
| GET | /api/conversations/:id/messages | 获取消息列表 |
| PUT | /api/messages/:id | 保存消息（含图片时写文件） |
| DELETE | /api/messages/:id | 删除消息（含图片时删文件） |
| GET | /api/images/:filename | 读取生成图片 |
| GET | /api/config | 获取 API 配置 |
| POST | /api/config | 保存 API 配置 |
| POST | /api/image | 生图/编辑图代理 |

## 数据持久化

- 生图历史和消息存 SQLite，启动时自动建库建表
- 生成图片的 base64 **不存 DB**，写到 `data/images/<msgId>.png`，DB 只存文件名
- API 配置（baseUrl, imageKey）存 `data/config.json`，前端设置页面可修改
- `data/` 目录不存在时后端启动会自动创建（`mkdirSync recursive`）
- 前端切换历史时懒加载消息，生图完成后保存完整内容

## API 配置

- 设置页面配置：
  - **API 地址**：OpenAI 兼容的中转站地址
  - **生图 API Key**：用于 GPT Image 2 模型
- 配置保存在后端 `data/config.json`

## 主题与样式

- 主色：`#02ACD1`（蓝）、`#FF4C00`（橙）、`#B1FF62`（青）
- 深色/浅色通过 `data-theme="light"` 切换 `html` 元素，CSS 变量自动响应
- 默认浅色主题，切换按钮在聊天区右上角
- **不要**在交互元素上使用渐变，统一用纯色 `var(--accent)`

## 布局要点

- 消息列表与输入框同宽：`.message-list` 和 `.chat-input-area` 都用 `padding: 0 24px`，内部容器 `max-width: 900px; margin: 0 auto`
- 消息行两端头像需与输入框左右边缘对齐：`.message-row` 不加额外横向 padding
- Sidebar 收起宽度 56px，展开 256px，CSS transition 动画
- 收起时历史列表折叠为单个图标，hover 弹出 flyout 面板

## 部分名词定义
- 生图历史：左侧的历史记录列表
- 设置：左下方的设置按钮及其弹出页面
- 消息列表：右侧中部的消息列表（用户提示词 + 生成图片）
- 发送框：右侧底部的输入框
