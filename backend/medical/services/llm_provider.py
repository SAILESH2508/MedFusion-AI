import os
import logging
import asyncio
import base64
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass
from dotenv import load_dotenv
from google import genai
from google.genai import types
from openai import OpenAI

# Ensure environment variables are loaded from backend/.env regardless of CWD
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(os.path.dirname(_current_dir))
_env_path = os.path.join(_backend_dir, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

logger = logging.getLogger(__name__)


class AIProviderError(Exception):
    """Base exception for AI provider errors."""
    pass


class AIQuotaExceededError(AIProviderError):
    """Raised when AI API quota or rate limits are exhausted."""
    pass


class AIServiceUnavailableError(AIProviderError):
    """Raised when all configured AI providers fail or are unreachable."""
    pass


class AIInvalidInputError(AIProviderError):
    """Raised when an AI provider rejects input parameters (e.g. invalid image format)."""
    pass


class ModelProvider(Enum):
    OPENAI = "openai"
    GOOGLE = "google"


@dataclass
class ModelConfig:
    provider: ModelProvider
    model_name: str
    max_tokens: int = 4000
    cost_per_1k_tokens: float = 0.0


class LLMProvider:
    def __init__(self):
        self.clients = {}
        self.current_google_key_idx = 0
        self.current_openai_key_idx = 0
        self.openai_quota_exhausted = False
        self.google_quota_exhausted = False
        self.model_aliases = {
            "gemini-2.5-flash": "gemini-3-flash-preview",
            "gemini-2.5-flash-lite": "gemini-3-flash-preview",
            "gemini-2.5-pro": "gemini-3.5-flash",
            "gemini-2.0-flash": "gemini-3-flash-preview",
            "gemini-2.0": "gemini-3-flash-preview",
            "gemini-1.5-flash": "gemini-3-flash-preview",
            "gemini-1.5": "gemini-3-flash-preview",
            "gemini-flash": "gemini-3-flash-preview",
            "gemini-flash-latest": "gemini-3-flash-preview",
            "gemini-pro": "gemini-3.5-flash",
            "gemini-flash-lite": "gemini-3-flash-preview",
            "gemini-3.8-flash": "gemini-3-flash-preview",
            "gemini-3-flash": "gemini-3-flash-preview",
        }
        self.models = {
            # Primary — fast, multimodal, high precision (verified working)
            "gemini-3-flash-preview": ModelConfig(
                ModelProvider.GOOGLE, "gemini-3-flash-preview", max_tokens=8192
            ),
            # Secondary — high-capacity flash model
            "gemini-3.5-flash": ModelConfig(
                ModelProvider.GOOGLE, "gemini-3.5-flash", max_tokens=8192
            ),
            # Standard flash
            "gemini-2.5-flash": ModelConfig(
                ModelProvider.GOOGLE, "gemini-2.5-flash", max_tokens=8192
            ),
            # OpenAI fallback
            "gpt-4o-mini": ModelConfig(
                ModelProvider.OPENAI, "gpt-4o-mini", max_tokens=16000
            ),
        }
        self._load_keys()

    def _load_keys(self):
        self.openai_keys = [
            k.strip() for k in os.getenv("OPENAI_API_KEY", "").split(",") if k.strip()
        ]
        self.google_keys = [
            k.strip() for k in os.getenv("GOOGLE_API_KEY", "").split(",") if k.strip()
        ]
        if not self.google_keys:
            self.google_keys = [
                k.strip()
                for k in os.getenv("GEMINI_API_KEY", "").split(",")
                if k.strip()
            ]

    def _get_google_client(self, key_idx: int = 0) -> Optional[genai.Client]:
        if not self.google_keys:
            return None
        client_key = f"google_{key_idx}"
        try:
            if client_key not in self.clients:
                self.clients[client_key] = genai.Client(
                    api_key=self.google_keys[key_idx % len(self.google_keys)]
                )
            return self.clients.get(client_key)
        except Exception as e:
            logger.error(f"Failed to initialize Google client (key index {key_idx}): {e}")
            return None

    def _get_openai_client(self, key_idx: int = 0) -> Optional[OpenAI]:
        """
        Uses synchronous OpenAI client inside a thread pool (asyncio.to_thread).
        This completely eliminates the Windows asyncio 'Event loop is closed' bug
        because no httpx async client is attached to a closed event loop!
        """
        if not self.openai_keys:
            return None
        key = self.openai_keys[key_idx % len(self.openai_keys)]
        try:
            return OpenAI(api_key=key, timeout=30.0)
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client (key index {key_idx}): {e}")
            return None

    async def generate_response(
        self,
        prompt: Union[str, List[Any]],
        model_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tried_models: Optional[List[str]] = None,
        timeout: float = 60.0,
        google_key_idx: Optional[int] = None,
        **kwargs,
    ) -> str:
        if not model_name:
            model_name = os.getenv("DEFAULT_LLM_MODEL", "gemini-3-flash-preview")

        # Resolve alias if present
        model_name = self.model_aliases.get(model_name, model_name)

        tried_models = tried_models or []
        config = self.models.get(model_name)

        if not config:
            model_name = "gemini-3-flash-preview"
            config = self.models.get(model_name)
            if not config:
                raise AIServiceUnavailableError("No valid model configuration found.")

        tried_models.append(model_name)
        provider = config.provider
        target_model = config.model_name

        current_key_idx = google_key_idx if google_key_idx is not None else self.current_google_key_idx

        try:
            if provider == ModelProvider.OPENAI:
                if self.openai_quota_exhausted:
                    raise AIQuotaExceededError("OpenAI quota previously exhausted. Skipping.")

                client = self._get_openai_client(self.current_openai_key_idx)
                if not client:
                    raise AIServiceUnavailableError("OpenAI client not configured with valid API keys.")

                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})

                # Handle multimodal (vision) input
                if isinstance(prompt, list):
                    content_parts = []
                    for item in prompt:
                        if isinstance(item, str):
                            content_parts.append({"type": "text", "text": item})
                        elif hasattr(item, "inline_data") and hasattr(item.inline_data, "data"):
                            b64 = base64.b64encode(item.inline_data.data).decode("utf-8")
                            mime = getattr(item.inline_data, "mime_type", "image/jpeg")
                            content_parts.append({
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime};base64,{b64}"}
                            })
                        elif isinstance(item, dict) and "data" in item:
                            b64 = base64.b64encode(item["data"]).decode("utf-8")
                            mime = item.get("mime_type", "image/jpeg")
                            content_parts.append({
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime};base64,{b64}"}
                            })
                        else:
                            content_parts.append({"type": "text", "text": str(item)})
                    messages.append({"role": "user", "content": content_parts})
                else:
                    messages.append({"role": "user", "content": str(prompt)})

                # Execute synchronously in a worker thread to prevent event loop closure issues
                def sync_openai_completion():
                    return client.chat.completions.create(
                        model=target_model,
                        messages=messages,
                        temperature=kwargs.get("temperature", 0.3)
                    )

                res = await asyncio.wait_for(
                    asyncio.to_thread(sync_openai_completion),
                    timeout=timeout
                )
                return res.choices[0].message.content or ""

            elif provider == ModelProvider.GOOGLE:
                client = self._get_google_client(current_key_idx)
                if not client:
                    raise AIServiceUnavailableError("Google client not configured with valid API keys.")

                contents = prompt if isinstance(prompt, list) else str(prompt)

                def sync_generate():
                    return client.models.generate_content(
                        model=target_model,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            temperature=kwargs.get("temperature", 0.3),
                            system_instruction=system_prompt,
                        ),
                    )

                res = await asyncio.wait_for(
                    asyncio.to_thread(sync_generate),
                    timeout=timeout,
                )
                text = ""
                try:
                    text = res.text or ""
                except Exception:
                    if hasattr(res, 'candidates') and res.candidates:
                        first_candidate = res.candidates[0]
                        if hasattr(first_candidate, 'content') and first_candidate.content and hasattr(first_candidate.content, 'parts'):
                            text = "".join(getattr(p, 'text', '') or '' for p in first_candidate.content.parts)
                return text

            else:
                raise AIServiceUnavailableError(f"Unhandled provider: {provider}")

        except Exception as e:
            err_name = type(e).__name__
            err_msg = str(e) if str(e).strip() else err_name
            error_str = err_msg.lower()
            logger.warning(f"Model {model_name} failed: {err_msg}. Attempting fallback...")

            # Check if this is an invalid argument error (e.g. Gemini 400 INVALID_ARGUMENT)
            if "invalid_argument" in error_str or "400" in error_str:
                logger.error(f"Provider rejected input format (400 INVALID_ARGUMENT): {err_msg}")
                raise AIInvalidInputError(f"Input rejected by AI provider: {err_msg}")

            # Check for quota exhaustion
            is_quota_error = any(w in error_str for w in ["quota", "insufficient_quota", "resource_exhausted", "429"])

            if provider == ModelProvider.OPENAI and is_quota_error:
                self.openai_quota_exhausted = True
                logger.warning("Marked OpenAI quota as exhausted.")

            # If Google key quota is exhausted, try rotating to next Google key first
            if provider == ModelProvider.GOOGLE and is_quota_error and len(self.google_keys) > 1:
                next_key_idx = (current_key_idx + 1) % len(self.google_keys)
                if next_key_idx != self.current_google_key_idx:
                    logger.info(f"Rotating Google API key from index {current_key_idx} to {next_key_idx}")
                    self.current_google_key_idx = next_key_idx
                    return await self.generate_response(
                        prompt, model_name, system_prompt, tried_models, timeout, google_key_idx=next_key_idx, **kwargs
                    )

            # If quota is exhausted on Google and OpenAI is available and has not exhausted quota
            if provider == ModelProvider.GOOGLE and is_quota_error:
                if self.openai_keys and not self.openai_quota_exhausted and "gpt-4o-mini" not in tried_models:
                    logger.info("Google quota exhausted. Attempting fallback to OpenAI gpt-4o-mini.")
                    return await self.generate_response(
                        prompt, "gpt-4o-mini", system_prompt, tried_models, timeout, **kwargs
                    )
                raise AIQuotaExceededError(f"AI API quota exhausted across available providers.")

            # Try other models in chain
            next_model = self._select_best_fallback(tried_models)
            if next_model:
                return await self.generate_response(
                    prompt, next_model, system_prompt, tried_models, timeout, google_key_idx=current_key_idx, **kwargs
                )

            # All options exhausted
            if is_quota_error:
                raise AIQuotaExceededError(f"All AI model fallbacks exhausted due to quota limits: {err_msg}")
            raise AIServiceUnavailableError(f"All AI model fallbacks exhausted. Final error: {err_msg}")

    def _select_best_fallback(self, tried_models: List[str]) -> Optional[str]:
        chain = [
            'gemini-3-flash-preview',
            'gemini-3.5-flash',
            'gpt-4o-mini',
        ]
        for model in chain:
            if model not in tried_models:
                # Skip OpenAI if quota is known to be exhausted
                if model == "gpt-4o-mini" and self.openai_quota_exhausted:
                    continue
                return model
        return None


llm_provider = LLMProvider()
