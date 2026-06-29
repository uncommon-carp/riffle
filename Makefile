.DEFAULT_GOAL := help
.PHONY: help install dev dev-web dev-bff dev-agent build lint typecheck test clean

AGENT_DIR := apps/agent

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies (JS workspaces + Python agent)
	npm install
	cd $(AGENT_DIR) && uv sync

dev: ## Run web, bff, and agent together
	@echo "Starting web (:3000), bff (:3001), agent (:8000)... Ctrl-C to stop."
	@trap 'kill 0' INT TERM EXIT; \
		$(MAKE) dev-agent & \
		$(MAKE) dev-bff & \
		$(MAKE) dev-web & \
		wait

dev-web: ## Run the Next.js frontend
	npm run dev --workspace apps/web

dev-bff: ## Run the Hono BFF
	npm run dev --workspace apps/bff

dev-agent: ## Run the Python LangGraph agent
	cd $(AGENT_DIR) && uv run uvicorn riffle_agent.server:app --reload --port 8000

build: ## Build all JS workspaces
	npm run build --workspaces --if-present

lint: ## Lint JS workspaces + Python agent
	npm run lint --workspaces --if-present
	cd $(AGENT_DIR) && uv run ruff check .

typecheck: ## Typecheck JS workspaces
	npm run typecheck --workspaces --if-present

test: ## Run JS + Python tests
	npm run test --workspaces --if-present
	cd $(AGENT_DIR) && uv run pytest

clean: ## Remove build artifacts and dependencies
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/web/.next apps/*/dist
	rm -rf $(AGENT_DIR)/.venv
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
