# 実行計画 — AI Chat App

## Phase 1: プロジェクト初期化

- [x] Next.js 16.2.6 プロジェクトを作成する（App Router / Turbopack / standalone出力）
- [x] shadcn/ui を初期化する（`components.json` 生成済み）
- [x] 必要なパッケージをインストールする
  - AI SDK: `ai@6.0.182` ✅
  - Hono: `hono@4.12.18` ✅（`@hono/node-server` は Next.js App Router 統合では不要）
  - Prisma + MongoDB: `prisma@7.8.0` / `@prisma/client` ✅、`npx prisma init` 済み
  - Mastra: `@mastra/core@1.34.0` ✅
  - MongoDB ドライバー: `mongodb@7.2.0` ✅
- [x] AI Elements をインストールする（`message` / `conversation` / `prompt-input`）
- [x] `.env.local` を作成し `.gitignore` に追加する

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

- [x] `lib/mastra/index.ts` に Mastra インスタンスを初期化する
- [x] `lib/mastra/agents/chat-agent.ts` にチャットエージェントを定義する
  - モデル: `anthropic/claude-sonnet-4.6`（AI Gateway経由）
  - システムプロンプト: 親切で丁寧な日本語AIアシスタント
- [x] AI Gateway の認証設定を `.env.local` に記載する
  - `AI_GATEWAY_API_KEY`（推奨）/ `VERCEL_OIDC_TOKEN` / `ANTHROPIC_API_KEY`（フォールバック）
- [x] ※ `components/ai-elements/prompt-input.tsx` の Base UI / Radix 型不一致 → 未使用のため削除で解消

---

## Phase 4: APIルート実装（Hono）

- [x] `app/api/[[...route]]/route.ts` に Hono を Next.js App Router と統合する
- [x] `GET /api/conversations` — 会話一覧取得（タイトル・更新日時、降順）を実装する
- [x] `POST /api/conversations` — 新規会話作成を実装する
- [x] `GET /api/conversations/:id` — 会話詳細（メッセージ全件）取得を実装する
- [x] `DELETE /api/conversations/:id` — 会話削除を実装する
- [x] `POST /api/chat` — ストリーミング応答を実装する
  - Mastraエージェント（`agent.stream()`）を呼び出す
  - `@mastra/ai-sdk` の `toAISdkStream` で AI SDK v6 形式に変換する
  - 応答完了後（`onFinish`）にメッセージを MongoDB へ保存する
  - `createUIMessageStreamResponse()` でレスポンスを返す

---

## Phase 5: フロントエンド実装

- [x] `app/layout.tsx` にグローバルレイアウト（フォント・メタデータ）を実装する
- [x] `app/page.tsx` にメインページを実装する（サイドバー + チャット画面の2カラムレイアウト）
- [x] `components/sidebar.tsx` を実装する
  - 会話一覧の表示（`GET /api/conversations`）
  - 新規会話ボタン
  - 会話削除ボタン
  - 選択中の会話をハイライト
- [x] `components/chat-window.tsx` を実装する
  - AI Elements の `<Conversation>` と `<Message>` を使用
  - `useChat` フックで状態管理（`DefaultChatTransport` 使用）
  - 選択された会話の履歴をロード
- [x] `components/message-input.tsx` を実装する
  - シンプルな textarea ベース（`<PromptInput>` は Base UI/Radix 型不一致のため不使用）
  - Enterキー送信・Shift+Enterで改行・高さ自動調整

---

## Phase 6: 動作確認（ローカル）

- [ ] `npm run dev` で開発サーバーを起動して全機能を確認する ※MongoDB Atlas 接続文字列設定後に実施
  - メッセージ送信とストリーミング表示
  - 会話履歴がMongoDBに保存されること
  - ページリロード後に履歴が復元されること
  - 複数会話の切り替え
  - 会話の削除
- [x] `npm run build` でビルドエラーがないことを確認する（`prompt-input.tsx` 削除で解消）
- [x] `npm run typecheck` で型エラーがないことを確認する（`typecheck` スクリプト追加）
- [ ] レスポンシブデザインをモバイル幅で確認する ※MongoDB Atlas 接続後に実施

---

## Phase 7: コンテナ化

- [x] `Dockerfile` を作成する（Node.js 22 Alpine ベース、マルチステージビルド）
- [x] `.dockerignore` を作成する
- [x] ローカルで `docker build` & `docker run` して動作確認する
      ※ MongoDB Atlas 接続文字列設定後に `/api/conversations` の完全動作確認を実施

---

## Phase 8: Google Cloud Run デプロイ

- [x] Google Cloud Project を作成する（`ai-chat-496815`）
- [x] 必要なAPIを有効化する（Cloud Run, Cloud Build, Artifact Registry）
- [x] Artifact Registry にリポジトリを作成する（`asia-northeast1-docker.pkg.dev/ai-chat-496815/ai-chat`）
- [x] Cloud Build でコンテナイメージをビルド・プッシュする
- [x] Cloud Run にデプロイする
  - Service URL: https://ai-chat-262623125111.asia-northeast1.run.app
  - 最小インスタンス数: 0、最大: 10、メモリ: 512Mi
- [ ] Cloud Run の環境変数を更新する（`MONGODB_URI` — 本番Atlas接続文字列に差し替え）
      ※ MongoDB Atlas クラスター作成後に `gcloud run services update` で設定
- [ ] デプロイ後のURLで全機能を確認する

---

## Phase 9: バグ修正・未実装箇所の対応

### 🔴 Critical — データ損失・クラッシュリスク

- [ ] **`lib/mongodb.ts`: 本番環境でコネクションが毎リクエスト新規生成**
      - `NODE_ENV !== "development"` の分岐でキャッシュなしに `new MongoClient().connect()` を毎回呼ぶ
      - リクエストごとに新規TCP接続が生成され、Atlas の接続数上限を消費する
      - module-level の `let _prodClientPromise` でキャッシュするよう修正する

- [ ] **`conversationId` が `null` のままメッセージ送信するとデータが保存されない**
      - 初期状態（会話未選択）で `MessageInput` が有効なため、そのまま送信できてしまう
      - `POST /api/chat` の `onFinish` は `!conversationId` で early return → MongoDB に保存されない
      - 対策A: 会話未選択時は `MessageInput` を `disabled` にしてメッセージを送れなくする
      - 対策B: `POST /api/chat` で `conversationId` がない場合に自動で会話を作成して保存する

- [ ] **会話タイトルの自動生成が未実装**（CLAUDE.md 仕様: 最初のメッセージ先頭30文字）
      - 現在は常に `"新しいチャット"` のまま変わらない
      - `POST /api/chat` の `onFinish` で、会話のメッセージ数が0→1になるタイミングで
        `$set: { title: userText.slice(0, 30) }` を実行する

- [ ] **Cloud Run のタイムアウトが 60 秒と短い**
      - Makefile の `make deploy` で `--timeout 60` を指定している
      - AI の長い応答（コード生成・説明など）は 60 秒を超えることがある
      - `--timeout 300`（5分）に変更する

### 🟡 Important — UX・信頼性

- [ ] **エラー状態の UI 表示がない**
      - `chat-window.tsx`: `useChat` の `status === "error"` 時にユーザーへの通知がない
      - `chat-window.tsx`: 会話履歴ロード失敗時に `catch(console.error)` のみ（UI に何も表示されない）
      - エラーメッセージ表示 or トースト通知を追加する

- [ ] **メッセージ送信後にサイドバーが自動更新されない**
      - `ChatWindow` と `Sidebar` は兄弟コンポーネントで、送信完了を互いに通知する仕組みがない
      - `page.tsx` に `onMessageSent` コールバックを追加し、`Sidebar` の `fetchConversations` を再実行する
      - これにより `updatedAt` 順の再ソートとタイトル更新がサイドバーに即座に反映される

- [ ] **ストリーミング中に会話を切り替えると旧ストリームが継続する**
      - `page.tsx` の `<ChatWindow>` に `key` prop がないため `useChat` インスタンスが会話をまたいで共有される
      - `<ChatWindow key={conversationId ?? "new"} ...>` を追加して会話切り替え時に強制リマウントする

- [ ] **会話削除に確認ダイアログがない**
      - `sidebar.tsx` の削除ボタンをクリックすると即座に削除される（アンドゥ不可）
      - `AlertDialog`（shadcn/ui）で確認を挟む

- [ ] **モバイルでサイドバーが常に表示されてチャットエリアが極端に狭くなる**
      - `w-64 shrink-0` の固定幅サイドバーがモバイルで常時表示される
      - ハンバーガーボタン + `Sheet`（shadcn/ui）でサイドバーをオーバーレイ表示するよう変更する

### 🟢 Medium — コード品質・運用

- [ ] **`POST /api/chat` の入力バリデーションがない**
      - `messages` が `undefined` や空配列の場合に `agent.stream()` がクラッシュする可能性がある
      - リクエスト先頭で `if (!messages?.length) return c.json({ error: "messages is required" }, 400)` を追加する

- [ ] **Makefile `make deploy` に環境変数設定がなく、サービス再作成時に ENV が消失する**
      - 現在の `make deploy` は `--set-env-vars` を含まないため、サービス削除後の初回デプロイで ENV が空になる
      - `make set-env` ターゲットを追加して `.env.local` から読み取った値を `gcloud run services update` で設定できるようにする
      - または Secret Manager を使用して環境変数を管理する

### ⚪ Low — 改善・リファクタリング

- [ ] **「+」ボタンで空の会話が即座に DB 作成される**
      - キャンセルや別会話への移動で中身のない会話がDBに積み上がる
      - 最初のメッセージ送信時に初めて会話を作成するフロー（send-then-create）に変更することを検討する

- [ ] **会話一覧にページネーション・件数上限がない**
      - 会話が増加すると全件取得で遅延が発生する可能性がある
      - `GET /api/conversations` に `limit` / `skip` パラメータを追加することを検討する（当面は不要）
