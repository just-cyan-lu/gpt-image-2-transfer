import { useEffect, useRef, useState } from 'react'
import { Message } from '../types'
import MessageBubble from './MessageBubble'

interface Props {
  messages: Message[]
  isTyping: boolean
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onSuggestion: (text: string) => void
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

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M12 2a3 3 0 0 1 3 3v6H9V5a3 3 0 0 1 3-3z" />
      <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

const suggestions = [
  '解释量子计算的基本原理',
  '帮我写一个 Python 爬虫',
  'CSS 动画有哪些技巧？',
  '推荐几本关于系统设计的书',
]

export default function ChatArea({ messages, isTyping, theme, onToggleTheme, onSuggestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

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
            <div className="empty-icon"><BotIcon /></div>
            <h2>有什么我可以帮你的？</h2>
            <p>发送消息开始对话，或者从下面的建议中选择一个</p>
            <div className="empty-suggestions">
              {suggestions.map(s => (
                <button key={s} className="suggestion-chip" onClick={() => onSuggestion(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="message-row assistant">
                <div className="message-avatar">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}>
                    <rect x="2" y="6" width="12" height="8" rx="2" />
                    <path d="M5 6V5a3 3 0 0 1 6 0v1" />
                    <circle cx="5.5" cy="10" r="1" fill="currentColor" stroke="none" />
                    <circle cx="10.5" cy="10" r="1" fill="currentColor" stroke="none" />
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
