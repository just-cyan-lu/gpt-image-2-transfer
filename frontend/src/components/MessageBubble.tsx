import { useState, useRef, KeyboardEvent } from 'react'
import { ImageAttachment, Message } from '../types'
import { SendPayload } from './ChatInput'

interface Props {
  message: Message
  onDelete: (id: string) => void
  onImageEdit: (payload: SendPayload) => void
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

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function ImageMeta({ size, quality }: { size?: string; quality?: string }) {
  if (!size && !quality) return null
  return (
    <div className="image-meta">
      {size && <span>{size}</span>}
      {quality && <span>{quality}</span>}
    </div>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function createSourceImageLoader(message: Message) {
  return async (): Promise<ImageAttachment | null> => {
    if (message.imageB64) {
      return {
        name: `${message.id}.png`,
        mimeType: 'image/png',
        base64: message.imageB64,
      }
    }

    if (!message.imageFile) return null

    const res = await fetch(`/api/images/${message.imageFile}`)
    if (!res.ok) throw new Error(`读取图片失败：${res.status}`)
    const blob = await res.blob()
    return {
      name: message.imageFile,
      mimeType: blob.type || 'image/png',
      base64: await blobToBase64(blob),
    }
  }
}

function InlineEditInput({ responseId, getSourceImage, onSend, onClose }: {
  responseId?: string
  getSourceImage?: () => Promise<ImageAttachment | null>
  onSend: (payload: SendPayload) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [size, setSize] = useState('auto')
  const [quality, setQuality] = useState('auto')
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setImages(prev => [...prev, { name: file.name, mimeType: file.type, base64 }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx))

  const canSend = !isPreparing && (text.trim().length > 0 || images.length > 0 || !!getSourceImage)

  const handleSend = async () => {
    if (!canSend) return
    setError('')
    setIsPreparing(true)
    try {
      const sourceImage = await getSourceImage?.()
      onSend({
        text: text.trim(),
        images,
        sourceImages: sourceImage ? [sourceImage] : undefined,
        size,
        quality,
        responseId,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取图片失败')
      setIsPreparing(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="inline-edit-wrap">
      <div className="inline-edit-inner">
        {images.length > 0 && (
          <div className="image-preview-row" style={{ marginBottom: 6 }}>
            {images.map((img, idx) => (
              <div key={idx} className="image-preview-item">
                <img src={`data:${img.mimeType};base64,${img.base64}`} alt={img.name} />
                <button className="image-remove-btn" onClick={() => removeImage(idx)}><CloseIcon /></button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="inline-edit-textarea"
          placeholder="描述修改内容..."
          value={text}
          autoFocus
          rows={1}
          onChange={e => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
        />
        {error && <div className="inline-edit-error">{error}</div>}
        <div className="inline-edit-toolbar">
          <select className="image-param-select" value={size} onChange={e => setSize(e.target.value)} title="图片大小">
            <option value="auto">自动</option>
            <option value="1024x1024">1024×1024</option>
            <option value="1536x1024">1536×1024</option>
            <option value="1024x1536">1024×1536</option>
            <option value="2048x2048">2048×2048</option>
            <option value="2048x1152">2048×1152</option>
            <option value="3840x2160">3840×2160</option>
            <option value="2160x3840">2160×3840</option>
          </select>
          <select className="image-param-select" value={quality} onChange={e => setQuality(e.target.value)} title="图片质量">
            <option value="auto">自动</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
          <button className="image-upload-btn" onClick={() => fileInputRef.current?.click()} title="上传参考图片">
            <ImageIcon /><span>参考图</span>
          </button>
          <div className="toolbar-spacer" />
          <button className="inline-edit-close-btn" onClick={onClose} disabled={isPreparing} title="取消"><CloseIcon /></button>
          <button className="send-btn" onClick={handleSend} disabled={!canSend} title="生成">
            <SendIcon /><span>生成</span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    </div>
  )
}

export default function MessageBubble({ message, onDelete, onImageEdit }: Props) {
  const isUser = message.role === 'user'
  const hasImage = !!(message.imageFile || message.imageB64)
  const [showInline, setShowInline] = useState(false)

  const handleImageClick = () => {
    if (!isUser && hasImage) setShowInline(v => !v)
  }

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
            <>
              <img
                className={`generated-image${hasImage ? ' clickable-image' : ''}`}
                src={`/api/images/${message.imageFile}`}
                alt="生成图片"
                onClick={handleImageClick}
                title="点击编辑"
              />
              <ImageMeta size={message.size} quality={message.quality} />
              {showInline && (
                <InlineEditInput
                  responseId={message.responseId}
                  getSourceImage={createSourceImageLoader(message)}
                  onSend={onImageEdit}
                  onClose={() => setShowInline(false)}
                />
              )}
            </>
          ) : message.imageB64 ? (
            <>
              <img
                className={`generated-image${hasImage ? ' clickable-image' : ''}`}
                src={`data:image/png;base64,${message.imageB64}`}
                alt="生成图片"
                onClick={handleImageClick}
                title="点击编辑"
              />
              <ImageMeta size={message.size} quality={message.quality} />
              {showInline && (
                <InlineEditInput
                  responseId={message.responseId}
                  getSourceImage={createSourceImageLoader(message)}
                  onSend={onImageEdit}
                  onClose={() => setShowInline(false)}
                />
              )}
            </>
          ) : (
            message.content
          )}
        </div>
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          <button className="msg-delete-btn" title="删除" onClick={() => onDelete(message.id)}>
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
