总是用中文回复

# Chat

ChatGPT 风格的聊天 UI，React + Vite + TypeScript，无后端，纯前端 mock 演示。

## 启动

```bash
npm install
npm run dev
```

## 项目结构

```
src/
  App.tsx              # 根组件，管理全局状态
  types.ts             # Message / Conversation 接口
  mockData.ts          # 初始 mock 对话数据
  index.css            # 全部样式（CSS 变量 + 组件样式）
  components/
    Sidebar.tsx        # 左侧对话列表，支持收起/展开
    ChatArea.tsx       # 消息列表 + 空状态 + 主题切换按钮
    ChatInput.tsx      # 输入框，Enter 发送，Shift+Enter 换行
    MessageBubble.tsx  # 单条消息，含轻量 Markdown 渲染
```

## 主题与样式

- 主色：`#00A4FC`（蓝）、`#FC7F00`（橙）
- 深色/浅色通过 `data-theme="light"` 切换 `html` 元素，CSS 变量自动响应
- 默认浅色主题，切换按钮在聊天区右上角
- **不要**在交互元素上使用渐变，统一用纯色 `var(--accent)`

## 布局要点

- 消息列表与输入框同宽：`.message-list` 和 `.chat-input-area` 都用 `padding: 0 24px`，内部容器 `max-width: 900px; margin: 0 auto`
- 消息行两端头像需与输入框左右边缘对齐：`.message-row` 不加额外横向 padding，`.message-row.user` 不设 `max-width` 或 `align-self`
- Sidebar 收起宽度 56px，展开 256px，CSS transition 动画
- 收起时对话列表折叠为单个图标，hover 弹出 flyout 面板
- 收起时展开按钮用 `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%)` 实现居中

## Markdown 渲染

`MessageBubble.tsx` 内置轻量渲染，支持：代码块（含语言标签）、表格、`# ## ###` 标题、无序/有序列表、`**bold**`、`*italic*`、`` `inline code` ``。不引入任何外部 Markdown 库。

## Mock 数据

`mockData.ts` 提供初始对话，`App.tsx` 中 `MOCK_REPLIES` 数组模拟 AI 回复，延迟 1.2–2s。
