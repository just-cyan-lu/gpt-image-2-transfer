import { useEffect, useRef, useState } from 'react'
import { Message } from '../types'
import MessageBubble from './MessageBubble'

interface Props {
  messages: Message[]
  isGenerating: boolean
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onSuggestion: (text: string) => void
  onDeleteMessage: (id: string) => void
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function ImageGenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

const suggestions = [
  '一只在星空下奔跑的赛博朋克狐狸',
  '水彩风格的日本樱花街道',
  '未来城市的鸟瞰图，霓虹灯光',
  '极简主义风格的山脉剪影',
]

export default function ChatArea({ messages, isGenerating, theme, onToggleTheme, onSuggestion, onDeleteMessage }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  const handleScroll = () => {
    if (!listRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120)
  }

  return (
    <div className="chat-area">
      <div className="chat-topbar">
        <button className="icon-btn" onClick={onToggleTheme} title={theme === 'dark' ? '切换亮色' : '切换暗色'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <div className="message-list" ref={listRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><ImageGenIcon /></div>
            <h2>描述你想要的图片</h2>
            <p>输入提示词生成图片，或上传参考图进行编辑</p>
            <div className="empty-suggestions">
              {suggestions.map(s => (
                <button key={s} className="suggestion-chip" onClick={() => onSuggestion(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} onDelete={onDeleteMessage} />)}
            {isGenerating && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="message-row assistant">
                <div className="message-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <button
          className="scroll-bottom-btn"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          ↓
        </button>
      )}
    </div>
  )
}
