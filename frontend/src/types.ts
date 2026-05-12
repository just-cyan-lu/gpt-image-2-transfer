export interface ImageAttachment {
  name: string
  mimeType: string
  base64: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: ImageAttachment[]
  imageB64?: string    // 生图时前端临时持有，保存后由后端写文件
  imageFile?: string   // 保存后后端返回的文件名，用于展示
  size?: string        // 生图尺寸，如 1024x1536
  quality?: string     // 生图质量，如 high / medium / low
  responseId?: string  // 每次生图后 API 返回的 response_id，用于后续编辑请求
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  preview: string
  messages: Message[]
  updatedAt: Date
}
