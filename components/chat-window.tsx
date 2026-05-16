"use client"

import { useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { nanoid } from "nanoid"
import { BotIcon } from "lucide-react"
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
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages }) {
        return { body: { messages, conversationId } }
      },
    }),
  })

  // Load conversation history when selection changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => r.json())
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
      .catch(console.error)
  }, [conversationId, setMessages])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState
              title="会話を始めましょう"
              description="メッセージを入力して送信してください"
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
        disabled={status !== "ready"}
      />
    </div>
  )
}
