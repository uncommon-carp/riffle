"""Runtime-swappable model abstraction.

The graph is model-agnostic: nodes call ``get_model(model_id)`` to obtain a
LangChain ``BaseChatModel``. The model id is passed per-request from the UI via
the BFF. Local (Ollama) models are cheap/zero-egress for classification; remote
models (Anthropic, OpenAI) are reserved for reasoning-heavy nodes.
"""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

# Default remote model — latest capable Claude.
DEFAULT_MODEL = "claude"

_ANTHROPIC_MODELS = {
    "claude": "claude-opus-4-8",
    "claude-opus": "claude-opus-4-8",
    "claude-sonnet": "claude-sonnet-4-6",
    "claude-haiku": "claude-haiku-4-5-20251001",
}


def get_model(model_id: str | None = None) -> BaseChatModel:
    """Resolve a model id to a configured LangChain chat model.

    Imports are lazy so a missing provider package/API key only fails when that
    provider is actually requested.
    """
    model_id = (model_id or DEFAULT_MODEL).strip()

    if model_id in _ANTHROPIC_MODELS:
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=_ANTHROPIC_MODELS[model_id], temperature=0)

    if model_id.startswith("gpt-") or model_id == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model="gpt-4o" if model_id == "openai" else model_id, temperature=0)

    # Anything else is treated as a local Ollama model tag (e.g. "llama3", "mistral").
    from langchain_ollama import ChatOllama

    return ChatOllama(model=model_id, temperature=0)
