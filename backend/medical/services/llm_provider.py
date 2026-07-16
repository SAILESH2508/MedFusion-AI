import os
import logging
import asyncio
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass
from dotenv import load_dotenv
from google import genai
from google.genai import types
from openai import AsyncOpenAI
import anthropic
import cohere

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class ModelProvider(Enum):
    OPENAI = "openai"
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"


@dataclass
class ModelConfig:
    provider: ModelProvider
    model_name: str
    max_tokens: int = 4000
    cost_per_1k_tokens: float = 0.0


class LLMProvider:
    def __init__(self):
        self.clients = {}
        self.models = {
            "gpt-4o-mini": ModelConfig(
                ModelProvider.OPENAI, "gpt-4o-mini", max_tokens=16000
            ),
            "gemini-2.5-flash": ModelConfig(
                ModelProvider.GOOGLE, "gemini-2.5-flash", max_tokens=8192
            ),
            "gemini-2.5-pro": ModelConfig(
                ModelProvider.GOOGLE, "gemini-2.5-pro", max_tokens=8192
            ),
            "gemini-2.0-flash": ModelConfig(
                ModelProvider.GOOGLE, "gemini-2.0-flash", max_tokens=8192
            ),
            "gemini-flash-latest": ModelConfig(
                ModelProvider.GOOGLE, "gemini-flash-latest", max_tokens=8192
            ),
            "gemini-pro-latest": ModelConfig(
                ModelProvider.GOOGLE, "gemini-pro-latest", max_tokens=8192
            ),
            "gemini-3-flash-preview": ModelConfig(
                ModelProvider.GOOGLE, "gemini-3-flash-preview", max_tokens=8192
            ),
            "command-r": ModelConfig(
                ModelProvider.COHERE, "command-r", max_tokens=4000
            ),
            "command": ModelConfig(ModelProvider.COHERE, "command", max_tokens=4000),
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
        self.cohere_keys = [
            k.strip() for k in os.getenv("COHERE_API_KEY", "").split(",") if k.strip()
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
                elif provider == ModelProvider.COHERE and self.cohere_keys:
                    self.clients[client_key] = cohere.AsyncClient(
                        api_key=self.cohere_keys[key_idx % len(self.cohere_keys)]
                    )
            return self.clients.get(client_key)
        except Exception as e:
            logger.error(f"Failed to initialize {provider} client: {e}")
            return None

    async def generate_response(
        self,
        prompt: Union[str, List[Any]],
        model_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tried_models: Optional[List[str]] = None,
        timeout: float = 30.0,
        **kwargs,
    ) -> str:
        if not model_name:
            model_name = os.getenv("DEFAULT_LLM_MODEL", "gemini-2.5-flash")

        tried_models = tried_models or []
        config = self.models.get(model_name)

        if not config:
            # Fallback to a default if the requested model is missing
            model_name = "gemini-2.5-flash"
            config = self.models.get(model_name)
            if not config:
                return "AI system failure. No valid model configuration found."

        tried_models.append(model_name)
        provider = config.provider
        target_model = config.model_name

        try:
            client = self._get_client(provider)
            if not client:
                raise Exception(f"Provider {provider} not configured")

            if provider == ModelProvider.OPENAI:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": str(prompt)})
                res = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=target_model, messages=messages
                    ),
                    timeout=timeout,
                )
                return res.choices[0].message.content

            elif provider == ModelProvider.GOOGLE:
                contents = (
                    prompt
                    if isinstance(prompt, list)
                    else [{"role": "user", "parts": [{"text": prompt}]}]
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
                return res.text

            elif provider == ModelProvider.COHERE:
                h = (
                    [{"role": "SYSTEM", "message": system_prompt}]
                    if system_prompt
                    else []
                )
                res = await asyncio.wait_for(
                    client.chat(
                        model=target_model, message=str(prompt), chat_history=h
                    ),
                    timeout=timeout,
                )
                return res.text
            else:
                raise Exception(f"Unhandled provider: {provider}")

        except Exception as e:
            error_str = str(e).lower()
            logger.warning(f"Model {model_name} failed: {e}. Attempting fallback...")
            
            # Check for specific error types
            if "quota" in error_str or "exceeded" in error_str:
                logger.error(f"API quota exceeded for {model_name}")
            elif "connection" in error_str or "ssl" in error_str or "network" in error_str:
                logger.error(f"Network error for {model_name}")
            elif "permission" in error_str or "unauthorized" in error_str:
                logger.error(f"Authentication error for {model_name}")
            
            next_model = self._select_best_fallback(tried_models)
            if next_model:
                return await self.generate_response(
                    prompt, next_model, system_prompt, tried_models, timeout, **kwargs
                )
            return f"AI system failure. All fallbacks exhausted. Final error: {e}"

    def _select_best_fallback(self, tried_models: List[str]) -> Optional[str]:
        chain = [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-pro-latest",
            "gemini-3-flash-preview",
            "gpt-4o-mini",
            "command-r",
            "command",
        ]
        for model in chain:
            if model not in tried_models:
                return model
        return None


llm_provider = LLMProvider()
