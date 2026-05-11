import { useRef, useState, useEffect, KeyboardEvent } from 'react'
import { ModelId, ImageAttachment } from '../types'

const MODELS: { id: ModelId; label: string }[] = [
  { id: 'gpt-image-2', label: 'GPT Image 2' },
  { id: 'gpt-5.5',     label: 'GPT 5.5' },
  { id: 'gpt-5.4',     label: 'GPT 5.4' },
  { id: 'gpt-5.4-mini',label: 'GPT 5.4 mini' },
]

interface SendPayload {
  text: string
  images: ImageAttachment[]
  model: ModelId
}

interface Props {
  onSend: (payload: SendPayload) => void
  disabled: boolean
  initialValue?: string
  onClearInitial?: () => void
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export type { SendPayload }

export default function ChatInput({ onSend, disabled, initialValue, onClearInitial }: Props) {
  const [value, setValue] = useState('')
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [model, setModel] = useState<ModelId>('gpt-5.5')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue)
      onClearInitial?.()
      textareaRef.current?.focus()
    }
  }, [initialValue, onClearInitial])

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if ((!trimmed && images.length === 0) || disabled) return
    onSend({ text: trimmed, images, model })
    setValue('')
    setImages([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // result is "data:image/png;base64,xxxx"
        const base64 = result.split(',')[1]
        setImages(prev => [...prev, { name: file.name, mimeType: file.type, base64 }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const canSend = (value.trim().length > 0 || images.length > 0) && !disabled

  return (
    <div className="chat-input-area">
      <div className="input-wrapper">
        {images.length > 0 && (
          <div className="image-preview-row">
            {images.map((img, idx) => (
              <div key={idx} className="image-preview-item">
                <img src={`data:${img.mimeType};base64,${img.base64}`} alt={img.name} />
                <button className="image-remove-btn" onClick={() => removeImage(idx)}>
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="发送消息..."
          value={value}
          onChange={e => { setValue(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <div className="input-toolbar">
          <button
            className="image-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="上传图片"
          >
            <ImageIcon />
            <span>图片</span>
          </button>
          <select
            className="model-select"
            value={model}
            onChange={e => setModel(e.target.value as ModelId)}
            disabled={disabled}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <div className="toolbar-spacer" />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!canSend}
          >
            <SendIcon />
            <span>发送</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <div className="input-footer">
        <kbd>Enter</kbd> 发送 · <kbd>Shift</kbd>+<kbd>Enter</kbd> 换行
      </div>
    </div>
  )
}
