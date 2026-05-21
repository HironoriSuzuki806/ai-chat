"use client"

import { useCallback, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatWindow } from "@/components/chat-window"

export default function Page() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleMessageSent = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversationId={conversationId}
        onSelect={setConversationId}
        refreshKey={refreshKey}
      />
      {/* key forces full remount on conversation switch — prevents stale useChat state */}
      <ChatWindow
        key={conversationId ?? "new"}
        conversationId={conversationId}
        onMessageSent={handleMessageSent}
      />
    </div>
  )
}
