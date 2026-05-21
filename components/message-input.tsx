"use client"

import { type KeyboardEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { SendIcon } from "lucide-react"

interface MessageInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ onSend, disabled, placeholder }: MessageInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue("")
    // reset height
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement
            el.style.height = "auto"
            el.style.height = `${el.scrollHeight}px`
          }}
          placeholder={placeholder ?? "メッセージを入力... (Shift+Enterで改行)"}
          disabled={disabled}
          rows={1}
          className="min-h-10 max-h-48 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className="shrink-0"
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
