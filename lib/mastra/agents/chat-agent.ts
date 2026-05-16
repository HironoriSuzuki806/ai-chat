import { Agent } from "@mastra/core/agent"

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions:
    "あなたは親切で丁寧な日本語のAIアシスタントです。" +
    "ユーザーの質問に対して分かりやすく丁寧に答えてください。" +
    "回答は簡潔にまとめ、必要に応じてリストや見出しを使って整理してください。",
  // AI Gatewayルーティング: provider/model 形式で自動的にゲートウェイ経由になる
  // 認証: AI_GATEWAY_API_KEY または VERCEL_OIDC_TOKEN (vercel env pull)
  model: "anthropic/claude-sonnet-4.6",
})
