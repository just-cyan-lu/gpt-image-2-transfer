import { Message } from '../types'

interface Props {
  message: Message
  onDelete: (id: string) => void
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function BotAvatarIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="12" height="8" rx="2" />
      <path d="M5 6V5a3 3 0 0 1 6 0v1" />
      <circle cx="5.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10" r="1" fill="currentColor" stroke="none" />
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

function renderContent(text: string) {
  const lines = text.split('\n')
  const output: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      output.push(
        <div key={i} className="code-block">
          {lang && <div className="code-lang">{lang}</div>}
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      )
      i++
      continue
    }

    if (line.includes('|') && lines[i + 1]?.match(/^\|[\s\-|]+\|$/)) {
      const headers = line.split('|').filter(Boolean).map(h => h.trim())
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').filter(Boolean).map(c => c.trim()))
        i++
      }
      output.push(
        <table key={i} className="md-table">
          <thead><tr>{headers.map((h, j) => <th key={j}>{inlineRender(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inlineRender(c)}</td>)}</tr>)}</tbody>
        </table>
      )
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
      output.push(<Tag key={i} className={`md-h${level}`}>{inlineRender(headingMatch[2])}</Tag>)
      i++
      continue
    }

    if (line.match(/^[-*]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push(lines[i].replace(/^[-*]\s/, ''))
        i++
      }
      output.push(
        <ul key={i} className="md-ul">
          {items.map((item, j) => <li key={j}>{inlineRender(item)}</li>)}
        </ul>
      )
      continue
    }

    if (line.match(/^\d+\.\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      output.push(
        <ol key={i} className="md-ol">
          {items.map((item, j) => <li key={j}>{inlineRender(item)}</li>)}
        </ol>
      )
      continue
    }

    if (line.trim() === '') { i++; continue }

    output.push(<p key={i}>{inlineRender(line)}</p>)
    i++
  }

  return output
}

function inlineRender(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="inline-code">{part.slice(1, -1)}</code>
    return part
  })
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
        {isUser ? <UserAvatarIcon /> : <BotAvatarIcon />}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {isUser
            ? message.content
            : message.imageB64
              ? <img className="generated-image" src={`data:image/png;base64,${message.imageB64}`} alt="生成图片" />
              : renderContent(message.content)
          }
        </div>
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          <button
            className="msg-delete-btn"
            title="删除消息"
            onClick={() => onDelete(message.id)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
