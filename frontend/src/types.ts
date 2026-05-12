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
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  preview: string
  messages: Message[]
  updatedAt: Date
}
