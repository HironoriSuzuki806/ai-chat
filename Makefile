PROJECT_ID  := ai-chat-496815
REGION      := asia-northeast1
SERVICE     := ai-chat
IMAGE       := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(SERVICE)/$(SERVICE):latest

.PHONY: install dev build typecheck \
        docker-build docker-run \
        push deploy logs

# ── ローカル開発 ──────────────────────────────────────────────
install:
	npm ci
	npx prisma generate

dev:
	npm run dev

build:
	npm run build

typecheck:
	npm run typecheck

# ── Docker（ローカル確認用）────────────────────────────────────
docker-build:
	docker build -t $(SERVICE):local .

docker-run:
	docker run --rm -p 3001:3000 --env-file .env.local $(SERVICE):local

# ── Cloud Run デプロイ ────────────────────────────────────────
push:
	gcloud builds submit \
		--tag $(IMAGE) \
		--project $(PROJECT_ID) \
		--region $(REGION) \
		.

deploy:
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE) \
		--platform managed \
		--region $(REGION) \
		--allow-unauthenticated \
		--min-instances 0 \
		--max-instances 10 \
		--memory 512Mi \
		--cpu 1 \
		--timeout 60 \
		--project $(PROJECT_ID)

logs:
	gcloud run services logs read $(SERVICE) \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--limit 50
