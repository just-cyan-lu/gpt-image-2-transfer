import { useState, useRef, useEffect } from 'react'
import { Conversation } from '../types'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  collapsed: boolean
  theme: 'dark' | 'light'
  onSelect: (id: string) => void
  onNew: () => void
  onToggleCollapse: () => void
  onToggleTheme: () => void
  onOpenSettings: () => void
  onRename: (id: string, title: string) => void
  onDeleteConversation: (id: string) => void
}

function LogoIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2L10.5 6.5H13.5L11 9.5L12 13.5L8 11L4 13.5L5 9.5L2.5 6.5H5.5L8 2Z" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 10.667A1.333 1.333 0 0 1 12.667 12H4.667L2 14.667V3.333A1.333 1.333 0 0 1 3.333 2h9.334A1.333 1.333 0 0 1 14 3.333v7.334Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 12L6 8l4-4" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8A6 6 0 1 0 3.2 4.5" />
      <path d="M2 2v3h3" />
      <path d="M8 5v3.5l2 1.5" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l.8 9.5A.5.5 0 0 0 4.3 14h7.4a.5.5 0 0 0 .5-.5L13 4" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" />
    </svg>
  )
}

export default function Sidebar({ conversations, activeId, collapsed, onSelect, onNew, onToggleCollapse, onOpenSettings, onRename, onDeleteConversation }: Props) {
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const flyoutRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const startEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditingValue(conv.title)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  const commitEdit = (id: string) => {
    const trimmed = editingValue.trim()
    if (trimmed) onRename(id, trimmed)
    setEditingId(null)
  }

  useEffect(() => {
    if (!flyoutOpen) return
    function onClickOutside(e: MouseEvent) {
      if (
        flyoutRef.current && !flyoutRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setFlyoutOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [flyoutOpen])

  // Close flyout when expanding sidebar
  useEffect(() => {
    if (!collapsed) setFlyoutOpen(false)
  }, [collapsed])

  return (
    <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon"><LogoIcon /></div>
          <span className="logo-text">Chat</span>
        </div>
        <button className="collapse-btn" onClick={onToggleCollapse} title={collapsed ? '展开菜单' : '收起菜单'}>
          <ChevronLeftIcon />
        </button>
      </div>

      <button className="new-chat-btn" onClick={onNew} title={collapsed ? '新建对话' : undefined}>
        <PlusIcon />
        <span className="btn-text">新建对话</span>
      </button>

      {/* Expanded: label + list */}
      {!collapsed && <div className="conv-list-label">对话历史</div>}

      {!collapsed && (
        <div className="conv-list">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-item${activeId === conv.id ? ' active' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="conv-icon"><ChatIcon /></div>
              <div className="conv-info">
                {editingId === conv.id ? (
                  <input
                    ref={editInputRef}
                    className="conv-rename-input"
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={() => commitEdit(conv.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(conv.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="conv-title">{conv.title}</div>
                )}
                <div className="conv-preview">{conv.preview}</div>
              </div>
              <div className="conv-actions">
                <button
                  className="conv-action-btn"
                  title="重命名"
                  onClick={e => startEdit(conv, e)}
                >
                  <EditIcon />
                </button>
                <button
                  className="conv-action-btn conv-action-delete"
                  title="删除对话"
                  onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id) }}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsed: single history icon with flyout */}
      {collapsed && (
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <button
            ref={triggerRef}
            className="conv-collapsed-trigger"
            onClick={() => setFlyoutOpen(o => !o)}
            title="最近对话"
          >
            <HistoryIcon />
          </button>

          <div ref={flyoutRef} className={`conv-flyout${flyoutOpen ? ' open' : ''}`}>
            <div className="conv-flyout-title">最近对话</div>
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conv-flyout-item${activeId === conv.id ? ' active' : ''}`}
                onClick={() => { onSelect(conv.id); setFlyoutOpen(false) }}
              >
                <ChatIcon />
                <span>{conv.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <button className="footer-btn" onClick={onOpenSettings} title={collapsed ? '设置' : undefined}>
          <SettingsIcon />
          <span>设置</span>
        </button>
        <button className="footer-btn" title={collapsed ? '账户' : undefined}>
          <UserIcon />
          <span>我的账户</span>
        </button>
      </div>
    </div>
  )
}
