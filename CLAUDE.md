# AI Chat App

シンプルなAIチャットアプリケーション。Anthropic ClaudeとリアルタイムでテキストチャットができるWebアプリ。友人・コミュニティ向けの限定公開を想定。

## 技術スタック

### フロントエンド

| レイヤー      | 技術                    |
| ------------- | ----------------------- |
| Framework     | Next.js 15 (App Router) |
| UI Components | shadcn/ui + AI Elements |
| Styling       | Tailwind CSS            |

### バックエンド

| レイヤー        | 技術                                      |
| --------------- | ----------------------------------------- |
| Framework       | Next.js 15 (App Router) + Hono            |
| ORM             | Prisma.js                                 |
| AI エージェント | Mastra                                    |
| AI Model        | Anthropic Claude (AI Gatewayルーティング) |
| Database        | MongoDB (会話履歴の永続化)                |

### インフラストラクチャ

- デプロイ先: Google Cloud Run
- 想定同時接続数: 5-10人

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

| Method | Path                      | 説明                                                 |
| ------ | ------------------------- | ---------------------------------------------------- |
| POST   | `/api/chat`               | メッセージ送信・ストリーミング応答。MongoDB に保存。 |
| GET    | `/api/conversations`      | 会話一覧取得（タイトル・更新日時）                   |
| POST   | `/api/conversations`      | 新規会話作成                                         |
| GET    | `/api/conversations/[id]` | 指定会話のメッセージ全件取得                         |
| DELETE | `/api/conversations/[id]` | 指定会話の削除                                       |

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

# AI Gateway認証（Vercel Dashboard で発行した長期 API キー）
# 取得: https://vercel.com/dashboard → AI Gateway → Create API Key
# ローカル: .env.local に設定
# 本番: GitHub Secrets (AI_GATEWAY_API_KEY) 経由で Cloud Run に自動設定
AI_GATEWAY_API_KEY=vatk_...
```

## AIの設定

- **モデル**: `anthropic/claude-sonnet-4.6`（AI Gatewayルーティング）
- **ストリーミング**: `streamText` を使用
- **システムプロンプト**: 親切で丁寧な日本語AIアシスタント

```ts
// AI Gatewayの使い方（プロバイダー文字列で自動ルーティング）
import { streamText } from "ai";

const result = streamText({
  model: "anthropic/claude-sonnet-4.6",
  system: "あなたは親切で丁寧な日本語のAIアシスタントです。",
  messages,
});
```

## 開発コマンド

プロジェクト管理コマンドは `Makefile` にまとめられています。`make <ターゲット>` で実行してください。

| コマンド | 内容 |
| --- | --- |
| `make install` | `npm ci` + `prisma generate`（初回セットアップ・依存更新後） |
| `make dev` | 開発サーバー起動（http://localhost:3000） |
| `make build` | 本番ビルド |
| `make typecheck` | 型チェック |
| `make docker-build` | ローカル Docker イメージビルド |
| `make docker-run` | ローカルコンテナ起動（http://localhost:3001） |
| `make push` | Cloud Build でビルド＆ Artifact Registry へプッシュ |
| `make deploy` | Cloud Run へデプロイ |
| `make logs` | Cloud Run のログ確認 |

通常のデプロイフロー: `make push && make deploy`

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

## デプロイ手順

1. Google Cloud Project の作成
1. Cloud Run の有効化
1. Dockerfile の作成
1. Cloud Build でのイメージビルド
1. Cloud Run へのデプロイ
1. 環境変数の設定

## 今後の拡張ポイント（現時点では実装しない）

- 認証機能（NextAuth など）
- ファイル・画像アップロード
- AIモデルの切り替えUI
- RAG（ドキュメント検索）
