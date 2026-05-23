import { Hono } from "hono"
import { handle } from "hono/vercel"
import { ObjectId } from "mongodb"
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai"
import { toAISdkStream } from "@mastra/ai-sdk"
import clientPromise from "@/lib/mongodb"
import { mastra } from "@/lib/mastra"
import {
  DB_NAME,
  COLLECTION_NAME,
  type Conversation,
  type Message,
} from "@/lib/models/conversation"

export const runtime = "nodejs"

const app = new Hono().basePath("/api")

// GET /api/conversations — list conversations (title + updatedAt, descending)
app.get("/conversations", async (c) => {
  const client = await clientPromise()
  const db = client.db(DB_NAME)
  const docs = await db
    .collection<Conversation>(COLLECTION_NAME)
    .find({}, { projection: { title: 1, updatedAt: 1, createdAt: 1 } })
    .sort({ updatedAt: -1 })
    .toArray()
  return c.json(docs)
})

// POST /api/conversations — create new conversation
app.post("/conversations", async (c) => {
  const body = await c.req.json<{ title?: string }>()
  const now = new Date()
  const conversation: Conversation = {
    title: body.title ?? "新しいチャット",
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
  const client = await clientPromise()
  const db = client.db(DB_NAME)
  const result = await db.collection<Conversation>(COLLECTION_NAME).insertOne(conversation)
  return c.json({ _id: result.insertedId, ...conversation }, 201)
})

// GET /api/conversations/:id — get conversation with all messages
app.get("/conversations/:id", async (c) => {
  const id = c.req.param("id")
  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid conversation ID" }, 400)
  }
  const client = await clientPromise()
  const db = client.db(DB_NAME)
  const doc = await db
    .collection<Conversation>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) as unknown as Conversation["_id"] })
  if (!doc) return c.json({ error: "Not found" }, 404)
  return c.json(doc)
})

// DELETE /api/conversations/:id — delete conversation
app.delete("/conversations/:id", async (c) => {
  const id = c.req.param("id")
  if (!ObjectId.isValid(id)) {
    return c.json({ error: "Invalid conversation ID" }, 400)
  }
  const client = await clientPromise()
  const db = client.db(DB_NAME)
  const result = await db
    .collection<Conversation>(COLLECTION_NAME)
    .deleteOne({ _id: new ObjectId(id) as unknown as Conversation["_id"] })
  if (result.deletedCount === 0) return c.json({ error: "Not found" }, 404)
  return c.json({ success: true })
})

interface PendingImage {
  dataUrl: string
  mimeType: string
  name: string
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const MAX_IMAGES = 10

function isValidPendingImage(img: unknown): img is PendingImage {
  if (!img || typeof img !== "object") return false
  const { dataUrl, mimeType, name } = img as Record<string, unknown>

  // Validate mimeType
  if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.includes(mimeType)) return false

  // Validate dataUrl format
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(`data:${mimeType};base64,`)) return false

  // Validate name
  if (typeof name !== "string") return false

  return true
}

// POST /api/chat — streaming chat response via Mastra agent
app.post("/chat", async (c) => {
  const body = await c.req.json<{
    messages: UIMessage[]
    conversationId?: string
    pendingImages?: PendingImage[]
  }>()
  const { messages, conversationId, pendingImages } = body

  if (!messages?.length) {
    return c.json({ error: "messages is required" }, 400)
  }

  // Validate pendingImages
  if (pendingImages) {
    if (pendingImages.length > MAX_IMAGES) {
      return c.json({ error: `Too many images (max: ${MAX_IMAGES})` }, 400)
    }
    for (const img of pendingImages) {
      if (!isValidPendingImage(img)) {
        return c.json({ error: "Invalid image data" }, 400)
      }
    }
  }

  // Augment the last user message with image parts when images are attached
  let messagesForAgent = messages
  if (pendingImages?.length) {
    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx >= 0) {
      const imageParts = pendingImages.map((img) => ({
        type: "image" as const,
        image: img.dataUrl,
        mimeType: img.mimeType,
      }))
      messagesForAgent = messages.map((msg, i) =>
        i === lastUserIdx
          ? ({
              ...msg,
              parts: [...(msg.parts ?? []), ...imageParts],
            } as unknown as UIMessage)
          : msg
      )
    }
  }

  const agent = mastra.getAgent("chatAgent")
  const agentStream = await agent.stream(messagesForAgent)

  // toAISdkStream returns ReadableStream — cast to UIMessageChunk stream for createUIMessageStream writer
  const mastraStream = toAISdkStream(agentStream, {
    from: "agent",
    version: "v6",
  }) as unknown as ReadableStream<UIMessageChunk>

  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.merge(mastraStream)
    },
    onFinish: async () => {
      if (!conversationId || !ObjectId.isValid(conversationId)) return

      // agentStream.text resolves after the underlying stream has been fully consumed
      const text = await agentStream.text
      if (!text) return

      const now = new Date()
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
      const userText = lastUserMsg?.parts
        ?.find((p) => p.type === "text")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.text ?? (lastUserMsg as any)?.content ?? ""

      // Build stored content: trim whitespace-only text, append image placeholder
      const imageCount = pendingImages?.length ?? 0
      const parts = [userText.trim(), imageCount > 0 ? `[画像添付: ${imageCount}枚]` : ""].filter(
        Boolean
      )
      const userContent = parts.join(" ")

      const newMessages: Message[] = [
        ...(userContent ? [{ role: "user" as const, content: userContent, createdAt: now }] : []),
        { role: "assistant", content: text, createdAt: now },
      ]

      const client = await clientPromise()
      const db = client.db(DB_NAME)
      const collection = db.collection<Conversation>(COLLECTION_NAME)
      const oid = new ObjectId(conversationId) as unknown as Conversation["_id"]

      // Auto-generate title from first user message (slice to 30 chars)
      const existing = await collection.findOne({ _id: oid }, { projection: { messages: 1 } })
      const isFirst = !existing?.messages?.length
      const titleSource = userText.trim() || `[画像添付: ${imageCount}枚]`
      const titleUpdate = isFirst ? { title: titleSource.slice(0, 30) } : {}

      await collection.updateOne(
        { _id: oid },
        {
          $push: { messages: { $each: newMessages } } as Record<string, unknown>,
          $set: { updatedAt: now, ...titleUpdate },
        }
      )
    },
  })

  return createUIMessageStreamResponse({ stream: uiMessageStream })
})

export const GET = handle(app)
export const POST = handle(app)
export const DELETE = handle(app)
