.PHONY: setup setup-pipeline dev pipeline typecheck lint

setup:          ## Bootstrap frontend (npm install + .env.local)
	bash scripts/setup.sh

setup-pipeline: ## Bootstrap Python pipeline (venv + pip install)
	bash scripts/setup-pipeline.sh

dev:            ## Start Next.js dev server
	npm run dev

pipeline:       ## Start FastAPI pipeline locally
	source .venv/bin/activate && uvicorn pipeline.main:app --reload --port 8001

typecheck:      ## Run TypeScript type check
	npm run typecheck

lint:           ## Run ESLint
	npm run lint

help:           ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
