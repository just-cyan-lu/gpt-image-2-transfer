import { Conversation, Message, ModelId } from './types'

// ── 对话持久化 ────────────────────────────────────────────

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations')
  const rows = await res.json() as { id: string; title: string; preview: string; updatedAt: number }[]
  return rows.map(r => ({ ...r, messages: [], updatedAt: new Date(r.updatedAt) }))
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`)
  const rows = await res.json() as (Omit<Message, 'timestamp'> & { timestamp: string })[]
  return rows.map(r => ({ ...r, timestamp: new Date(r.timestamp) }))
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await fetch(`/api/conversations/${conv.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: conv.title, preview: conv.preview, updatedAt: conv.updatedAt }),
  })
}

export async function saveMessage(conversationId: string, msg: Message): Promise<void> {
  await fetch(`/api/messages/${msg.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...msg, conversationId }),
  })
}

export async function apiRenameConversation(id: string, title: string): Promise<void> {
  await fetch(`/api/conversations/${id}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

export async function apiDeleteConversation(id: string): Promise<void> {
  await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
}

export async function apiDeleteMessage(id: string): Promise<void> {
  await fetch(`/api/messages/${id}`, { method: 'DELETE' })
}

// ── AI 请求 ───────────────────────────────────────────────

function buildMessages(history: Message[], newText: string, newImages: { mimeType: string; base64: string }[]) {
  const msgs = history.map(m => {
    if (m.role === 'user' && m.images && m.images.length > 0) {
      return {
        role: 'user',
        content: [
          ...m.images.map(img => ({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
          })),
          ...(m.content ? [{ type: 'text', text: m.content }] : []),
        ],
      }
    }
    return { role: m.role, content: m.content }
  })

  if (newImages.length > 0) {
    msgs.push({
      role: 'user',
      content: [
        ...newImages.map(img => ({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
        })),
        ...(newText ? [{ type: 'text', text: newText }] : []),
      ],
    })
  } else {
    msgs.push({ role: 'user', content: newText })
  }

  return msgs
}

export async function streamChat(
  history: Message[],
  text: string,
  images: { mimeType: string; base64: string }[],
  model: ModelId,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const messages = buildMessages(history, text, images)

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return full
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          onDelta(delta)
        }
      } catch {
        // ignore malformed lines
      }
    }
  }

  return full
}

export async function generateImage(
  prompt: string,
  images: { mimeType: string; base64: string }[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  const json = await res.json()
  return json.b64_json as string
}
