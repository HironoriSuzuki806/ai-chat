"use client"

import {
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import { PaperclipIcon, SendIcon, XIcon } from "lucide-react"

export interface AttachedImage {
  dataUrl: string
  mimeType: string
  name: string
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024

interface MessageInputProps {
  onSend: (text: string, images: AttachedImage[]) => void
  disabled?: boolean
  placeholder?: string
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function filesToAttachedImages(files: File[]): Promise<AttachedImage[]> {
  const results: AttachedImage[] = []
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SIZE) continue
    const dataUrl = await readFileAsDataUrl(file)
    results.push({ dataUrl, mimeType: file.type, name: file.name })
  }
  return results
}

export function MessageInput({ onSend, disabled, placeholder }: MessageInputProps) {
  const [value, setValue] = useState("")
  const [images, setImages] = useState<AttachedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSend = !disabled && (value.trim().length > 0 || images.length > 0)

  const handleSend = () => {
    if (!canSend) return
    onSend(value.trim(), images)
    setValue("")
    setImages([])
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const addImages = async (files: File[]) => {
    const next = await filesToAttachedImages(files)
    if (next.length > 0) setImages((prev) => [...prev, ...next])
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    await addImages(Array.from(e.target.files))
    e.target.value = ""
  }

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItems = Array.from(e.clipboardData.items).filter(
      (item) => item.kind === "file" && item.type.startsWith("image/")
    )
    if (imageItems.length === 0) return
    e.preventDefault()
    const files = imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null)
    await addImages(files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    await addImages(Array.from(e.dataTransfer.files))
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div
      className={`border-t bg-background p-4 transition-colors ${isDragging ? "bg-secondary/30" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mx-auto max-w-3xl space-y-2">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative inline-block">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-16 w-16 rounded border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  aria-label="画像を削除"
                >
                  <XIcon className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="画像を添付 (JPEG/PNG/GIF/WebP, 最大5MB)"
          >
            <PaperclipIcon className="h-4 w-4" />
          </Button>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
            disabled={!canSend}
            size="icon"
            className="shrink-0"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
