import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, unlinkSync, createReadStream, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

import Koa from 'koa'
import Router from '@koa/router'
import { koaBody } from 'koa-body'
import fetch from 'node-fetch'
import {
  listConversations, getMessages,
  upsertConversation, upsertMessage,
  deleteConversation, deleteMessage, renameConversation,
  getMessageImageFile, IMAGES_DIR,
  getConfig, saveConfig,
} from './db.js'

const app = new Koa()
const router = new Router({ prefix: '/api' })

const PORT = 3001

app.use(koaBody({ jsonLimit: '50mb' }))

// ── 对话列表 ──────────────────────────────────────────────
router.get('/conversations', (ctx) => {
  ctx.body = listConversations()
})

router.get('/conversations/:id/messages', (ctx) => {
  const rows = getMessages(ctx.params.id)
  ctx.body = rows.map(r => ({
    ...r,
    images: r.images ? JSON.parse(r.images) : undefined,
    timestamp: new Date(r.timestamp),
  }))
})

router.put('/conversations/:id', (ctx) => {
  const { title, preview, updatedAt } = ctx.request.body
  upsertConversation({ id: ctx.params.id, title, preview, updatedAt: new Date(updatedAt).getTime() })
  ctx.body = { ok: true }
})

router.patch('/conversations/:id/rename', (ctx) => {
  renameConversation(ctx.params.id, ctx.request.body.title)
  ctx.body = { ok: true }
})

router.delete('/conversations/:id', (ctx) => {
  deleteConversation(ctx.params.id)
  ctx.body = { ok: true }
})

router.put('/messages/:id', (ctx) => {
  const { conversationId, role, content, images, imageB64, model, timestamp } = ctx.request.body
  let imageFile = null
  if (imageB64) {
    imageFile = `${ctx.params.id}.png`
    writeFileSync(resolve(IMAGES_DIR, imageFile), Buffer.from(imageB64, 'base64'))
  }
  upsertMessage({
    id: ctx.params.id,
    conversationId,
    role,
    content: content ?? '',
    images: images ? JSON.stringify(images) : null,
    imageFile,
    model: model ?? null,
    timestamp: new Date(timestamp).getTime(),
  })
  ctx.body = { ok: true }
})

router.delete('/messages/:id', (ctx) => {
  const imageFile = getMessageImageFile(ctx.params.id)
  if (imageFile) {
    const filePath = resolve(IMAGES_DIR, imageFile)
    if (existsSync(filePath)) unlinkSync(filePath)
  }
  deleteMessage(ctx.params.id)
  ctx.body = { ok: true }
})

router.get('/images/:filename', (ctx) => {
  const filePath = resolve(IMAGES_DIR, ctx.params.filename)
  if (!existsSync(filePath)) { ctx.status = 404; return }
  ctx.set('Content-Type', 'image/png')
  ctx.set('Cache-Control', 'public, max-age=31536000, immutable')
  ctx.body = createReadStream(filePath)
})

// ── 配置管理 ──────────────────────────────────────────────
router.get('/config', (ctx) => {
  ctx.body = getConfig()
})

router.post('/config', (ctx) => {
  const { baseUrl, chatKey, imageKey } = ctx.request.body
  saveConfig({ baseUrl, chatKey, imageKey })
  ctx.body = { ok: true }
})

// ── 流式对话 ──────────────────────────────────────────────
router.post('/chat', async (ctx) => {
  console.log('[chat] received request:', ctx.request.body)
  const { model, messages } = ctx.request.body
  const config = getConfig()
  const apiKey = config.chatKey
  const baseUrl = config.baseUrl

  if (!apiKey || !baseUrl) {
    console.log('[chat] missing config')
    ctx.status = 400
    ctx.body = '请先在设置中配置 API 地址和聊天 Key'
    return
  }
  console.log('[chat] forwarding to:', baseUrl)

  const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    ctx.status = upstream.status
    ctx.body = err
    return
  }

  ctx.status = 200
  ctx.set('Content-Type', 'text/event-stream')
  ctx.set('Cache-Control', 'no-cache')
  ctx.set('Connection', 'keep-alive')
  ctx.body = upstream.body
})

// ── 生图 / 编辑图 ─────────────────────────────────────────
router.post('/image', async (ctx) => {
  const { prompt, images, size, quality } = ctx.request.body
  const config = getConfig()
  const apiKey = config.imageKey
  const baseUrl = config.baseUrl

  if (!apiKey || !baseUrl) {
    ctx.status = 400
    ctx.body = '请先在设置中配置 API 地址和生图 Key'
    return
  }

  console.log('[image] request', { prompt, imageCount: images?.length ?? 0, size, quality })

  let upstream

  if (images && images.length > 0) {
    const { FormData, Blob } = await import('node:buffer')
    const form = new FormData()
    form.append('model', 'gpt-image-2')
    form.append('prompt', prompt)
    form.append('n', '1')
    form.append('response_format', 'b64_json')
    if (size && size !== 'auto') form.append('size', size)
    if (quality && quality !== 'auto') form.append('quality', quality)
    images.forEach((img, i) => {
      const bytes = Buffer.from(img.base64, 'base64')
      const blob = new Blob([bytes], { type: img.mimeType })
      form.append('image[]', blob, `image${i}.png`)
    })
    upstream = await fetch(`${baseUrl}/v1/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
  } else {
    const body = { model: 'gpt-image-2', prompt, n: 1, response_format: 'b64_json' }
    if (size && size !== 'auto') body.size = size
    if (quality && quality !== 'auto') body.quality = quality
    upstream = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
  }

  if (!upstream.ok) {
    const err = await upstream.text()
    console.log('[image] upstream error', upstream.status, err)
    ctx.status = upstream.status
    ctx.body = err
    return
  }

  const json = await upstream.json()
  console.log('[image] response ok, b64_json length:', json.data[0].b64_json?.length)
  ctx.body = { b64_json: json.data[0].b64_json }
})

app.use(router.routes()).use(router.allowedMethods())

const server = app.listen(PORT, () => {
  console.log(`backend running on http://localhost:${PORT}`)
})
server.timeout = 0
server.keepAliveTimeout = 0
