"""행정안전부 생활쓰레기배출정보 스냅샷 로더와 관리구역 검색."""
import json
import os
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from pydantic import ValidationError

from .data import DataError
from .schemas import WasteAreaDetail, WasteAreaSearch, WasteAreaSummary

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data/waste_areas.json"


@dataclass(frozen=True)
class WasteStore:
    areas: tuple[WasteAreaDetail, ...]
    by_id: dict[str, WasteAreaDetail]
    downloaded_on: str

    def search(self, query: str, limit: int = 30) -> WasteAreaSearch:
        words = normalize(query).split()
        matches = [area for area in self.areas if all(
            word in normalize(" ".join([area.city, area.district, area.zone, area.target]))
            for word in words)]
        matches.sort(key=lambda area: (area.city, area.district, area.zone, area.target, area.id))
        return WasteAreaSearch(items=[WasteAreaSummary.model_validate(area.model_dump())
                                      for area in matches[:limit]],
                               total=len(matches), downloaded_on=self.downloaded_on)


def normalize(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _clean_typo(row: dict) -> dict:
    cleaned = dict(row)
    for field in ("general_method", "food_method", "recycling_method"):
        if isinstance(cleaned.get(field), str):
            cleaned[field] = cleaned[field].replace("투병한 비닐", "투명한 비닐")
    return cleaned


def load(path: Path | None = None) -> WasteStore:
    path = path or Path(os.environ.get("SALLIM_WASTE_DATA_FILE") or DEFAULT_PATH)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        source_url = raw["source_url"]
        downloaded_on = raw["downloaded_on"]
        areas = tuple(WasteAreaDetail.model_validate({**_clean_typo(row), "source_url": source_url,
                                                       "downloaded_on": downloaded_on})
                      for row in raw["areas"])
    except (OSError, ValueError, KeyError, TypeError, ValidationError) as exc:
        raise DataError(f"배출정보 스냅샷 오류: {path}: {exc}") from exc
    by_id = {area.id: area for area in areas}
    if not areas or len(by_id) != len(areas):
        raise DataError(f"배출정보 스냅샷에 빈 데이터 또는 중복 ID가 있습니다: {path}")
    return WasteStore(areas=areas, by_id=by_id, downloaded_on=downloaded_on)
