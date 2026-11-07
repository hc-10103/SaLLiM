"""Gemini 비전 프로바이더."""
import base64
import os

import httpx

from ..schemas import Item
from .base import (AssistDecision, Classification, VisionProvider, build_assist_prompt,
                   build_prompt, parse_assist_response, parse_response)


class GeminiVisionProvider(VisionProvider):
    name = "gemini"

    def __init__(self):
        self.api_key = os.environ["GEMINI_API_KEY"]
        self.model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")

    def _call(self, parts: list, max_tokens: int = 1024) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        config = {"responseMimeType": "application/json", "maxOutputTokens": max_tokens}
        if self.model.startswith("gemini-3"):
            config["thinkingConfig"] = {"thinkingLevel": "low"}
        r = httpx.post(url, timeout=30, headers={"x-goog-api-key": self.api_key}, json={
            "contents": [{"parts": parts}],
            "generationConfig": config,
        })
        r.raise_for_status()
        cands = r.json().get("candidates", [])
        return "".join(p.get("text", "") for c in cands for p in c.get("content", {}).get("parts", []))

    def classify(self, image: bytes, items: dict[str, Item]) -> Classification:
        return parse_response(self._call([
            {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(image).decode()}},
            {"text": build_prompt(items)},
        ]), items)

    def match_text(self, question: str, items: dict[str, Item]) -> Classification:
        return parse_response(self._call([{"text": build_prompt(items, question)}]), items)

    def assist(self, question: str | None, image: bytes | None,
               items: dict[str, Item]) -> AssistDecision:
        parts = []
        if image is not None:
            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(image).decode()}})
        parts.append({"text": build_assist_prompt(items, question)})
        return parse_assist_response(self._call(parts, max_tokens=1700), items)
