"""레포 data/의 실데이터 검증. data/가 아직 없으면 건너뛴다."""
import pytest

from app import data
from app.match import match_text, normalize

REAL = data.DEFAULT_DATA_DIR
pytestmark = pytest.mark.skipif(not (REAL / "items.json").exists(), reason="data/items.json 없음")


@pytest.fixture(scope="module")
def store():
    return data.load(REAL)  # 스키마 오류면 여기서 DataError


def test_every_item_name_matches_itself(store):
    for key, it in store.items.items():
        assert match_text(it.name, store.items) == key, f"{key}: 이름 '{it.name}'로 못 찾음"


def test_no_alias_shared_between_items(store):
    owner = {}
    for key, it in store.items.items():
        for t in {normalize(x) for x in [it.name, *it.aliases]}:
            assert owner.setdefault(t, key) == key, f"'{t}'가 {owner[t]}와 {key}에 같이 있음"


def test_regions_have_schedule_or_note(store):
    for r in store.regions.values():
        assert r.week or r.note, f"{r.id}: week도 note도 없음"


def test_nationwide_has_no_invented_schedule(store):
    national = store.regions["nationwide"]
    assert not national.week
    assert national.time is None
    assert "지자체" in national.note


def test_dirty_pet_bottle_leads_with_general_waste(store):
    # '기름 묻은 페트병' — 기본 배출법(투명페트)보다 오염 기준이 결론으로 와야 한다
    from app.assemble import assemble
    from app.match import infer_text_state
    item = store.items["pet_bottle_clear"]
    state = infer_text_state("기름 묻은 페트병", item)
    assert state.is_dirty is True
    r = assemble("pet_bottle_clear", item, next(iter(store.regions.values())), state, 0.9)
    assert r.answer.startswith("오염된 투명 페트병이라면") and "일반쓰레기" in r.answer
    assert "일반쓰레기" in r.steps[0]


def test_mixed_bag_maps_to_general_waste_bag(store):
    from app.providers.base import parse_response
    c = parse_response('{"item_key":"pet_bottle_clear","confidence":0.9,"mixed":true}', store.items)
    assert c.item_key == "general_waste_bag" and c.mixed
