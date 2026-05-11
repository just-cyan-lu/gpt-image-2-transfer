import { Message, ModelId } from './types'

const getConfig = () => {
  const rawUrl = (localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  // 开发环境通过 Vite 反代绕过 CORS，生产环境直连（需自行解决 CORS）
  const baseUrl = import.meta.env.DEV ? '/api-proxy' : rawUrl
  const apiKey = localStorage.getItem('api_key') || import.meta.env.VITE_API_KEY || ''
  return { baseUrl, apiKey }
}

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

// 流式对话，通过 onDelta 回调逐步输出文字，返回完整内容
export async function streamChat(
  history: Message[],
  text: string,
  images: { mimeType: string; base64: string }[],
  model: ModelId,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { baseUrl, apiKey } = getConfig()
  const messages = buildMessages(history, text, images)

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
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
        // 忽略解析失败的行
      }
    }
  }

  return full
}

// 生图或编辑图，有图走 /edits，无图走 /generations，返回 base64
export async function generateImage(
  prompt: string,
  images: { mimeType: string; base64: string }[],
  signal?: AbortSignal,
): Promise<string> {
  const { baseUrl, apiKey } = getConfig()
  const headers = { Authorization: `Bearer ${apiKey}` }

  let res: Response

  if (images.length > 0) {
    const form = new FormData()
    form.append('model', 'gpt-image-2')
    form.append('prompt', prompt)
    form.append('n', '1')
    form.append('response_format', 'b64_json')
    images.forEach((img, i) => {
      const bytes = atob(img.base64)
      const arr = new Uint8Array(bytes.length)
      for (let j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j)
      const blob = new Blob([arr], { type: img.mimeType })
      form.append('image[]', blob, `image${i}.png`)
    })
    res = await fetch(`${baseUrl}/v1/images/edits`, { method: 'POST', headers, body: form, signal })
  } else {
    res = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt, n: 1, response_format: 'b64_json' }),
      signal,
    })
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  const json = await res.json()
  return json.data[0].b64_json as string
}
