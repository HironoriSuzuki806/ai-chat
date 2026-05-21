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

// POST /api/chat — streaming chat response via Mastra agent
app.post("/chat", async (c) => {
  const body = await c.req.json<{
    messages: UIMessage[]
    conversationId?: string
  }>()
  const { messages, conversationId } = body

  if (!messages?.length) {
    return c.json({ error: "messages is required" }, 400)
  }

  const agent = mastra.getAgent("chatAgent")
  const agentStream = await agent.stream(messages)

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

      const newMessages: Message[] = [
        ...(userText ? [{ role: "user" as const, content: userText, createdAt: now }] : []),
        { role: "assistant", content: text, createdAt: now },
      ]

      const client = await clientPromise()
      const db = client.db(DB_NAME)
      const collection = db.collection<Conversation>(COLLECTION_NAME)
      const oid = new ObjectId(conversationId) as unknown as Conversation["_id"]

      // Auto-generate title from first user message (slice to 30 chars)
      const existing = await collection.findOne({ _id: oid }, { projection: { messages: 1 } })
      const isFirst = !existing?.messages?.length
      const titleUpdate = isFirst && userText ? { title: userText.slice(0, 30) } : {}

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
