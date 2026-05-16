"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatWindow } from "@/components/chat-window"

export default function Page() {
  const [conversationId, setConversationId] = useState<string | null>(null)

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar conversationId={conversationId} onSelect={setConversationId} />
      <ChatWindow conversationId={conversationId} />
    </div>
  )
}
