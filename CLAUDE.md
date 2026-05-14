# AI Chat App

シンプルなAIチャットアプリケーション。Anthropic ClaudeとリアルタイムでテキストチャットができるWebアプリ。友人・コミュニティ向けの限定公開を想定。

## 技術スタック

| レイヤー | 技術 |
|--------|------|
| Framework | Next.js 15 (App Router) |
| AI SDK | Vercel AI SDK v6 (`ai` package) |
| AI Model | Anthropic Claude (AI Gatewayルーティング) |
| UI Components | shadcn/ui + AI Elements |
| Database | MongoDB (会話履歴の永続化) |
| Styling | Tailwind CSS |
| Deployment | Vercel |

## 主要機能

1. **ストリーミング応答** — AIの回答をリアルタイムで文字ごとに表示（streamText使用）
2. **会話履歴の保存** — ページリロード後も会話が維持される（MongoDB永続化）
3. **複数会話の管理** — サイドバーで会話一覧を切り替え、新規会話の作成・削除
4. **ビジネスライクUI** — 装飾を最小限に抑えたクリーンなデザイン

## ディレクトリ構成

```
app/
  api/
    chat/
      route.ts              # POST: メッセージ送信・ストリーミング応答
    conversations/
      route.ts              # GET: 会話一覧 / POST: 新規会話作成
      [id]/
        route.ts            # GET: 会話取得 / DELETE: 会話削除
  page.tsx                  # メインチャット画面
  layout.tsx
components/
  sidebar.tsx               # 会話一覧サイドバー
  chat-window.tsx           # チャット画面本体
  message-list.tsx          # メッセージ一覧表示
  message-input.tsx         # テキスト入力エリア
lib/
  mongodb.ts                # MongoDB接続クライアント
  models/
    conversation.ts         # Conversationモデル定義
```

## APIルート

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/chat` | メッセージ送信・ストリーミング応答。MongoDB に保存。|
| GET | `/api/conversations` | 会話一覧取得（タイトル・更新日時） |
| POST | `/api/conversations` | 新規会話作成 |
| GET | `/api/conversations/[id]` | 指定会話のメッセージ全件取得 |
| DELETE | `/api/conversations/[id]` | 指定会話の削除 |

## MongoDBスキーマ

### `conversations` コレクション

```ts
{
  _id: ObjectId,
  title: string,           // 最初のメッセージから自動生成（先頭30文字）
  createdAt: Date,
  updatedAt: Date,
  messages: [
    {
      role: "user" | "assistant",
      content: string,
      createdAt: Date,
    }
  ]
}
```

## 環境変数

```env
# .env.local
MONGODB_URI=mongodb+srv://...   # MongoDB接続文字列

# AI Gateway認証（OIDC — 自動トークン管理、手動ローテーション不要）
# セットアップ: vercel link && vercel env pull .env.local
# Vercelデプロイ時は自動更新、ローカルは ~24h で再取得が必要
VERCEL_OIDC_TOKEN=...           # vercel env pull で自動生成
```

## AIの設定

- **モデル**: `anthropic/claude-sonnet-4.6`（AI Gatewayルーティング）
- **ストリーミング**: `streamText` を使用
- **システムプロンプト**: 親切で丁寧な日本語AIアシスタント

```ts
// AI Gatewayの使い方（プロバイダー文字列で自動ルーティング）
import { streamText } from 'ai'

const result = streamText({
  model: 'anthropic/claude-sonnet-4.6',
  system: 'あなたは親切で丁寧な日本語のAIアシスタントです。',
  messages,
})
```

## 開発コマンド

```bash
npm install
npm run dev          # 開発サーバー起動（http://localhost:3000）
npm run build        # 本番ビルド
npm run typecheck    # 型チェック
```

## コーディング規約

- TypeScript strict mode を使用
- コメントは理由が自明でない場合のみ記載
- `useChat`（AI SDK React フック）でチャットUIの状態管理
- shadcn/ui コンポーネントを活用してUIを構築
- エラーハンドリングはAPI境界（外部APIコール）のみ実装

## 非機能要件

- **認証**: 不要（URLを知っている人が使える前提）
- **ユーザー管理**: 不要
- **ダークモード**: 不要
- **モバイル対応**: レスポンシブ対応（Tailwind）

## 今後の拡張ポイント（現時点では実装しない）

- 認証機能（NextAuth など）
- ファイル・画像アップロード
- AIモデルの切り替えUI
- RAG（ドキュメント検索）
