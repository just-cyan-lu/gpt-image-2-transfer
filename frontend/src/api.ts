import { Conversation, Message } from './types'

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

// ── 生图 ──────────────────────────────────────────────────

export async function generateImage(
  prompt: string,
  images: { mimeType: string; base64: string }[],
  size?: string,
  quality?: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, images, size, quality }),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  const json = await res.json()
  return json.b64_json as string
}
