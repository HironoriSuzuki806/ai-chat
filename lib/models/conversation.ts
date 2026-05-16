import { ObjectId } from "mongodb"

export interface Message {
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

export interface Conversation {
  _id?: ObjectId
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export const DB_NAME = "ai-chat"
export const COLLECTION_NAME = "conversations"
