import { Agent } from "@mastra/core/agent"
import { gateway } from "@ai-sdk/gateway"

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions:
    "あなたは親切で丁寧な日本語のAIアシスタントです。" +
    "ユーザーの質問に対して分かりやすく丁寧に答えてください。" +
    "回答は簡潔にまとめ、必要に応じてリストや見出しを使って整理してください。",
  // Vercel AI Gateway 経由で Anthropic Claude を使用
  // 認証: AI_GATEWAY_API_KEY (Cloud Run 環境変数 / GitHub Secrets で管理)
  model: gateway("openai/gpt-4.1-mini"),
})
