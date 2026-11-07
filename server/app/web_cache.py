"""공식 웹 검색 답변의 로컬 JSON 캐시.

품목 원본(items.json)과 분리하여 검색 답변을 검토하기 쉽게 보관한다.
"""
import hashlib
import json
import logging
import os
import re
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from threading import Lock
from zoneinfo import ZoneInfo

from pydantic import ValidationError

from .schemas import WebAdvice
from .tavily_search import _trusted_url

logger = logging.getLogger(__name__)
DEFAULT_CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "web_advice_cache.json"
KST = ZoneInfo("Asia/Seoul")


def today() -> date:
    return datetime.now(KST).date()


def _simple_item_key(question: str, item_name: str) -> str | None:
    """상태 설명이 없는 일반적인 품목 질문만 품목 단위로 재사용한다."""
    clean = lambda text: re.sub(r"[^가-힣a-z0-9]", "", text.lower())
    item = clean(item_name)
    query = clean(question)
    if len(item) < 3 or not query.startswith(item):
        return None
    suffix = query[len(item):]
    plain_suffixes = {
        "", "버려요", "버리나요", "버리는법", "버리는방법", "분리배출방법",
        "어떻게버려요", "어떻게버리나요", "어떻게분리배출해요",
        "분리배출해요", "분리배출하나요", "어디에버려요", "어디로버려요",
    }
    return item if suffix.lstrip("은는이가을를") in plain_suffixes else None


class WebAdviceCache:
    def __init__(self, path: Path | str = DEFAULT_CACHE_PATH, ttl_days: int = 30):
        self.path = Path(path)
        self.ttl = timedelta(days=ttl_days)
        self.lock = Lock()

    @staticmethod
    def _question(question: str) -> str:
        # 사용자가 주소 등 개인 정보를 질문에 썼을 수 있으므로 원문을 파일에 남기지 않는다.
        normalized = " ".join(question.strip().split())
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def _read(self) -> list[dict]:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            if raw.get("version") != 1 or not isinstance(raw.get("entries"), list):
                return []
            return [entry for entry in raw["entries"] if isinstance(entry, dict)]
        except FileNotFoundError:
            return []
        except (OSError, ValueError, AttributeError) as exc:
            logger.warning("Web cache read failed: %s", type(exc).__name__)
            return []

    def get(self, question: str, region_id: str, area_id: str | None) -> WebAdvice | None:
        key = self._question(question)
        with self.lock:
            entries = self._read()
        for entry in reversed(entries):
            if entry.get("region_id") != region_id or entry.get("area_id") != area_id:
                continue
            if entry.get("question_hash") != key:
                item_name = (entry.get("web") or {}).get("item_name", "")
                if (not isinstance(item_name, str) or not entry.get("simple_item_key")
                        or _simple_item_key(question, item_name) != entry["simple_item_key"]):
                    continue
            try:
                saved = date.fromisoformat(entry["saved_on"])
                if saved > today() or today() - saved > self.ttl:
                    return None
                advice = WebAdvice.model_validate(entry["web"])
                if not all(_trusted_url(source.url) for source in advice.sources):
                    return None
                return advice
            except (KeyError, TypeError, ValueError, ValidationError):
                return None
        return None

    def put(self, question: str, region_id: str, area_id: str | None,
            advice: WebAdvice) -> None:
        # 검증되지 않은 검색 결과와 일반 사이트는 재사용 가능한 지식으로 저장하지 않는다.
        if not all(_trusted_url(source.url) for source in advice.sources):
            return
        key = self._question(question)
        saved_on = today().isoformat()
        with self.lock:
            entries = [entry for entry in self._read()
                       if not (entry.get("question_hash") == key
                               and entry.get("region_id") == region_id
                               and entry.get("area_id") == area_id)]
            entries.append({"question_hash": key, "region_id": region_id, "area_id": area_id,
                            "simple_item_key": _simple_item_key(question, advice.item_name),
                            "saved_on": saved_on, "web": advice.model_dump()})
            entries = entries[-200:]
            temp_path = None
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=self.path.parent,
                                                 prefix=".web_advice_cache.", suffix=".tmp",
                                                 delete=False) as output:
                    temp_path = Path(output.name)
                    json.dump({"version": 1, "entries": entries}, output,
                              ensure_ascii=False, indent=2)
                    output.write("\n")
                os.replace(temp_path, self.path)
            except OSError as exc:
                logger.warning("Web cache write failed: %s", type(exc).__name__)
                if temp_path is not None:
                    temp_path.unlink(missing_ok=True)
