import { Message } from '../types'

interface Props {
  message: Message
  onDelete: (id: string) => void
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function ImageGenAvatarIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="14" height="14" rx="2" />
      <circle cx="5" cy="5.5" r="1.5" />
      <polyline points="15 10 11 6 3 14" />
    </svg>
  )
}

function UserAvatarIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M2.5 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" />
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

export default function MessageBubble({ message, onDelete }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`message-row ${message.role}`}>
      <div className="message-avatar">
        {isUser ? <UserAvatarIcon /> : <ImageGenAvatarIcon />}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {isUser ? (
            <>
              {message.images && message.images.length > 0 && (
                <div className="image-preview-row" style={{ marginBottom: message.content ? 8 : 0 }}>
                  {message.images.map((img, i) => (
                    <div key={i} className="image-preview-item" style={{ pointerEvents: 'none' }}>
                      <img src={`data:${img.mimeType};base64,${img.base64}`} alt={img.name} />
                    </div>
                  ))}
                </div>
              )}
              {message.content}
            </>
          ) : message.imageFile ? (
            <img className="generated-image" src={`/api/images/${message.imageFile}`} alt="生成图片" />
          ) : message.imageB64 ? (
            <img className="generated-image" src={`data:image/png;base64,${message.imageB64}`} alt="生成图片" />
          ) : (
            message.content
          )}
        </div>
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          <button
            className="msg-delete-btn"
            title="删除"
            onClick={() => onDelete(message.id)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
