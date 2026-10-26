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
from openai import AsyncOpenAI

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


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

    def _get_client(self, provider: ModelProvider, key_idx: int = 0) -> Any:
        client_key = f"{provider.value}_{key_idx}"
        try:
            if client_key not in self.clients:
                if provider == ModelProvider.OPENAI and self.openai_keys:
                    self.clients[client_key] = AsyncOpenAI(
                        api_key=self.openai_keys[key_idx % len(self.openai_keys)]
                    )
                elif provider == ModelProvider.GOOGLE and self.google_keys:
                    self.clients[client_key] = genai.Client(
                        api_key=self.google_keys[key_idx % len(self.google_keys)]
                    )
            return self.clients.get(client_key)
        except Exception as e:
            logger.error(f"Failed to initialize {provider} client (key index {key_idx}): {e}")
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
                return "AI system failure. No valid model configuration found."

        tried_models.append(model_name)
        provider = config.provider
        target_model = config.model_name

        current_key_idx = google_key_idx if google_key_idx is not None else self.current_google_key_idx

        try:
            client = self._get_client(provider, current_key_idx if provider == ModelProvider.GOOGLE else self.current_openai_key_idx)
            if not client:
                raise Exception(f"Provider {provider} not configured with valid API keys")

            if provider == ModelProvider.OPENAI:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})

                # Handle multimodal (vision) input if prompt contains images/types.Part
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
                        else:
                            content_parts.append({"type": "text", "text": str(item)})
                    messages.append({"role": "user", "content": content_parts})
                else:
                    messages.append({"role": "user", "content": str(prompt)})

                res = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=target_model, messages=messages
                    ),
                    timeout=timeout,
                )
                return res.choices[0].message.content or ""

            elif provider == ModelProvider.GOOGLE:
                contents = (
                    prompt
                    if isinstance(prompt, list)
                    else str(prompt)
                )
                def sync_generate():
                    return client.models.generate_content(
                        model=target_model,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            temperature=kwargs.get("temperature", 0.7),
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
                raise Exception(f"Unhandled provider: {provider}")

        except Exception as e:
            err_name = type(e).__name__
            err_msg = str(e) if str(e).strip() else err_name
            error_str = err_msg.lower()
            logger.warning(f"Model {model_name} failed: {err_msg}. Attempting fallback...")

            is_quota_error = any(w in error_str for w in ["quota", "exceeded", "resource_exhausted", "429"])
            
            # If Google key quota is exhausted, try rotating to the next Google API key first
            if provider == ModelProvider.GOOGLE and is_quota_error and len(self.google_keys) > 1:
                next_key_idx = (current_key_idx + 1) % len(self.google_keys)
                if next_key_idx != self.current_google_key_idx:
                    logger.info(f"Rotating Google API key from index {current_key_idx} to {next_key_idx}")
                    self.current_google_key_idx = next_key_idx
                    # Retry with the same or primary model using the new key
                    return await self.generate_response(
                        prompt, model_name, system_prompt, tried_models, timeout, google_key_idx=next_key_idx, **kwargs
                    )

            # If quota is exhausted on all Google keys or if model unavailable, immediately route to OpenAI if available
            if provider == ModelProvider.GOOGLE and is_quota_error:
                logger.error(f"Google API quota exhausted. Bypassing remaining Google models to OpenAI fallback.")
                if self.openai_keys and "gpt-4o-mini" not in tried_models:
                    return await self.generate_response(
                        prompt, "gpt-4o-mini", system_prompt, tried_models, timeout, **kwargs
                    )
                return f"AI system failure. API quota exceeded for {model_name}"

            next_model = self._select_best_fallback(tried_models)
            if next_model:
                return await self.generate_response(
                    prompt, next_model, system_prompt, tried_models, timeout, google_key_idx=current_key_idx, **kwargs
                )
            return f"AI system failure. All fallbacks exhausted. Final error: {err_msg}"

    def _select_best_fallback(self, tried_models: List[str]) -> Optional[str]:
        chain = [
            'gemini-3-flash-preview',
            'gemini-3.5-flash',
            'gpt-4o-mini',
        ]
        for model in chain:
            if model not in tried_models:
                return model
        return None


llm_provider = LLMProvider()
