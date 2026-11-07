"""행정안전부 생활쓰레기배출정보 CSV를 앱용 스냅샷으로 변환한다.

사용법: python server/scripts/update_waste_data.py --download
        python server/scripts/update_waste_data.py ~/Downloads/생활쓰레기배출정보.csv
원본: https://file.localdata.go.kr/file/household_waste_info/info 의 '전국 파일 다운로드'
"""
import argparse
import csv
import json
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import Request, urlopen

SOURCE_URL = "https://www.data.go.kr/data/15075534/fileData.do"
DOWNLOAD_URL = "https://file.localdata.go.kr/file/download/household_waste_info/info"
FIELDS = {
    "관리번호": "id",
    "시도명": "city",
    "시군구명": "district",
    "관리구역명": "zone",
    "관리구역대상지역명": "target",
    "배출장소유형": "place_type",
    "배출장소": "place",
    "생활쓰레기배출방법": "general_method",
    "음식물쓰레기배출방법": "food_method",
    "재활용품배출방법": "recycling_method",
    "생활쓰레기배출요일": "general_days",
    "음식물쓰레기배출요일": "food_days",
    "재활용품배출요일": "recycling_days",
    "생활쓰레기배출시작시각": "general_start",
    "생활쓰레기배출종료시각": "general_end",
    "음식물쓰레기배출시작시각": "food_start",
    "음식물쓰레기배출종료시각": "food_end",
    "재활용품배출시작시각": "recycling_start",
    "재활용품배출종료시각": "recycling_end",
    "미수거일": "no_collection_days",
    "관리부서명": "department",
    "관리부서전화번호": "phone",
    "데이터기준일자": "data_date",
}


def convert(source: Path, destination: Path) -> int:
    with source.open(encoding="cp949", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = set(FIELDS) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV 필드가 빠졌습니다: {sorted(missing)}")
        rows = [{target: (row[original] or "").strip() for original, target in FIELDS.items()}
                for row in reader]
    rows = [row for row in rows if row["id"] and row["city"] and row["district"]]
    if not rows or len({row["id"] for row in rows}) != len(rows):
        raise ValueError("빈 데이터 또는 중복 관리번호가 있습니다")
    payload = {"source_url": SOURCE_URL, "downloaded_on": date.today().isoformat(), "areas": rows}
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(destination)
    return len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", nargs="?", type=Path, help="공식 홈페이지에서 내려받은 전국 CSV")
    parser.add_argument("--download", action="store_true", help="공식 서버에서 전국 CSV 직접 내려받기")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[2] / "data/waste_areas.json")
    args = parser.parse_args()
    if args.download == bool(args.csv):
        parser.error("CSV 경로 또는 --download 중 하나만 지정해 주세요")
    if args.download:
        with TemporaryDirectory() as folder:
            csv_path = Path(folder) / "official.csv"
            request = Request(DOWNLOAD_URL, headers={"User-Agent": "SaLLiM data refresh"})
            with urlopen(request, timeout=60) as response:
                csv_path.write_bytes(response.read(30 * 1024 * 1024 + 1))
            if csv_path.stat().st_size > 30 * 1024 * 1024:
                raise ValueError("원본 CSV가 예상보다 큽니다")
            count = convert(csv_path, args.output)
    else:
        count = convert(args.csv, args.output)
    print(f"{count}개 관리구역을 {args.output}에 저장했습니다")
