# 実行計画 — AI Chat App

## Phase 1: プロジェクト初期化

- [ ] Next.js 15 プロジェクトを作成する
  - `npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"`
- [ ] shadcn/ui を初期化する
  - `npx shadcn@latest init`
- [ ] 必要なパッケージをインストールする
  - AI SDK: `npm install ai`
  - Hono (Next.js内APIルーター): `npm install hono @hono/node-server`
  - Prisma + MongoDB: `npm install prisma @prisma/client`、`npx prisma init --datasource-provider mongodb`
  - Mastra: `npm install @mastra/core`
  - MongoDB ドライバー: `npm install mongodb`
- [ ] AI Elements をインストールする
  - `npx ai-elements@latest add message conversation prompt-input`
- [ ] `.env.local` を作成し `.gitignore` に追加する

---

## Phase 2: データベース設計

- [ ] MongoDB Atlas でクラスターを作成し接続文字列を取得する（手動作業）
- [x] `prisma/schema.prisma` に `Conversation` モデルを定義する
- [x] `npx prisma generate` で Prisma Client を生成する
- [x] `lib/mongodb.ts` にネイティブ MongoDB クライアントのシングルトンを実装する
      ※ Prisma 7 の MongoDB adapter は未リリースのため native driver を使用
- [x] `lib/models/conversation.ts` に TypeScript 型定義を実装する

---

## Phase 3: AI エージェント設定（Mastra）

- [ ] `lib/mastra/index.ts` に Mastra インスタンスを初期化する
- [ ] `lib/mastra/agents/chat-agent.ts` にチャットエージェントを定義する
  - モデル: `anthropic/claude-sonnet-4.6`（AI Gateway経由）
  - システムプロンプト: 親切で丁寧な日本語AIアシスタント
- [ ] Vercel AI Gateway の認証設定をする
  - `ANTHROPIC_API_KEY` または `VERCEL_OIDC_TOKEN` を `.env.local` に設定

---

## Phase 4: APIルート実装（Hono）

- [ ] `app/api/[[...route]]/route.ts` に Hono を Next.js App Router と統合する
- [ ] `GET /api/conversations` — 会話一覧取得（タイトル・更新日時、降順）を実装する
- [ ] `POST /api/conversations` — 新規会話作成を実装する
- [ ] `GET /api/conversations/:id` — 会話詳細（メッセージ全件）取得を実装する
- [ ] `DELETE /api/conversations/:id` — 会話削除を実装する
- [ ] `POST /api/chat` — ストリーミング応答を実装する
  - `streamText` でMastraエージェントを呼び出す
  - 応答完了後にメッセージを MongoDB へ保存する
  - `toUIMessageStreamResponse()` でレスポンスを返す

---

## Phase 5: フロントエンド実装

- [ ] `app/layout.tsx` にグローバルレイアウト（フォント・メタデータ）を実装する
- [ ] `app/page.tsx` にメインページを実装する（サイドバー + チャット画面の2カラムレイアウト）
- [ ] `components/sidebar.tsx` を実装する
  - 会話一覧の表示（`GET /api/conversations`）
  - 新規会話ボタン
  - 会話削除ボタン
  - 選択中の会話をハイライト
- [ ] `components/chat-window.tsx` を実装する
  - AI Elements の `<Conversation>` と `<Message>` を使用
  - `useChat` フックで状態管理（`DefaultChatTransport` 使用）
  - 選択された会話の履歴をロード
- [ ] `components/message-input.tsx` を実装する
  - AI Elements の `<PromptInput>` を使用
  - Enterキー送信・Shift+Enterで改行

---

## Phase 6: 動作確認（ローカル）

- [ ] `npm run dev` で開発サーバーを起動して全機能を確認する
  - メッセージ送信とストリーミング表示
  - 会話履歴がMongoDBに保存されること
  - ページリロード後に履歴が復元されること
  - 複数会話の切り替え
  - 会話の削除
- [ ] `npm run build` でビルドエラーがないことを確認する
- [ ] `npm run typecheck` で型エラーがないことを確認する
- [ ] レスポンシブデザインをモバイル幅で確認する

---

## Phase 7: コンテナ化

- [ ] `Dockerfile` を作成する（Node.js 22 Alpine ベース、マルチステージビルド）
- [ ] `.dockerignore` を作成する
- [ ] ローカルで `docker build` & `docker run` して動作確認する

---

## Phase 8: Google Cloud Run デプロイ

- [ ] Google Cloud Project を作成する
- [ ] 必要なAPIを有効化する（Cloud Run, Cloud Build, Artifact Registry）
- [ ] Artifact Registry にリポジトリを作成する
- [ ] Cloud Build でコンテナイメージをビルド・プッシュする
  - `gcloud builds submit --tag gcr.io/PROJECT_ID/ai-chat`
- [ ] Cloud Run にデプロイする
  - `gcloud run deploy ai-chat --image gcr.io/PROJECT_ID/ai-chat --platform managed --region asia-northeast1`
- [ ] Cloud Run の環境変数を設定する（`MONGODB_URI`, `ANTHROPIC_API_KEY`）
- [ ] デプロイ後のURLで全機能を確認する
