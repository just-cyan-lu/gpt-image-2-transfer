import { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import ChatInput, { SendPayload } from './components/ChatInput'
import ApiSettings from './components/ApiSettings'
import { Conversation, Message } from './types'
import { streamChat, generateImage, fetchConversations, fetchMessages, saveConversation, saveMessage, apiRenameConversation, apiDeleteConversation, apiDeleteMessage } from './api'
import './index.css'

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    return 'light'
  })
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const activeConv = conversations.find(c => c.id === activeId) ?? null

  // 启动时加载对话列表
  useEffect(() => {
    fetchConversations().then(convs => {
      setConversations(convs)
      if (convs.length > 0) setActiveId(convs[0].id)
    })
  }, [])

  // 切换对话时懒加载消息
  useEffect(() => {
    if (!activeId) return
    const conv = conversations.find(c => c.id === activeId)
    if (!conv || conv.messages.length > 0) return
    fetchMessages(activeId).then(msgs => {
      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, messages: msgs } : c))
    })
  }, [activeId])

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

  const handleSend = useCallback(async ({ text, images, model }: SendPayload) => {
    let currentActiveId = activeId

    if (!currentActiveId) {
      const id = genId()
      const title = text.slice(0, 20) || '新建对话'
      const newConv: Conversation = {
        id,
        title,
        preview: '',
        messages: [],
        updatedAt: new Date(),
      }
      setConversations(prev => [newConv, ...prev])
      setActiveId(id)
      currentActiveId = id
      await saveConversation(newConv)
    }

    const userMsg: Message = {
      id: genId(),
      role: 'user',
      content: text,
      images: images.length > 0 ? images : undefined,
      model,
      timestamp: new Date(),
    }

    let updatedConv: Conversation | null = null
    let currentHistory: Message[] = []
    setConversations(prev => prev.map(c => {
      if (c.id !== currentActiveId) return c
      const messages = [...c.messages, userMsg]
      currentHistory = c.messages
      const preview = text || (images.length > 0 ? `[图片 ×${images.length}]` : '')
      updatedConv = {
        ...c,
        messages,
        preview: preview.slice(0, 40) + (preview.length > 40 ? '...' : ''),
        title: c.title === '新建对话' ? (text.slice(0, 20) || '新建对话') : c.title,
        updatedAt: new Date(),
      }
      return updatedConv
    }))

    if (updatedConv) {
      await saveConversation(updatedConv)
      await saveMessage(currentActiveId, userMsg)
    }

    setIsTyping(true)
    abortRef.current = new AbortController()

    const aiMsgId = genId()

    const addAiMsg = async (content: string, imageB64?: string) => {
      const msg: Message = { id: aiMsgId, role: 'assistant', content, imageB64, timestamp: new Date() }
      setConversations(prev => prev.map(c =>
        c.id === currentActiveId ? { ...c, messages: [...c.messages, msg] } : c
      ))
      await saveMessage(currentActiveId!, msg)
      // 保存后用 imageFile 替换内存中的 imageB64，释放大 base64
      if (imageB64) {
        const imageFile = `${aiMsgId}.png`
        setConversations(prev => prev.map(c =>
          c.id === currentActiveId ? {
            ...c,
            messages: c.messages.map(m =>
              m.id === aiMsgId ? { ...m, imageB64: undefined, imageFile } : m
            ),
          } : c
        ))
      }
    }

    try {
      if (model === 'gpt-image-2') {
        const b64 = await generateImage(text, images, abortRef.current.signal)
        await addAiMsg('', b64)
      } else {
        let added = false
        let finalContent = ''
        await streamChat(
          currentHistory,
          text,
          images,
          model,
          (delta) => {
            finalContent += delta
            if (!added) {
              added = true
              const msg: Message = { id: aiMsgId, role: 'assistant', content: delta, timestamp: new Date() }
              setConversations(prev => prev.map(c =>
                c.id === currentActiveId ? { ...c, messages: [...c.messages, msg] } : c
              ))
            } else {
              setConversations(prev => prev.map(c => {
                if (c.id !== currentActiveId) return c
                return {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === aiMsgId ? { ...m, content: m.content + delta } : m
                  ),
                }
              }))
            }
          },
          abortRef.current.signal,
        )
        // 流结束后保存完整内容
        const finalMsg: Message = { id: aiMsgId, role: 'assistant', content: finalContent, timestamp: new Date() }
        await saveMessage(currentActiveId!, finalMsg)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const errText = err instanceof Error ? err.message : String(err)
      await addAiMsg(`请求失败：${errText}`)
    } finally {
      setIsTyping(false)
      abortRef.current = null
    }
  }, [activeId])

  const handleSuggestion = useCallback((text: string) => {
    setSuggestionText(text)
  }, [])

  const handleRename = useCallback(async (id: string, title: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    await apiRenameConversation(id, title)
  }, [])

  const handleDeleteConversation = useCallback(async (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) {
      setConversations(prev => {
        const remaining = prev.filter(c => c.id !== id)
        setActiveId(remaining.length > 0 ? remaining[0].id : null)
        return remaining
      })
    }
    await apiDeleteConversation(id)
  }, [activeId])

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === activeId ? { ...c, messages: c.messages.filter(m => m.id !== msgId) } : c
    ))
    await apiDeleteMessage(msgId)
  }, [activeId])

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
        onOpenSettings={() => setShowSettings(true)}
        onRename={handleRename}
        onDeleteConversation={handleDeleteConversation}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <ChatArea
          messages={activeConv?.messages ?? []}
          isTyping={isTyping}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSuggestion={handleSuggestion}
          onDeleteMessage={handleDeleteMessage}
        />
        <ChatInput
          onSend={handleSend}
          disabled={isTyping}
          initialValue={suggestionText}
          onClearInitial={() => setSuggestionText('')}
        />
      </div>
      {showSettings && <ApiSettings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
