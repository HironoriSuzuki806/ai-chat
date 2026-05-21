"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { MenuIcon, MessageSquareIcon, PlusIcon, Trash2Icon } from "lucide-react"

interface ConversationItem {
  _id: string
  title: string
  updatedAt: string
  createdAt: string
}

interface SidebarProps {
  conversationId: string | null
  onSelect: (id: string | null) => void
  refreshKey?: number
}

export function Sidebar({ conversationId, onSelect, refreshKey }: SidebarProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations")
      if (res.ok) setConversations(await res.json())
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations, refreshKey])

  const handleNew = async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const data = await res.json()
      await fetchConversations()
      onSelect(data._id)
      setOpen(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" })
    if (conversationId === id) onSelect(null)
    await fetchConversations()
  }

  const handleSelect = (id: string) => {
    onSelect(id)
    setOpen(false)
  }

  const content = (
    <aside className="flex h-full w-64 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">AI Chat</span>
        <Button size="icon" variant="ghost" onClick={handleNew} title="新しい会話">
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">読み込み中...</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            「+」で会話を始めましょう
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c._id}>
                <button
                  onClick={() => handleSelect(c._id)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    conversationId === c._id && "bg-accent font-medium"
                  )}
                >
                  <MessageSquareIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{c.title}</span>

                  <AlertDialog>
                    <AlertDialogTrigger
                      aria-label="削除"
                      title="削除"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent-foreground/10 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2Icon className="h-3 w-3" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>会話を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          「{c.title}」を削除します。この操作は取り消せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(c._id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          削除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  )

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden border-r lg:flex">
        {content}
      </div>

      {/* Mobile: hamburger + Sheet overlay */}
      <div className="flex items-center border-r lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="m-2 flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
            <MenuIcon className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {content}
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
