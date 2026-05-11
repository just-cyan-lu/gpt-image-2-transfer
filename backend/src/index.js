import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env.local') })
import Koa from 'koa'
import Router from '@koa/router'
import { koaBody } from 'koa-body'
import fetch from 'node-fetch'

const app = new Koa()
const router = new Router({ prefix: '/api' })

const BASE_URL = (process.env.OPENAI_BASE_URL || '').replace(/\/$/, '')
const API_KEY = process.env.OPENAI_API_KEY || ''
const PORT = parseInt(process.env.PORT || '3001', 10)

app.use(koaBody())

// 流式对话
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

// 生图 / 编辑图
router.post('/image', async (ctx) => {
  const { prompt, images } = ctx.request.body

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
    ctx.status = upstream.status
    ctx.body = err
    return
  }

  const json = await upstream.json()
  ctx.body = { b64_json: json.data[0].b64_json }
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(PORT, () => {
  console.log(`backend running on http://localhost:${PORT}`)
})
