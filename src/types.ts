export type ModelId = 'gpt-image-2' | 'gpt-5.5' | 'gpt-5.4' | 'gpt-5.4-mini'

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
  imageB64?: string   // 生图结果
  model?: ModelId
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  preview: string
  messages: Message[]
  updatedAt: Date
}
