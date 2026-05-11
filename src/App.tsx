import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import ChatInput from './components/ChatInput'
import { mockConversations } from './mockData'
import { Conversation, Message } from './types'
import './index.css'

const MOCK_REPLIES = [
  '这是个很好的问题。让我从几个角度来分析一下...',
  '根据你的描述，我建议可以这样处理：首先需要理解核心问题，然后逐步拆解解决方案。',
  '我理解你的需求。这里有一些最佳实践可以参考，同时需要注意一些常见的陷阱...',
  '从技术角度看，这个问题有多种解法。我推荐使用最简单且可维护的方案...',
  '好的，我来详细解释一下。这个概念涉及几个关键点，理解它们之后整体就很清晰了...',
]

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [activeId, setActiveId] = useState<string | null>(mockConversations[0].id)
  const [collapsed, setCollapsed] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')

  const activeConv = conversations.find(c => c.id === activeId) ?? null

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }, [])

  const handleNewChat = useCallback(() => {
    const id = genId()
    const newConv: Conversation = {
      id,
      title: '新建对话',
      preview: '开始新的对话...',
      messages: [],
      updatedAt: new Date(),
    }
    setConversations(prev => [newConv, ...prev])
    setActiveId(id)
  }, [])

  const handleSend = useCallback((text: string) => {
    if (!activeId) return

    const userMsg: Message = {
      id: genId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== activeId) return c
      const messages = [...c.messages, userMsg]
      return {
        ...c,
        messages,
        preview: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
        title: c.title === '新建对话' ? (text.slice(0, 20) || '新建对话') : c.title,
        updatedAt: new Date(),
      }
    }))

    setIsTyping(true)

    setTimeout(() => {
      const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
      const aiMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setConversations(prev => prev.map(c => {
        if (c.id !== activeId) return c
        return { ...c, messages: [...c.messages, aiMsg], updatedAt: new Date() }
      }))
      setIsTyping(false)
    }, 1200 + Math.random() * 800)
  }, [activeId])

  const handleSuggestion = useCallback((text: string) => {
    setSuggestionText(text)
  }, [])

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={collapsed}
        theme={theme}
        onSelect={setActiveId}
        onNew={handleNewChat}
        onToggleCollapse={() => setCollapsed(c => !c)}
        onToggleTheme={toggleTheme}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <ChatArea
          messages={activeConv?.messages ?? []}
          isTyping={isTyping}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSuggestion={handleSuggestion}
        />
        <ChatInput
          onSend={handleSend}
          disabled={isTyping || !activeId}
          initialValue={suggestionText}
          onClearInitial={() => setSuggestionText('')}
        />
      </div>
    </div>
  )
}
