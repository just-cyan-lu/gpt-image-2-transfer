import { Conversation } from './types'

const now = new Date()
const mins = (n: number) => new Date(now.getTime() - n * 60000)

export const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'React 性能优化',
    preview: '使用 useMemo 和 useCallback 避免不必要的重渲染...',
    updatedAt: mins(5),
    messages: [
      { id: '1-1', role: 'user', content: '如何优化 React 应用的性能？', timestamp: mins(10) },
      {
        id: '1-2', role: 'assistant', timestamp: mins(9),
        content: `React 性能优化有几个核心方向：

**1. 减少不必要的重渲染**
- \`useMemo\` — 缓存计算结果
- \`useCallback\` — 缓存函数引用
- \`React.memo\` — 对组件进行浅比较

**2. 代码分割**
\`\`\`tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'))
\`\`\`

**3. 虚拟列表**
处理大列表时使用 \`react-virtual\` 或 \`react-window\`，只渲染可视区域内的元素。

**4. 状态管理优化**
将频繁更新的状态下沉到更接近使用处的组件，避免顶层状态变化导致大范围重渲染。`,
      },
      { id: '1-3', role: 'user', content: 'useMemo 和 useCallback 具体什么时候用？', timestamp: mins(7) },
      {
        id: '1-4', role: 'assistant', timestamp: mins(6),
        content: `简单原则：**只在有明确性能问题时使用**，过早优化会增加代码复杂度。

**useMemo** — 缓存昂贵计算
\`\`\`tsx
const filtered = useMemo(
  () => list.filter(item => item.active),
  [list]
)
\`\`\`

**useCallback** — 稳定函数引用（通常配合 React.memo 使用）
\`\`\`tsx
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])
\`\`\`

两者的依赖数组是关键——依赖项不变时返回缓存值。`,
      },
    ],
  },
  {
    id: '2',
    title: 'TypeScript 类型体操',
    preview: '条件类型和 infer 关键字的使用场景...',
    updatedAt: mins(60),
    messages: [
      { id: '2-1', role: 'user', content: '解释一下 TypeScript 的 infer 关键字', timestamp: mins(65) },
      {
        id: '2-2', role: 'assistant', timestamp: mins(63),
        content: `\`infer\` 用在条件类型中，允许你从类型中**提取**子类型。

\`\`\`typescript
// 提取函数返回值类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = () => string
type Result = ReturnType<Fn> // string

// 提取 Promise 内部类型
type Awaited<T> = T extends Promise<infer V> ? V : T

type P = Awaited<Promise<number>> // number
\`\`\`

\`infer R\` 的意思是：在模式匹配成立时，推断并捕获该位置的类型，命名为 \`R\`。`,
      },
    ],
  },
  {
    id: '3',
    title: 'CSS Grid 布局技巧',
    preview: '用 grid-template-areas 实现复杂布局...',
    updatedAt: mins(180),
    messages: [
      { id: '3-1', role: 'user', content: 'CSS Grid 和 Flexbox 怎么选？', timestamp: mins(185) },
      {
        id: '3-2', role: 'assistant', timestamp: mins(183),
        content: `选择原则很清晰：

| | Flexbox | Grid |
|---|---|---|
| 维度 | 一维（行或列）| 二维（行和列）|
| 场景 | 导航栏、按钮组 | 页面整体布局 |
| 对齐 | 主轴对齐 | 精确定位到格子 |

**经验法则**：组件内部排列用 Flexbox，页面级布局用 Grid。两者可以嵌套混用。`,
      },
    ],
  },
  {
    id: '4',
    title: 'Node.js 异步编程',
    preview: '事件循环机制和 Promise 并发控制...',
    updatedAt: mins(1440),
    messages: [
      { id: '4-1', role: 'user', content: '解释 Node.js 事件循环', timestamp: mins(1445) },
      {
        id: '4-2', role: 'assistant', timestamp: mins(1443),
        content: `Node.js 事件循环分 6 个阶段，依次执行：

1. **timers** — 执行 \`setTimeout\` / \`setInterval\` 回调
2. **pending callbacks** — 系统操作回调（如 TCP 错误）
3. **idle/prepare** — 内部使用
4. **poll** — 获取新 I/O 事件（核心阶段）
5. **check** — \`setImmediate\` 回调
6. **close callbacks** — 关闭事件回调

\`process.nextTick\` 和 \`Promise.then\` 属于微任务，在每个阶段切换时优先执行。`,
      },
    ],
  },
  {
    id: '5',
    title: 'Docker 容器化部署',
    preview: '多阶段构建减小镜像体积的最佳实践...',
    updatedAt: mins(2880),
    messages: [
      { id: '5-1', role: 'user', content: 'Dockerfile 多阶段构建有什么好处？', timestamp: mins(2885) },
      {
        id: '5-2', role: 'assistant', timestamp: mins(2883),
        content: `多阶段构建的核心好处是**减小最终镜像体积**，只保留运行时需要的内容。

\`\`\`dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段（只复制产物）
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
\`\`\`

构建阶段的 node_modules、源码等都不会进入最终镜像，可以将镜像从 1GB+ 压缩到几十 MB。`,
      },
    ],
  },
]
