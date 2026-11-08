"""SaLLiM API. 실행: cd server && .venv/bin/uvicorn app.main:app --env-file .env"""
import base64
import binascii
import logging
import os
import re
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import data, waste_data
from .assemble import assemble, unknown_response
from .match import extract_user_question, infer_text_state, match_multiple_texts, match_text
from .providers import VisionProvider, get_provider
from .providers.base import Classification, TipTopic
from .schemas import (WEEKDAYS, AskRequest, AskResponse, AssistRequest, AssistResponse,
                      FollowUpRequest, ItemSummary, Region, ScheduleResponse, TipAdvice,
                      WasteAreaDetail, WasteAreaSearch, WebAdvice)
from .tavily_search import TavilySearch, direct_instruction, item_search_terms
from .web_cache import WebAdviceCache, DEFAULT_CACHE_PATH

MAX_IMAGE_BYTES = 8 * 1024 * 1024
KST = ZoneInfo("Asia/Seoul")
logger = logging.getLogger(__name__)
CHEMICAL_TERMS = ("락스", "표백제", "염소계", "제거제", "세정제", "세제", "과탄산", "베이킹소다", "식초")
HOUSEHOLD_CLEANER_TERMS = ("락스", "표백제", "염소계", "제거제", "세정제", "세제", "과탄산")


def safe_tip(tip: TipAdvice, intent: TipTopic | None = None) -> TipAdvice:
    """의도 분류 결과에 맞춰 안전 필터를 적용한다. '세척' 같은 단어는 주제 판별에 쓰지 않는다."""
    content = " ".join([tip.answer, *tip.steps, tip.caution or ""])
    actionable = " ".join([tip.answer, *tip.steps])
    unsafe_mix = (any(word in actionable for word in ("섞", "혼합"))
                  and any(word in actionable for word in ("락스", "표백제", "염소계"))
                  and any(word in actionable for word in ("식초", "세제", "세정제", "과탄산")))
    if intent == "food":
        if any(term in actionable for term in HOUSEHOLD_CLEANER_TERMS):
            return TipAdvice(
                category="생활", title="식재료 조리 안내를 다시 확인해 주세요",
                answer="식재료에 가정용 세정제나 표백제를 사용하지 마세요. 이 답변은 조리 질문에 맞지 않아 표시하지 않았어요.",
                steps=["식재료별 세척·조리 방법을 식품안전나라 등 공식 안내에서 확인해 주세요."],
                caution="가정용 청소 제품을 식재료에 사용하지 마세요.",
            )
        return tip
    if not (unsafe_mix or (intent == "home_cleaning"
                           and any(term in content for term in CHEMICAL_TERMS))):
        return tip
    return TipAdvice(
        category="생활", title="청소 제품은 표시대로 사용해요",
        answer="먼저 환기하고, 오염된 곳에 맞는 제품 하나를 골라 제품 표시의 사용법을 따르세요.",
        steps=["창문을 열거나 환풍기를 켜세요.", "제품 표시의 보호구·사용량·사용 시간을 확인하세요.",
               "사용 후 제품 표시대로 헹구고 물기를 닦아 말리세요."],
        caution="서로 다른 세정제는 절대 섞지 마세요. 넓게 번졌거나 반복되는 곰팡이는 전문가에게 문의하세요.",
    )


def create_app(store: data.Store | None = None, provider: VisionProvider | None = None,
               waste_store: waste_data.WasteStore | None = None,
               tavily: TavilySearch | None = None,
               web_cache: WebAdviceCache | None = None) -> FastAPI:
    use_default_store = store is None
    store = store or data.load()       # 데이터가 틀리면 여기서 DataError로 기동 실패
    waste_store = waste_store or waste_data.load()
    provider = provider or get_provider()
    if getattr(provider, "name", "") == "mock":
        logger.warning("VISION_PROVIDER=mock — 사진·생활 질문에 예시 답만 나와요. 실제 답은 server/.env에 VISION_PROVIDER=gemini")
    tavily = tavily or (TavilySearch(os.environ["TAVILY_API_KEY"])
                        if os.environ.get("TAVILY_API_KEY") else None)
    if web_cache is None and use_default_store:
        web_cache = WebAdviceCache(os.environ.get("SALLIM_WEB_CACHE_PATH", DEFAULT_CACHE_PATH))
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
        return {"status": "ok", "provider": getattr(provider, "name", "unknown")}

    @app.get("/regions", response_model=list[Region])
    def regions():
        return [Region(id=r.id, name=r.name) for r in store.regions.values()]

    @app.get("/items", response_model=list[ItemSummary])
    def items():
        return [ItemSummary(key=key, name=item.name, category=item.category,
                            aliases=item.aliases)
                for key, item in store.items.items()]

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
            return respond(Classification(key, 1.0, infer_text_state(req.question, store.items[key])), region, area)
        return respond(ask_provider(provider.match_text, req.question, store.items), region, area)

    def ai_estimate(question: str | None, image: bytes | None) -> WebAdvice | None:
        estimate = getattr(provider, "estimate_recycling", None)
        if not callable(estimate):
            return None
        try:
            return ask_provider(estimate, question, image)
        except HTTPException:
            return None

    MIXED_MSG = ("봉투 안에 여러 쓰레기가 섞여 있어서 하나로 판단하기 어려워요. "
                 "버릴 물건을 하나씩 꺼내 찍거나, 이름으로 물어봐 주세요.")

    @app.post("/assist", response_model=AssistResponse)
    def assist(req: AssistRequest):
        region = region_or_404(req.region_id)
        area = resolve_area(req.area_id)
        image = decode_image(req.image_base64) if req.image_base64 else None
        # 공식 출처를 확인해 저장한 동일 질문은 다시 검색하거나 AI로 분류할 필요가 없다.
        if image is None and req.question and web_cache is not None:
            cached = web_cache.get(req.question, req.region_id, req.area_id)
            if cached is not None:
                return AssistResponse(kind="web", web=cached)
        classify_intent = getattr(provider, "classify_intent", None)
        intent = ("recycling" if req.purpose == "recycling" else
                  ask_provider(classify_intent, req.question, image) if callable(classify_intent) else None)
        user_question = extract_user_question(req.question or "")
        fallback_recycling_intent = bool(user_question and (
            any(word in user_question for word in ("버려", "분리", "재활용", "쓰레기", "배출", "수거"))
            or re.search(r"(?:종이류|종이팩|비닐류|투명페트|일반쓰레기).{0,8}인가요", user_question)
            or re.search(r"음식물(?:이야|인가|이에요|입니까)", user_question)))
        text_recycling_intent = intent == "recycling" if intent is not None else fallback_recycling_intent
        if (image is None and req.question and text_recycling_intent
                and "내 상황과 질문:" not in req.question):
            keys = match_multiple_texts(req.question, store.items)
            if len(keys) > 1:
                return AssistResponse(
                    kind="recycling",
                    recycling_list=[respond(Classification(
                        key, 1.0, infer_text_state(req.question, store.items[key])
                    ), region, area)
                                    for key in keys],
                )
        if (image is None and req.question and "내 상황과 질문:" not in req.question
                and text_recycling_intent):
            fast_key = match_text(req.question, store.items)
            if fast_key:
                return AssistResponse(
                    kind="recycling",
                    recycling=respond(Classification(
                        fast_key, 1.0, infer_text_state(req.question, store.items[fast_key])
                    ), region, area),
                )
        assist_with_intent = getattr(provider, "assist_with_intent", None)
        decision = (ask_provider(assist_with_intent, req.question, image, store.items, intent)
                    if callable(assist_with_intent)
                    else ask_provider(provider.assist, req.question, image, store.items))
        if (decision.classification is not None and decision.classification.mixed
                and decision.classification.item_key is None):
            return AssistResponse(kind="unknown", message=MIXED_MSG)
        if (decision.kind == "recycling" and decision.classification is not None
                and decision.classification.item_key is not None
                and (intent is None or intent == "recycling")):
            item = store.items[decision.classification.item_key]
            if req.question:
                stated = infer_text_state(req.question, item)
                if stated.is_dirty is True:
                    decision.classification.state.is_dirty = True
            return AssistResponse(kind="recycling", recycling=respond(decision.classification, region, area))
        if decision.kind == "tip" and decision.tip is not None and not text_recycling_intent:
            return AssistResponse(kind="tip", tip=safe_tip(decision.tip, intent))
        recycling_question = text_recycling_intent or (image is not None and intent in (None, "recycling"))
        if tavily is not None and recycling_question:
            query = req.question
            summary_question = req.question
            if image is not None:
                describe = getattr(provider, "describe_search_item", None)
                name = ask_provider(describe, image) if callable(describe) else None
                if name:
                    query = name
                    summary_question = f"{name}. {req.question or ''}".strip()
            summarize = getattr(provider, "summarize_search_results", None)
            if query and callable(summarize):
                try:
                    hits = tavily.search(query)
                except httpx.HTTPStatusError as exc:
                    logger.warning("Tavily HTTP status: %s", exc.response.status_code)
                    if exc.response.status_code in (401, 403):
                        message = "웹 검색 API 키를 확인해 주세요."
                    elif exc.response.status_code == 429:
                        message = "웹 검색 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요."
                    else:
                        message = "웹 검색에 문제가 있어요. 잠시 후 다시 시도해 주세요."
                    return AssistResponse(kind="unknown", message=message)
                except httpx.RequestError as exc:
                    logger.warning("Tavily network error: %s", type(exc).__name__)
                    return AssistResponse(kind="unknown", message="웹 검색 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
                if hits:
                    try:
                        web = ask_provider(summarize, summary_question or query, hits)
                    except HTTPException:
                        web = None
                    if web is not None:
                        if image is None and req.question and web_cache is not None:
                            web_cache.put(req.question, req.region_id, req.area_id, web)
                        return AssistResponse(kind="web", web=web)
                    # 요약 모델이 바쁘거나 근거를 확정하지 못해도 공식 출처는 보여준다.
                    direct = direct_instruction(query, hits)
                    if direct:
                        sentence, source = direct
                        web = WebAdvice(
                            item_name=item_search_terms(query), answer=f"공식 자료 원문: “{sentence}”",
                            steps=[sentence], sources=[source],
                            searched_on=datetime.now(KST).date().isoformat(),
                            note="공식 자료 원문에서 확인한 문장입니다. 실제 배출 요일과 장소는 거주지 안내를 확인해 주세요.",
                        )
                        if image is None and req.question and web_cache is not None:
                            web_cache.put(req.question, req.region_id, req.area_id, web)
                        return AssistResponse(kind="web", web=web)
                    return AssistResponse(kind="web", web=WebAdvice(
                        item_name=item_search_terms(query),
                        answer="공식 자료에서 관련 항목을 찾았어요. 출처를 열어 배출 방법을 확인해 주세요.",
                        steps=["아래 공식 출처에서 물건 이름과 배출 방법을 확인해 주세요."],
                        sources=[hit.source for hit in hits],
                        searched_on=datetime.now(KST).date().isoformat(),
                        note="AI 요약을 확인하지 못해 검색한 공식 자료를 직접 보여드려요.",
                    ))
                guess = ai_estimate(req.question, image)
                if guess is not None:
                    return AssistResponse(kind="web", web=guess)
                return AssistResponse(kind="unknown", message=(
                    "공식 기관 자료에서 해당 물건의 배출 방법을 확인하지 못했어요. "
                    "물건 이름과 재질을 더 자세히 알려주세요."
                ))
        search = getattr(provider, "search_recycling", None)
        if callable(search) and recycling_question:
            try:
                web = ask_provider(search, req.question, image, region.name)
            except HTTPException as exc:
                if exc.status_code in (502, 503, 504):
                    guess = ai_estimate(req.question, image)
                    if guess is not None:
                        return AssistResponse(kind="web", web=guess)
                    return AssistResponse(kind="unknown", message=(
                        "저장된 품목에서 찾지 못했고 지금은 웹 검색을 사용할 수 없어요. "
                        "Gemini API 요금제·사용 한도를 확인하거나 물건 이름과 재질을 더 자세히 알려주세요."
                    ))
                raise
            if web is not None:
                if image is None and req.question and web_cache is not None:
                    web_cache.put(req.question, req.region_id, req.area_id, web)
                return AssistResponse(kind="web", web=web)
        if recycling_question:
            guess = ai_estimate(req.question, image)
            if guess is not None:
                return AssistResponse(kind="web", web=guess)
        return AssistResponse(kind="unknown", message="확인 가능한 배출 자료를 찾지 못했어요. 물건 이름이나 재질을 더 구체적으로 알려주세요.")

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
