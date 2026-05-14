import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, unlinkSync, createReadStream, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

import Koa from 'koa'
import Router from '@koa/router'
import { koaBody } from 'koa-body'
import OpenAI, { toFile } from 'openai'
import {
  listConversations, getMessages,
  upsertConversation, upsertMessage,
  deleteConversation, deleteMessage, renameConversation,
  getMessageImageFile, IMAGES_DIR,
  getConfig, saveConfig,
} from './db.js'

const app = new Koa()
const router = new Router({ prefix: '/api' })

const PORT = 6677
const RESPONSE_MODEL = 'gpt-5.5'
const IMAGE_MODEL = 'gpt-image-2'
const IMAGE_API_MODE = 'images' // 'responses' 或 'images'

app.use(koaBody({ jsonLimit: '50mb' }))

function normalizeBaseUrl(baseUrl) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

function buildImageInput(prompt, images = []) {
  const hasImages = images.length > 0
  const text = prompt?.trim() || (hasImages ? '请根据提供的参考图片生成图片' : '请生成一张图片')

  if (!hasImages) return text

  return [
    {
      role: 'user',
      content: [
        { type: 'input_text', text },
        ...images.map(img => ({
          type: 'input_image',
          image_url: `data:${img.mimeType};base64,${img.base64}`,
          detail: 'auto',
        })),
      ],
    },
  ]
}

function buildImageTool({ images = [], response_id, size, quality }) {
  const tool = {
    type: 'image_generation',
    model: IMAGE_MODEL,
    action: images.length > 0 || response_id ? 'edit' : 'generate',
  }
  if (size) tool.size = size
  if (quality) tool.quality = quality
  return tool
}

function buildImageParams(prompt, size, quality) {
  const params = {
    model: IMAGE_MODEL,
    prompt: prompt?.trim() || '请生成一张图片',
    n: 1,
  }
  if (size && size !== 'auto') params.size = size
  if (quality && quality !== 'auto') params.quality = quality
  return params
}

function extractGeneratedImage(response) {
  return response.output
    ?.filter(output => output.type === 'image_generation_call' && output.result)
    ?.map(output => output.result)[0]
}

function extractImageResponseData(response) {
  return response.data?.[0]?.b64_json
}

async function imageAttachmentToFile(img, index) {
  const extension = img.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  return toFile(Buffer.from(img.base64, 'base64'), img.name || `image${index}.${extension}`, {
    type: img.mimeType || 'image/png',
  })
}

async function createImageWithResponses(openai, { prompt, images, size, quality, response_id }) {
  const response = await openai.responses.create({
    model: RESPONSE_MODEL,
    input: buildImageInput(prompt, images),
    previous_response_id: response_id || undefined,
    tools: [buildImageTool({ images, response_id, size, quality })],
    tool_choice: { type: 'image_generation' },
  })

  return {
    b64_json: extractGeneratedImage(response),
    size: size && size !== 'auto' ? size : undefined,
    quality: quality && quality !== 'auto' ? quality : undefined,
    responseId: response.id,
  }
}

async function createImageWithImages(openai, { prompt, images, size, quality, response_id }) {
  if (response_id && (!images || images.length === 0)) {
    console.log('[image] images api ignores response_id without uploaded images:', response_id)
  }

  const params = buildImageParams(prompt, size, quality)
  const response = images && images.length > 0
    ? await openai.images.edit({
        ...params,
        image: await Promise.all(images.map(imageAttachmentToFile)),
      })
    : await openai.images.generate(params)

  return {
    b64_json: extractImageResponseData(response),
    size: response.size ?? params.size,
    quality: response.quality ?? params.quality,
    responseId: response.id,
  }
}

function getErrorStatus(err) {
  return Number.isInteger(err?.status) ? err.status : 500
}

function getErrorBody(err) {
  if (err?.error) {
    return typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
  }
  return err instanceof Error ? err.message : String(err)
}

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
  const { conversationId, role, content, images, imageB64, model, size, quality, responseId, timestamp } = ctx.request.body
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
    size: size ?? null,
    quality: quality ?? null,
    responseId: responseId ?? null,
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
  const { baseUrl, imageKey } = ctx.request.body
  saveConfig({ baseUrl, imageKey })
  ctx.body = { ok: true }
})

// ── 生图 / 编辑图 ─────────────────────────────────────────
router.post('/image', async (ctx) => {
  const { prompt, images, size, quality, response_id } = ctx.request.body
  const config = getConfig()
  const apiKey = config.imageKey
  const baseURL = normalizeBaseUrl(config.baseUrl ?? '')

  if (!apiKey || !baseURL) {
    ctx.status = 400
    ctx.body = '请先在设置中配置 API 地址和生图 Key'
    return
  }

  console.log('[image] request', { prompt, imageCount: images?.length ?? 0, size, quality })

  try {
    const openai = new OpenAI({ apiKey, baseURL })
    const result = IMAGE_API_MODE === 'images'
      ? await createImageWithImages(openai, { prompt, images, size, quality, response_id })
      : await createImageWithResponses(openai, { prompt, images, size, quality, response_id })

    if (!result.b64_json) {
      ctx.status = 502
      ctx.body = '生图接口未返回图片数据'
      return
    }

    console.log('[image] response ok', { mode: IMAGE_API_MODE, b64JsonLength: result.b64_json.length })
    ctx.body = result
  } catch (err) {
    const status = getErrorStatus(err)
    const body = getErrorBody(err)
    console.log('[image] upstream error', status, body)
    ctx.status = status
    ctx.body = body
  }
})

app.use(router.routes()).use(router.allowedMethods())

const server = app.listen(PORT, () => {
  console.log(`backend running on http://localhost:${PORT}`)
})
server.timeout = 0
server.keepAliveTimeout = 0
