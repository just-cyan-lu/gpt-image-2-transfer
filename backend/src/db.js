import Database from 'better-sqlite3'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = resolve(__dirname, '../../data/chat.db')
export const IMAGES_DIR = resolve(__dirname, '../../data/images')

mkdirSync(IMAGES_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    preview TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    images TEXT,
    image_file TEXT,
    model TEXT,
    timestamp INTEGER NOT NULL
  );

  PRAGMA foreign_keys = ON;
`)

export function listConversations() {
  return db.prepare(`
    SELECT id, title, preview, updated_at AS updatedAt
    FROM conversations ORDER BY updated_at DESC
  `).all()
}

export function getMessages(conversationId) {
  return db.prepare(`
    SELECT id, conversation_id AS conversationId, role, content,
           images, image_file AS imageFile, model, timestamp
    FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC
  `).all(conversationId)
}

export function upsertConversation(conv) {
  db.prepare(`
    INSERT INTO conversations (id, title, preview, updated_at)
    VALUES (@id, @title, @preview, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      preview = excluded.preview,
      updated_at = excluded.updated_at
  `).run(conv)
}

export function upsertMessage(msg) {
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, images, image_file, model, timestamp)
    VALUES (@id, @conversationId, @role, @content, @images, @imageFile, @model, @timestamp)
    ON CONFLICT(id) DO UPDATE SET
      content = excluded.content,
      image_file = excluded.image_file
  `).run(msg)
}

export function getMessageImageFile(id) {
  return db.prepare('SELECT image_file FROM messages WHERE id = ?').get(id)?.image_file ?? null
}

export function deleteConversation(id) {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
}

export function deleteMessage(id) {
  db.prepare('DELETE FROM messages WHERE id = ?').run(id)
}

export function renameConversation(id, title) {
  db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, id)
}
