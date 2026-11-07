export type GuideCategory = "음식" | "청소·세탁" | "분리배출" | "집·안전";

export type Guide = {
  id: string;
  category: GuideCategory;
  icon: string;
  title: string;
  summary: string;
  minutes: number;
  steps: string[];
  examples?: string[];
  source: { name: string; url: string };
};

export const GUIDE_CATEGORIES: GuideCategory[] = ["음식", "청소·세탁", "분리배출", "집·안전"];

// 짧은 실행 가이드만 담는다. 원문 링크에서 세부 조건과 최신 내용을 확인할 수 있다.
export const GUIDES: Guide[] = [
  {
    id: "leftovers", category: "음식", icon: "🍱", title: "남은 음식, 언제 냉장고에 넣지?",
    summary: "조리한 음식은 실온에 오래 두지 않기", minutes: 1,
    steps: ["조리한 음식은 실온에 2시간 이상 두지 마세요.", "먹고 남은 음식은 덮어서 냉장 보관하고, 제품에 적힌 보관 방법을 확인하세요.", "냉장고에 넣었어도 오래 보관했다면 상태를 확인하고 안전이 의심되면 먹지 마세요."],
    examples: ["어제 시킨 치킨을 실온에 두고 잤는데 데워 먹어도 될까요?", "남은 찌개를 냄비째 냉장고에 넣어도 괜찮나요?"],
    source: { name: "식품안전나라 · 식중독 예방법", url: "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs401&menu_grp=MENU_NEW02&menu_no=4419&ntctxt_no=1068743" },
  },
  {
    id: "thaw", category: "음식", icon: "🧊", title: "냉동식품, 상온에 꺼내 놔도 될까?",
    summary: "냉장실 또는 바로 조리할 때 전자레인지로 해동", minutes: 1,
    steps: ["시간이 있다면 냉장실에서 해동하세요.", "바로 조리할 계획이면 전자레인지 해동을 이용할 수 있어요.", "해동한 식품을 실온에 오래 두지 말고 조리 전까지 냉장 보관하세요."],
    examples: ["냉동 삼겹살을 빨리 녹이려는데 찬물에 담가도 되나요?", "한 번 녹인 고기를 남겼는데 다시 얼려도 될까요?"],
    source: { name: "식품안전나라 · 냉동식품 취급방법", url: "https://www.foodsafetykorea.go.kr/residue/article/view.do?articleKey=211&boardKey=0&currentPageNo=6&menuKey=4&searchTitleFlag=1&subMenuKey=5" },
  },
  {
    id: "fridge", category: "음식", icon: "🥬", title: "냉장고 정리, 이것부터",
    summary: "표시된 보관법 확인하고 먼저 산 재료부터 쓰기", minutes: 2,
    steps: ["포장지의 보관 방법과 소비기한을 먼저 확인하세요.", "먼저 산 재료를 앞쪽에 두어 먼저 사용하세요.", "생고기·생선은 바로 먹는 식품과 닿지 않도록 분리해 보관하세요."],
    examples: ["양파랑 감자는 냉장고에 넣는 게 좋나요, 실온이 좋나요?", "냉장고에서 반찬 냄새가 배었을 때 어떻게 없애요?"],
    source: { name: "식품안전나라 · 식재료 보관 안내", url: "https://www.foodsafetykorea.go.kr/portalmobile/content/detail.do?bbs_no=bbs427&ntctxt_no=1069310" },
  },
  {
    id: "bleach", category: "청소·세탁", icon: "🧽", title: "욕실 청소제, 같이 써도 될까?",
    summary: "락스와 다른 세정제는 섞지 않기", minutes: 1,
    steps: ["락스는 다른 세정제나 식초와 섞지 마세요. 유해 가스가 발생할 수 있어요.", "제품 라벨의 사용법과 희석 기준을 따르세요.", "청소 중에는 창문을 열어 환기하고, 끝난 뒤 제품을 안전하게 보관하세요."],
    examples: ["욕실 타일 줄눈에 핀 검은 곰팡이는 어떻게 지워요?", "창문이 없는 원룸 화장실은 환기를 어떻게 하나요?"],
    source: { name: "한국소비자원 · 락스 안전정보", url: "https://www.kca.go.kr/webzine/fileDownload?fileGubun=prewebzine&menuId=journal&systemFileName=CONSUMER_3257.pdf&userFileName=3257.pdf" },
  },
  {
    id: "laundry", category: "청소·세탁", icon: "👕", title: "새 옷 세탁 전 10초 확인",
    summary: "옷 안쪽 세탁 표시와 주의사항 읽기", minutes: 1,
    steps: ["옷에 붙은 품질 표시와 취급 주의사항을 확인하세요.", "세탁 가능 온도·건조 방법을 보고 세탁기를 설정하세요.", "처음 세탁하는 진한 색 옷은 이염 가능성을 확인하고 분리하세요."],
    examples: ["흰 티셔츠에 김치 국물이 튀었는데 어떻게 세탁해요?", "수건에서 꿉꿉한 냄새가 날 때는 어떻게 빨아야 하나요?"],
    source: { name: "한국소비자원 · 세탁 관련 피해 예방", url: "https://www.kca.go.kr/webzine/fileDownload?fileGubun=prewebzine&menuId=journal&systemFileName=20160704113712295.pdf&userFileName=34-35+%EC%84%B8%ED%83%81%EC%86%8C%EC%9D%98%EB%A5%98%EC%86%90%EC%83%81.pdf" },
  },
  {
    id: "plastic", category: "분리배출", icon: "🥤", title: "배달 용기, 그대로 버리면?",
    summary: "내용물을 비우고 이물질을 제거하기", minutes: 1,
    steps: ["용기 안의 음식물을 비우세요.", "물로 헹구는 등 이물질을 제거하세요.", "스티커·펌프처럼 본체와 다른 재질은 가능한 범위에서 분리하세요. 지역별 세부 기준도 확인하세요."],
    examples: ["고추기름이 빨갛게 밴 배달 플라스틱 통은 어떻게 버려요?", "배달 용기 윗면에 붙은 비닐이 안 떼어지는데 어떡하죠?"],
    source: { name: "서울특별시 · 분리배출 기준", url: "https://news.seoul.go.kr/env/archives/564022" },
  },
  {
    id: "pet", category: "분리배출", icon: "💧", title: "투명 페트병은 따로 모으기",
    summary: "음료·생수병의 내용물과 라벨 확인", minutes: 1,
    steps: ["내용물을 비우고 헹구세요.", "라벨과 뚜껑 등 다른 재질을 지역 안내에 따라 분리하세요.", "투명한 음료·생수 페트병은 다른 플라스틱과 구분해 배출하세요."],
    examples: ["초록색 사이다병이나 갈색 맥주 페트병도 투명페트인가요?", "테이크아웃 아이스커피 플라스틱 컵도 투명페트로 버려요?"],
    source: { name: "서울특별시 · 분리배출 기준", url: "https://news.seoul.go.kr/env/archives/564022" },
  },
  {
    id: "power", category: "집·안전", icon: "🔌", title: "멀티탭, 몇 개까지 꽂아도 될까?",
    summary: "정격용량과 연결한 기기 소비전력 확인", minutes: 2,
    steps: ["멀티탭에 적힌 정격용량과 연결할 기기의 소비전력을 확인하세요.", "멀티탭에 멀티탭을 이어 꽂거나 여러 고전력 기기를 함께 쓰지 마세요.", "에어컨·온열기처럼 소비전력이 큰 기기는 전용 벽면 콘센트 사용을 확인하세요."],
    examples: ["전자레인지랑 에어프라이어를 같은 멀티탭에 꽂아도 되나요?", "오래된 멀티탭은 언제 교체하는 게 안전한가요?"],
    source: { name: "소방청 · 전기제품 안전사용", url: "https://www.nfa.go.kr/nfa/news/pressrelease/press/?cntId=2666&mode=view&pageIdx=18" },
  },
  {
    id: "gas", category: "집·안전", icon: "🔥", title: "가스 냄새가 날 때",
    summary: "밸브를 잠그고 창문을 열기", minutes: 1,
    steps: ["안전하게 할 수 있다면 점화콕과 중간밸브를 잠가 가스 공급을 차단하세요.", "창문과 문을 열어 환기하세요. 환풍기·선풍기 등 전기기구의 스위치는 조작하지 마세요.", "가스 공급업체나 지역 관리소에 연락해 안전을 확인받으세요. 급박한 위험이 있으면 밖으로 대피하고 119에 신고하세요."],
    examples: ["이사 갈 때 도시가스 철거/연결 신청은 어떻게 하나요?", "휴대용 부탄가스 캔이 남았는데 어떻게 버려요?"],
    source: { name: "한국가스안전공사 · 누출 시 응급조치", url: "https://kgs.or.kr/kgsmain/kgs/abad/view.do" },
  },
  {
    id: "alarm", category: "집·안전", icon: "🚨", title: "원룸 화재경보기 확인하기",
    summary: "방 안 감지기와 소화기 위치 알아두기", minutes: 2,
    steps: ["집 안에 주택화재경보기와 소화기가 있는지 확인하세요.", "감지기가 설치되어 있다면 전원이 정상이고 경보가 울릴 수 있는 상태인지 살펴보세요.", "없거나 고장났다면 건물 관리자나 관할 소방서에 설치 방법을 문의하세요."],
    examples: ["화재경보기에서 삐- 소리가 간헐적으로 나는데 배터리 문제인가요?", "가정용 소화기 사용기한과 폐기 방법이 궁금해요."],
    source: { name: "소방청 · 주택용 소방시설 FAQ", url: "https://www.nfa.go.kr/nfa/communication/0018/0002/" },
  },
  {
    id: "move", category: "집·안전", icon: "🏠", title: "자취방 보러 갈 때 확인할 것",
    summary: "등기·환기·냉난방·하자 확인", minutes: 3,
    steps: ["계약 전에 등기부등본으로 소유자와 권리관계를 확인하세요.", "현장에서 냉난방, 누수, 악취, 환기, 수압 등 주택 상태를 살펴보세요.", "계약 조건과 보증금 관련 사항은 HUG 안심전세의 점검표로 다시 확인하세요."],
    examples: ["월세 계약할 때 특약사항에 꼭 넣으면 좋은 문구가 있을까요?", "이사 당일 전입신고와 확정일자는 어떻게 받나요?"],
    source: { name: "주택도시보증공사 · 계약 전 유의사항", url: "https://m.khug.or.kr/jeonse/web/s03/s030103.jsp" },
  },
  {
    id: "heating", category: "집·안전", icon: "🌡️", title: "난방비 아끼는 작은 습관",
    summary: "틈새 열손실부터 줄이기", minutes: 2,
    steps: ["창문 틈새와 문틈으로 들어오는 찬바람을 확인하세요.", "커튼·문풍지 등을 활용해 열손실을 줄이세요.", "실내 온도는 편안함과 건강을 고려해 조절하고, 사용하지 않는 방의 난방 설정을 확인하세요."],
    examples: ["원룸 외출할 때 보일러를 끄는 게 나을까요, 외출 모드가 나을까요?", "창문에 붙인 뽁뽁이(에어캡)는 나중에 어떻게 버려요?"],
    source: { name: "한국에너지공단 · 겨울철 난방비 절약", url: "https://www.energy.or.kr/front/board/View3.do?boardMngNo=3&boardNo=10024875" },
  },
  {
    id: "expiry", category: "음식", icon: "🏷️", title: "소비기한이 지나면 먹어도 될까?",
    summary: "기한과 함께 제품의 보관 조건 확인", minutes: 1,
    steps: ["포장에 표시된 소비기한과 보관 방법을 함께 확인하세요.", "소비기한은 표시된 보관 방법을 지켰을 때를 전제로 한 기한이에요.", "보관 조건을 지키지 못했거나 기한이 지났다면 섭취하지 마세요."],
    examples: ["소비기한 지난 우유나 달걀은 어떻게 버려야 하나요?", "유통기한과 소비기한은 무엇이 다른가요?"],
    source: { name: "식품안전나라 · 소비기한 안내", url: "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs091601&menu_grp=MENU_NEW01&menu_no=3862&ntctxt_no=1093859" },
  },
  {
    id: "cutting-board", category: "음식", icon: "🔪", title: "도마 하나로 고기와 채소를 썰어도 될까?",
    summary: "식재료 사이 교차오염 막기", minutes: 1,
    steps: ["조리 전 손과 칼·도마를 깨끗이 씻으세요.", "식재료 종류가 바뀔 때는 도마와 칼을 씻고 사용하세요.", "표면에 흠집이 많고 낡은 도마는 교체를 고려하세요."],
    examples: ["생닭을 손질한 뒤 도마와 싱크대는 어떻게 소독하나요?", "낡은 플라스틱 도마나 나무 도마는 어떻게 버려요?"],
    source: { name: "식품안전나라 · 칼과 도마 세척", url: "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_grp=MENU_NEW01&menu_no=3120&ntctxt_no=21705" },
  },
  {
    id: "freeze-portion", category: "음식", icon: "📦", title: "남은 식재료를 한 번에 얼려도 될까?",
    summary: "한 끼씩 나누어 냉동하기", minutes: 1,
    steps: ["한 번에 사용할 분량으로 나눠 담으세요.", "밀폐하거나 포장해 재료 이름과 날짜를 적어 두세요.", "필요한 만큼만 꺼내 쓰면 반복 해동을 줄일 수 있어요."],
    examples: ["남은 밥을 냉동할 때 랩에 싸도 되나요, 용기에 담아야 하나요?", "대파와 다진 마늘을 오래 쓰려면 어떻게 소분해요?"],
    source: { name: "식품안전나라 · 냉동 보관 방법", url: "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_grp=MENU_NEW01&menu_no=3120&ntctxt_no=21795" },
  },
  {
    id: "opened-can", category: "음식", icon: "🥫", title: "통조림을 연 뒤 그대로 냉장고에?",
    summary: "남은 내용물은 깨끗한 용기에 옮기기", minutes: 1,
    steps: ["개봉한 통조림의 남은 내용물은 별도의 깨끗한 용기에 옮기세요.", "뚜껑을 덮어 냉장 보관하고 개봉한 날짜를 적어 두세요.", "가능한 빨리 사용하고 제품 표시도 확인하세요."],
    examples: ["다 먹은 참치캔이나 스팸캔은 기름을 어떻게 씻어서 버려요?", "통조림 국물은 싱크대에 버려도 되나요?"],
    source: { name: "식품안전나라 · 식재료 보관 안내", url: "https://www.foodsafetykorea.go.kr/portalmobile/content/detail.do?bbs_no=bbs427&ntctxt_no=1069310" },
  },
  {
    id: "detergent", category: "청소·세탁", icon: "🧴", title: "세제를 많이 넣으면 더 깨끗해질까?",
    summary: "세탁기 종류와 제품 표준사용량 확인", minutes: 1,
    steps: ["세탁기가 드럼형인지 일반형인지 확인하세요.", "세제 포장에 적힌 표준사용량을 빨랫감 양에 맞춰 사용하세요.", "세제량을 늘린다고 세척력이 비례해 좋아지지는 않아요."],
    examples: ["섬유유연제와 세탁세제는 어느 칸에 각각 넣어야 하나요?", "다 쓴 세제 플라스틱 통이나 펌프 용기는 어떻게 버려요?"],
    source: { name: "한국소비자원 · 세탁세제 사용 가이드", url: "https://www.kca.go.kr/home/sub.do?menukey=4004&mode=view&no=1003585726&page=67" },
  },
  {
    id: "paper-carton", category: "분리배출", icon: "🥛", title: "우유팩은 종이상자와 같이 버릴까?",
    summary: "헹구고 말려 종이팩으로 따로 배출", minutes: 1,
    steps: ["내용물을 비우고 물로 헹군 뒤 말리세요.", "빨대·비닐 등 다른 재질을 떼어내세요.", "종이팩 전용 수거함에 배출하고, 없으면 지역 안내에 따라 일반 종이와 구분해 배출하세요."],
    examples: ["두유 멸균팩(안쪽이 은박인 팩)도 일반 우유팩과 같은 곳으로 버려요?", "일회용 종이컵은 일반 종이류인가요, 종이팩인가요?"],
    source: { name: "서울특별시 · 분리배출 기준", url: "https://news.seoul.go.kr/env/archives/564022" },
  },
  {
    id: "parcel-box", category: "분리배출", icon: "📦", title: "택배 상자, 테이프 붙은 채로 버려도 될까?",
    summary: "송장·테이프를 떼고 접어서 배출", minutes: 1,
    steps: ["상자에 붙은 송장과 테이프, 비닐·철핀 등을 제거하세요.", "상자를 접어 다른 종이류와 구분해 배출하세요.", "안쪽에 비닐·알루미늄이 붙어 떼어지지 않는 보냉 상자는 지역 배출 기준을 확인하세요."],
    examples: ["택배 박스 안에 들어 있던 완충 비닐이나 뽁뽁이는 어떻게 버려요?", "스티로폼 아이스박스는 테이프만 떼면 재활용이 되나요?"],
    source: { name: "서울특별시 · 분리배출 기준", url: "https://news.seoul.go.kr/env/archives/564022" },
  },
  {
    id: "medicine", category: "분리배출", icon: "💊", title: "남은 약은 어디에 버릴까?",
    summary: "서울은 전용 수거함·우체통 활용", minutes: 2,
    steps: ["남은 약을 일반 쓰레기나 싱크대에 버리지 마세요.", "서울에서는 약 종류에 따라 폐의약품 수거함이나 우체통에 배출할 수 있어요.", "물약·연고는 우체통이 아닌 전용 수거함을 이용하고, 다른 지역은 지자체 안내를 확인하세요."],
    examples: ["알약 포장지(플라스틱+은박 블리스터)는 어떻게 버려요?", "비타민이나 영양제도 폐의약품 수거함에 버려야 하나요?"],
    source: { name: "서울특별시 · 폐의약품 배출", url: "https://news.seoul.go.kr/env/archives/563744?listPage=1" },
  },
  {
    id: "food-waste", category: "분리배출", icon: "🥚", title: "달걀껍데기도 음식물쓰레기일까?",
    summary: "뼈·조개껍데기·티백도 확인", minutes: 1,
    steps: ["달걀껍데기, 뼈, 조개껍데기와 일회용 티백은 음식물쓰레기로 넣지 마세요.", "딱딱한 씨와 양파 껍질·채소 뿌리도 일반쓰레기 대상인지 확인하세요.", "자세한 품목과 봉투 기준은 거주지 지자체 안내를 따르세요."],
    examples: ["먹고 남은 치킨 뼈나 족발 뼈는 어떻게 버려요?", "수박 껍질이나 바나나 껍질은 음식물쓰레기 맞나요?"],
    source: { name: "서울특별시 · 음식물류 폐기물 구분", url: "https://news.seoul.go.kr/env/archives/564022" },
  },
  {
    id: "move-photos", category: "집·안전", icon: "📸", title: "입주 첫날 집 사진을 찍어야 할까?",
    summary: "하자와 시설 상태 기록하기", minutes: 2,
    steps: ["입주 직후 벽·바닥·창문·가전 등의 상태를 사진이나 영상으로 남기세요.", "이미 있던 하자는 임대인이나 관리인에게 알려 기록을 남기세요.", "계약서와 사진을 함께 보관하면 퇴거 때 상태를 비교하기 쉬워요."],
    examples: ["입주 청소할 때 가장 먼저 해야 하는 순서는 무엇인가요?", "이삿짐 정리 후 나온 대형 스티로폼과 박스 버리는 법 알려줘"],
    source: { name: "주택도시보증공사 · 주택 확인 및 이사", url: "https://m.khug.or.kr/jeonse/web/s03/s030303.jsp" },
  },
  {
    id: "aircon", category: "집·안전", icon: "❄️", title: "에어컨 켜기 전에 뭘 확인할까?",
    summary: "필터·실외기 주변·환기 확인", minutes: 2,
    steps: ["사용 전 필터 상태를 확인하고 제품 설명서에 따라 청소하세요.", "실외기 주변에 공기 흐름을 막는 물건이 없는지 확인하세요.", "냉방 중에도 주기적으로 환기하고, 창문 차양 등으로 실내 열 유입을 줄여 보세요."],
    examples: ["에어컨에서 쉰내가 나는데 필터를 어떻게 씻고 말려야 하나요?", "고장 난 선풍기나 소형 가전은 어떻게 버려요?"],
    source: { name: "한국에너지공단 · 냉방설비 가이드", url: "https://www.energy.or.kr/front/board/View3.do?boardMngNo=3&boardNo=10022808" },
  },
  {
    id: "ice-pack", category: "분리배출", icon: "🧊", title: "젤 아이스팩은 어디에 버릴까?",
    summary: "내용물에 따라 수거함·일반쓰레기 확인", minutes: 1,
    steps: ["아이스팩의 내용물이 물인지 젤 형태 고흡수성 수지인지 확인하세요.", "젤 아이스팩은 전용 수거함이 있으면 그곳에 배출하세요.", "수거함이 없다면 지역 기준에 따라 일반쓰레기로 배출하거나 재사용하세요."],
    examples: ["물 아이스팩은 가위로 잘라서 물을 싱크대에 버려도 되나요?", "은박 보냉백(보냉 파우치)은 비닐류인가요, 일반쓰레기인가요?"],
    source: { name: "서울특별시 · 장본 후 분리배출", url: "https://news.seoul.go.kr/env/archives/558269" },
  },
  {
    id: "sink-drain", category: "청소·세탁", icon: "🚰", title: "싱크대 배수구 냄새·물때 줄이기",
    summary: "거름망 비우기와 기름기 닦아내기", minutes: 1,
    steps: ["음식물 거름망에 쌓인 찌꺼기는 물기를 빼서 자주 비우세요.", "프라이팬이나 그릇의 기름기는 키친타월로 먼저 닦아낸 뒤 설거지하면 배수구 막힘을 줄일 수 있어요.", "배수구 주변과 거름망은 중성세제와 솔로 주기적으로 씻고 환기하세요."],
    examples: ["프라이팬에 남은 식용유(폐식용유)는 어떻게 버려요?", "싱크대 배수구에서 하수구 냄새가 올라올 때 어떻게 막나요?"],
    source: { name: "서울특별시 · 음식물류 폐기물 및 주방 배출 안내", url: "https://news.seoul.go.kr/env/archives/564022" },
  },
  {
    id: "bulb-battery", category: "분리배출", icon: "💡", title: "다 쓴 건전지와 전구 버리는 법",
    summary: "폐건전지·형광등은 전용수거함, LED·깨진 전구는 일반쓰레기", minutes: 1,
    steps: ["폐건전지와 깨지지 않은 형광등은 동주민센터나 단지 내 전용수거함에 따로 배출하세요.", "LED 전구나 백열전구, 깨진 형광등은 지역 기준에 따라 신문지 등으로 감싸 종량제 봉투나 불연성 마대에 배출하세요.", "보조배터리나 리튬 배터리는 절대 일반쓰레기 봉투에 넣지 말고 전용 수거 방법을 확인하세요."],
    examples: ["부풀어 오른 보조배터리는 어디에 버려야 하나요?", "형광등이 깨졌는데 어떻게 안전하게 치우고 버려요?"],
    source: { name: "서울특별시 · 분리배출 기준", url: "https://news.seoul.go.kr/env/archives/564022" },
  },
];

export const findGuide = (id: string) => GUIDES.find((guide) => guide.id === id);
