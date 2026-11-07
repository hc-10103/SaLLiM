"""SaLLiM API. 실행: cd server && .venv/bin/uvicorn app.main:app --env-file .env"""
import base64
import binascii
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import data, waste_data
from .assemble import assemble, unknown_response
from .match import match_multiple_texts, match_text
from .providers import VisionProvider, get_provider
from .providers.base import Classification
from .schemas import (WEEKDAYS, AskRequest, AskResponse, AssistRequest, AssistResponse,
                      FollowUpRequest, Region, ScheduleResponse, TipAdvice,
                      WasteAreaDetail, WasteAreaSearch)

MAX_IMAGE_BYTES = 8 * 1024 * 1024
KST = ZoneInfo("Asia/Seoul")
logger = logging.getLogger(__name__)
CHEMICAL_TERMS = ("락스", "표백제", "염소계", "제거제", "세정제", "세제", "과탄산", "베이킹소다", "식초")
CLEANING_TERMS = ("청소", "곰팡이", "욕실", "변기", "싱크대", "배수구", "세척")


def safe_tip(tip: TipAdvice) -> TipAdvice:
    """모델이 청소 약품 사용법을 지어낸 경우 제품 표시 중심의 안전한 안내로 대체한다."""
    content = " ".join([tip.answer, *tip.steps, tip.caution or ""])
    topic = f"{tip.title} {tip.answer}"
    if not (any(term in topic for term in CLEANING_TERMS)
            and any(term in content for term in CHEMICAL_TERMS)):
        return tip
    return TipAdvice(
        category="생활", title="청소 제품은 표시대로 사용해요",
        answer="먼저 환기하고, 오염된 곳에 맞는 제품 하나를 골라 제품 표시의 사용법을 따르세요.",
        steps=["창문을 열거나 환풍기를 켜세요.", "제품 표시의 보호구·사용량·사용 시간을 확인하세요.",
               "사용 후 제품 표시대로 헹구고 물기를 닦아 말리세요."],
        caution="서로 다른 세정제는 절대 섞지 마세요. 넓게 번졌거나 반복되는 곰팡이는 전문가에게 문의하세요.",
    )


def create_app(store: data.Store | None = None, provider: VisionProvider | None = None,
               waste_store: waste_data.WasteStore | None = None) -> FastAPI:
    store = store or data.load()       # 데이터가 틀리면 여기서 DataError로 기동 실패
    waste_store = waste_store or waste_data.load()
    provider = provider or get_provider()
    app = FastAPI(title="SaLLiM API")
    # 모바일 앱·개발용 웹 미리보기. 쿠키 인증이 없으므로 전체 허용.
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    def region_or_404(region_id: str):
        region = store.regions.get(region_id)
        if region is None:
            raise HTTPException(404, f"알 수 없는 region_id: {region_id}")
        return region

    def resolve_area(area_id: str | None) -> WasteAreaDetail | None:
        return waste_store.by_id.get(area_id) if area_id else None

    def respond(c: Classification, region, area: WasteAreaDetail | None = None) -> AskResponse:
        if c.item_key not in store.items:
            return unknown_response()
        return assemble(c.item_key, store.items[c.item_key], region, c.state, c.confidence, area=area)

    def ask_provider(method, *args):
        try:
            return method(*args)
        except httpx.TimeoutException as exc:
            logger.warning("AI provider timeout: %s", type(exc).__name__)
            raise HTTPException(504, "AI 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요") from exc
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            logger.warning("AI provider HTTP status: %s", status)
            if status in (429, 503):
                raise HTTPException(503, "AI 서비스가 잠시 바빠요. 잠시 후 다시 시도해 주세요") from exc
            raise HTTPException(502, "AI 서비스 연결에 문제가 있어요. 서버 설정을 확인해 주세요") from exc
        except httpx.RequestError as exc:
            logger.warning("AI provider network error: %s", type(exc).__name__)
            raise HTTPException(503, "AI 서비스에 연결할 수 없어요. 잠시 후 다시 시도해 주세요") from exc

    def decode_image(image_base64: str) -> bytes:
        b64 = image_base64.split(",", 1)[-1]  # data URL 접두어 허용
        try:
            image = base64.b64decode(b64, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(422, "image_base64가 올바른 base64가 아닙니다")
        if len(image) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "이미지가 너무 큽니다 (긴 변 1024px JPEG로 줄여 주세요)")
        return image

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/regions", response_model=list[Region])
    def regions():
        return [Region(id=r.id, name=r.name) for r in store.regions.values()]

    @app.get("/waste-areas", response_model=WasteAreaSearch)
    def search_waste_areas(query: str = Query(..., min_length=2, max_length=80)):
        return waste_store.search(query)

    @app.get("/waste-areas/{area_id}", response_model=WasteAreaDetail)
    def get_waste_area(area_id: str):
        area = waste_store.by_id.get(area_id)
        if area is None:
            raise HTTPException(404, "해당 관리구역의 배출정보를 찾지 못했어요")
        return area

    @app.post("/ask", response_model=AskResponse)
    def ask(req: AskRequest):
        region = region_or_404(req.region_id)
        area = resolve_area(req.area_id)
        if req.image_base64:
            image = decode_image(req.image_base64)
            return respond(ask_provider(provider.classify, image, store.items), region, area)
        key = match_text(req.question, store.items)
        if key:
            return respond(Classification(key, 1.0), region, area)
        return respond(ask_provider(provider.match_text, req.question, store.items), region, area)

    @app.post("/assist", response_model=AssistResponse)
    def assist(req: AssistRequest):
        region = region_or_404(req.region_id)
        area = resolve_area(req.area_id)
        image = decode_image(req.image_base64) if req.image_base64 else None
        if image is None and req.question:
            keys = match_multiple_texts(req.question, store.items)
            if len(keys) > 1:
                return AssistResponse(
                    kind="recycling",
                    recycling_list=[respond(Classification(key, 1.0), region, area)
                                    for key in keys],
                )
        if image is None and req.question and "내 상황과 질문:" not in req.question:
            if any(word in req.question for word in ("버려", "분리", "재활용", "쓰레기", "배출")):
                fast_key = match_text(req.question, store.items)
                if fast_key:
                    return AssistResponse(
                        kind="recycling",
                        recycling=respond(Classification(fast_key, 1.0), region, area),
                    )
        decision = ask_provider(provider.assist, req.question, image, store.items)
        if decision.kind == "recycling" and decision.classification is not None:
            return AssistResponse(kind="recycling", recycling=respond(decision.classification, region, area))
        if decision.kind == "tip" and decision.tip is not None:
            return AssistResponse(kind="tip", tip=safe_tip(decision.tip))
        return AssistResponse(kind="unknown", message="상황을 조금 더 구체적으로 알려주세요. 물건 이름이나 문제를 함께 적어주면 도움이 돼요.")

    @app.post("/ask/followup", response_model=AskResponse)
    def followup(req: FollowUpRequest):
        region = region_or_404(req.region_id)
        area = resolve_area(req.area_id)
        item = store.items.get(req.item_key)
        if item is None:
            raise HTTPException(404, f"알 수 없는 item_key: {req.item_key}")
        return assemble(req.item_key, item, region, req.state, 1.0, area=area)

    @app.get("/schedule", response_model=ScheduleResponse)
    def schedule(region_id: str = Query(...)):
        region = region_or_404(region_id)
        today = WEEKDAYS[datetime.now(KST).weekday()]
        return ScheduleResponse(
            region_id=region.id, today=today,
            today_categories=list(region.week.get(today, [])),
            week={d: list(region.week.get(d, [])) for d in WEEKDAYS},
            time=region.time, sources=region.sources, note=region.note,
        )

    return app


app = create_app()
