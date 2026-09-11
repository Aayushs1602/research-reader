import os
import re
import json
import logging
from typing import Optional, Dict, Any, List
import httpx

from app.core.config import PROVIDER_ENV_KEYS, IS_PROD

logger = logging.getLogger(__name__)

DEFAULT_OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

class LLMProviderError(Exception):
    """Custom exception for LLM provider errors."""
    pass

async def get_ollama_models(base_url: str = DEFAULT_OLLAMA_URL) -> List[str]:
    """Fetch all locally installed models from Ollama."""
    url = f"{base_url.rstrip('/')}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                return models
    except Exception as e:
        logger.debug(f"Could not connect to Ollama at {url}: {e}")
    return []

async def test_llm_connection(
    provider: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    ollama_url: str = DEFAULT_OLLAMA_URL,
) -> Dict[str, Any]:
    """Quick test to verify that the provider and key/server are operational."""
    provider = provider.lower()

    if provider == "ollama":
        url = f"{ollama_url.rstrip('/')}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                    return {
                        "success": True,
                        "provider": "ollama",
                        "message": f"Connected to Ollama. {len(models)} model(s) available.",
                        "models": models,
                    }
                return {
                    "success": False,
                    "provider": "ollama",
                    "message": f"Ollama returned HTTP {resp.status_code}",
                }
        except Exception as e:
            return {
                "success": False,
                "provider": "ollama",
                "message": f"Cannot connect to Ollama at {ollama_url}. Is Ollama running? ({str(e)})",
            }

    key_source = "request"
    if not api_key:
        env_var = PROVIDER_ENV_KEYS.get(provider)
        if env_var and os.getenv(env_var):
            api_key = os.getenv(env_var)
            key_source = f"env ({env_var})"

    if not api_key:
        env_var = PROVIDER_ENV_KEYS.get(provider, "API_KEY")
        return {
            "success": False,
            "provider": provider,
            "message": f"{provider.capitalize()} API key is required. Enter it in settings or configure {env_var} in backend/.env.",
        }

    if provider == "gemini":
        model_name = model or "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": "Hello, respond with 'OK'."}]}],
                        "generationConfig": {"maxOutputTokens": 10},
                    },
                )
                if resp.status_code == 200:
                    return {
                        "success": True,
                        "provider": "gemini",
                        "message": f"Gemini API key is valid and working! (Key source: {key_source})",
                        "key_source": key_source,
                    }
                err_body = resp.json()
                err_msg = err_body.get("error", {}).get("message", f"HTTP {resp.status_code}")
                return {"success": False, "provider": "gemini", "message": f"Gemini error: {err_msg}"}
        except Exception as e:
            return {"success": False, "provider": "gemini", "message": f"Gemini connection failed: {str(e)}"}

    elif provider == "anthropic":
        test_model = model or "claude-3-5-haiku-20241022"
        url = "https://api.anthropic.com/v1/messages"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    url,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": test_model,
                        "max_tokens": 10,
                        "messages": [{"role": "user", "content": "Hi"}],
                    },
                )
                if resp.status_code == 200:
                    return {
                        "success": True,
                        "provider": "anthropic",
                        "message": f"Anthropic Claude API key is valid! (Key source: {key_source})",
                        "key_source": key_source,
                    }
                err_body = resp.json()
                err_msg = err_body.get("error", {}).get("message", f"HTTP {resp.status_code}")
                return {"success": False, "provider": "anthropic", "message": f"Anthropic error: {err_msg}"}
        except Exception as e:
            return {"success": False, "provider": "anthropic", "message": f"Anthropic connection failed: {str(e)}"}

    elif provider in ("openai", "groq", "deepseek"):
        if provider == "openai":
            base_url = "https://api.openai.com/v1"
            test_model = model or "gpt-4o-mini"
        elif provider == "groq":
            base_url = "https://api.groq.com/openai/v1"
            test_model = model or "llama-3.3-70b-versatile"
        else:  # deepseek
            base_url = "https://api.deepseek.com"
            test_model = model or "deepseek-chat"

        url = f"{base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": test_model,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 10,
                    },
                )
                if resp.status_code == 200:
                    return {
                        "success": True,
                        "provider": provider,
                        "message": f"{provider.capitalize()} API key is valid! (Key source: {key_source})",
                        "key_source": key_source,
                    }
                err_body = resp.json()
                err_msg = err_body.get("error", {}).get("message", f"HTTP {resp.status_code}")
                return {"success": False, "provider": provider, "message": f"{provider.capitalize()} error: {err_msg}"}
        except Exception as e:
            return {"success": False, "provider": provider, "message": f"{provider.capitalize()} connection failed: {str(e)}"}

    return {"success": False, "provider": provider, "message": f"Unknown provider: {provider}"}

async def generate_completion(
    prompt: str,
    system_prompt: Optional[str] = None,
    provider: str = "ollama",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    temperature: float = 0.3,
    max_tokens: int = 1500,
) -> str:
    """
    Unified text completion generator across Local Ollama, Gemini, OpenAI, Claude, Groq, and DeepSeek.
    """
    provider = (provider or ("gemini" if IS_PROD else "ollama")).lower()

    if provider == "ollama":
        raw = await _generate_ollama(
            prompt=prompt,
            system_prompt=system_prompt,
            model=model,
            ollama_url=ollama_url,
            temperature=temperature,
        )

    elif provider == "gemini":
        key = api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            raise LLMProviderError(
                "Gemini API key is required in production mode. Please enter your API key in AI Settings (gear icon) or configure GEMINI_API_KEY in backend/.env."
            )
        raw = await _generate_gemini(
            prompt=prompt,
            system_prompt=system_prompt,
            api_key=key,
            model=model or "gemini-1.5-flash",
            temperature=temperature,
            max_tokens=max_tokens,
        )

    elif provider == "anthropic":
        key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise LLMProviderError(
                "Anthropic Claude API key is required in production mode. Please enter your API key in AI Settings (gear icon) or configure ANTHROPIC_API_KEY in backend/.env."
            )
        raw = await _generate_anthropic(
            prompt=prompt,
            system_prompt=system_prompt,
            api_key=key,
            model=model or "claude-3-5-sonnet-20241022",
            temperature=temperature,
            max_tokens=max_tokens,
        )

    elif provider in ("openai", "groq", "deepseek"):
        env_var = PROVIDER_ENV_KEYS.get(provider, "OPENAI_API_KEY")
        key = api_key or os.getenv(env_var)
        if not key:
            raise LLMProviderError(
                f"{provider.capitalize()} API key is required in production mode. Please enter your API key in AI Settings (gear icon) or configure {env_var} in backend/.env."
            )
        raw = await _generate_openai_compatible(
            prompt=prompt,
            system_prompt=system_prompt,
            provider=provider,
            api_key=key,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    else:
        raise LLMProviderError(f"Unsupported AI provider: {provider}")

    return strip_unwanted_markdown_fences(raw)

def strip_unwanted_markdown_fences(text: str) -> str:
    """
    Strips accidental ```markdown ... ``` or ``` ... ``` wrappers that local models
    like Ollama sometimes enclose their entire response with.
    """
    if not text:
        return ""
    stripped = text.strip()

    # Match ```markdown ... ```
    match = re.match(r"^```(?:markdown|md)?\s*\n([\s\S]*?)\n```(?:\s*\n\s*[\s\S]*)?$", stripped, re.IGNORECASE)
    if match:
        inner = match.group(1).strip()
        trailing = re.sub(r"^```(?:markdown|md)?\s*\n[\s\S]*?\n```\s*", "", stripped, flags=re.IGNORECASE).strip()
        if trailing:
            return f"{inner}\n\n{trailing}"
        return inner
    return stripped

async def _generate_ollama(
    prompt: str,
    system_prompt: Optional[str],
    model: Optional[str],
    ollama_url: str,
    temperature: float,
) -> str:
    """Generate response via Ollama /api/chat."""
    base_url = ollama_url.rstrip("/")

    # If no model specified, auto-detect from Ollama tags
    if not model:
        models = await get_ollama_models(base_url)
        if not models:
            raise LLMProviderError(
                "Ollama is running, but no models were found. Pull a model using: `ollama run qwen2.5:3b` or `ollama pull llama3.2`."
            )
        model = models[0]

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{base_url}/api/chat", json=payload)
            if resp.status_code != 200:
                raise LLMProviderError(f"Ollama error (HTTP {resp.status_code}): {resp.text}")
            data = resp.json()
            msg = data.get("message", {})
            return msg.get("content", "").strip()
    except httpx.ConnectError:
        raise LLMProviderError(
            f"Cannot connect to local Ollama at {base_url}. Make sure Ollama is running (`ollama serve`)."
        )
    except Exception as e:
        raise LLMProviderError(f"Ollama invocation error: {str(e)}")

async def _generate_gemini(
    prompt: str,
    system_prompt: Optional[str],
    api_key: Optional[str],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """Generate response via Google Gemini REST API."""
    if not api_key:
        raise LLMProviderError(
            "Gemini API Key is missing. Enter your key in the AI Settings (BYOK) or set GEMINI_API_KEY."
        )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    body: Dict[str, Any] = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    if system_prompt:
        body["systemInstruction"] = {
            "parts": [{"text": system_prompt}]
        }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=body)
            if resp.status_code != 200:
                err_data = resp.json()
                err_msg = err_data.get("error", {}).get("message", resp.text)
                raise LLMProviderError(f"Gemini API error ({resp.status_code}): {err_msg}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise LLMProviderError("Gemini returned an empty candidate list.")

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            text_result = "".join(p.get("text", "") for p in parts)
            return text_result.strip()
    except LLMProviderError:
        raise
    except Exception as e:
        raise LLMProviderError(f"Gemini request failed: {str(e)}")

async def _generate_anthropic(
    prompt: str,
    system_prompt: Optional[str],
    api_key: Optional[str],
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """Generate response via Anthropic Claude Messages API."""
    if not api_key:
        raise LLMProviderError(
            "Anthropic API Key is missing. Enter your key in the AI Settings (BYOK)."
        )

    url = "https://api.anthropic.com/v1/messages"
    body: Dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    }

    if system_prompt:
        body["system"] = system_prompt

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                url,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json=body,
            )
            if resp.status_code != 200:
                err_data = resp.json()
                err_msg = err_data.get("error", {}).get("message", resp.text)
                raise LLMProviderError(f"Anthropic error ({resp.status_code}): {err_msg}")

            data = resp.json()
            content_blocks = data.get("content", [])
            if not content_blocks:
                raise LLMProviderError("Anthropic returned empty content.")

            return "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text").strip()
    except LLMProviderError:
        raise
    except Exception as e:
        raise LLMProviderError(f"Anthropic request failed: {str(e)}")

async def _generate_openai_compatible(
    prompt: str,
    system_prompt: Optional[str],
    provider: str,
    api_key: Optional[str],
    model: Optional[str],
    temperature: float,
    max_tokens: int,
) -> str:
    """Generate response via OpenAI, Groq, or DeepSeek chat completions."""
    if not api_key:
        raise LLMProviderError(
            f"{provider.capitalize()} API key is missing. Enter your key in AI Settings (BYOK)."
        )

    if provider == "groq":
        base_url = "https://api.groq.com/openai/v1"
        model_name = model or "llama-3.3-70b-versatile"
    elif provider == "deepseek":
        base_url = "https://api.deepseek.com"
        model_name = model or "deepseek-chat"
    else:
        base_url = "https://api.openai.com/v1"
        model_name = model or "gpt-4o-mini"

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            if resp.status_code != 200:
                err_data = resp.json()
                err_msg = err_data.get("error", {}).get("message", resp.text)
                raise LLMProviderError(f"{provider.capitalize()} error ({resp.status_code}): {err_msg}")

            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                raise LLMProviderError(f"{provider.capitalize()} returned empty choices.")

            return choices[0].get("message", {}).get("content", "").strip()
    except LLMProviderError:
        raise
    except Exception as e:
        raise LLMProviderError(f"{provider.capitalize()} request failed: {str(e)}")
