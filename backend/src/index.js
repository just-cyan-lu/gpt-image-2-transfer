import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, unlinkSync, createReadStream, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env.local') })

import Koa from 'koa'
import Router from '@koa/router'
import { koaBody } from 'koa-body'
import fetch from 'node-fetch'
import {
  listConversations, getMessages,
  upsertConversation, upsertMessage,
  deleteConversation, deleteMessage, renameConversation,
  getMessageImageFile, IMAGES_DIR,
} from './db.js'

const app = new Koa()
const router = new Router({ prefix: '/api' })

const BASE_URL = (process.env.OPENAI_BASE_URL || '').replace(/\/$/, '')
const API_KEY = process.env.OPENAI_API_KEY || ''
const PORT = parseInt(process.env.PORT || '3001', 10)

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

// ── 流式对话 ──────────────────────────────────────────────
router.post('/chat', async (ctx) => {
  const { model, messages } = ctx.request.body

  const upstream = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
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
  const { prompt, images } = ctx.request.body

  console.log('[image] request', { prompt, imageCount: images?.length ?? 0 })

  let upstream

  if (images && images.length > 0) {
    const { FormData, Blob } = await import('node:buffer')
    const form = new FormData()
    form.append('model', 'gpt-image-2')
    form.append('prompt', prompt)
    form.append('n', '1')
    form.append('response_format', 'b64_json')
    images.forEach((img, i) => {
      const bytes = Buffer.from(img.base64, 'base64')
      const blob = new Blob([bytes], { type: img.mimeType })
      form.append('image[]', blob, `image${i}.png`)
    })
    upstream = await fetch(`${BASE_URL}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    })
  } else {
    upstream = await fetch(`${BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-image-2', prompt, n: 1, response_format: 'b64_json' }),
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
