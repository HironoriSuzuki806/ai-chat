"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { nanoid } from "nanoid"
import { AlertCircleIcon, BotIcon } from "lucide-react"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { MessageInput } from "@/components/message-input"

interface ChatWindowProps {
  conversationId: string | null
  onMessageSent?: () => void
}

export function ChatWindow({ conversationId, onMessageSent }: ChatWindowProps) {
  const [loadError, setLoadError] = useState(false)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages }) {
        return { body: { messages, conversationId } }
      },
    }),
  })

  // Notify parent when streaming completes so sidebar can refresh
  const prevStatusRef = useRef(status)
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && status === "ready") {
      onMessageSent?.()
    }
    prevStatusRef.current = status
  }, [status, onMessageSent])

  // Load conversation history when selection changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoadError(false)
      return
    }
    setLoadError(false)
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed")
        return r.json()
      })
      .then((data) => {
        const uiMessages: UIMessage[] = (data.messages ?? []).map(
          (m: { role: string; content: string }) => ({
            id: nanoid(),
            role: m.role as UIMessage["role"],
            parts: [{ type: "text" as const, text: m.content }],
            content: m.content,
          })
        )
        setMessages(uiMessages)
      })
      .catch(() => setLoadError(true))
  }, [conversationId, setMessages])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Error banners */}
      {loadError && (
        <div className="flex items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircleIcon className="h-4 w-4 shrink-0" />
          会話履歴の読み込みに失敗しました。再度会話を選択してください。
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircleIcon className="h-4 w-4 shrink-0" />
          送信に失敗しました。もう一度お試しください。
        </div>
      )}

      <Conversation>
        <ConversationContent>
          {messages.length === 0 && !loadError && (
            <ConversationEmptyState
              title={conversationId ? "会話を始めましょう" : "会話を選択してください"}
              description={
                conversationId
                  ? "メッセージを入力して送信してください"
                  : "左のサイドバーから会話を選択するか、「+」で新規作成してください"
              }
              icon={<BotIcon className="h-8 w-8" />}
            />
          )}
          {messages.map((msg) => (
            <Message key={msg.id} from={msg.role}>
              <MessageContent>
                {msg.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={i}>{part.text}</MessageResponse>
                  ) : null
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
      </Conversation>

      <MessageInput
        onSend={(text) => sendMessage({ text })}
        disabled={status !== "ready" || !conversationId}
        placeholder={
          !conversationId
            ? "← 会話を選択または作成してください"
            : "メッセージを入力... (Shift+Enterで改行)"
        }
      />
    </div>
  )
}
