import type { UsageType, AssetStatus, TagStatus } from "@/types";

// 더미 생성기가 사용하는 어휘/규칙. 데이터 자체는 generate.ts 에서 만들고,
// 모든 지표는 selector 에서 계산한다(하드코딩 금지).

// 더미/시드 데이터 생성의 기준 시점 — **결정성 확보 전용**.
// 런타임의 "오늘"로 쓰지 말 것. 실제 오늘 날짜는 src/lib/date.ts 의 todayKst() 를 쓴다.
export const SEED_TODAY = "2026-06-30";

export const GEN_SEED = 20260630;

// 실제 '대장' 대분류 분포 (합계 906) — 생성 시 정확히 이 개수만큼 만든다.
export const MAJOR_PLAN: {
  major: string;
  count: number;
  middles: [name: string, code: number, weight: number][];
}[] = [
  { major: "가구", count: 541, middles: [["의자", 404, 46], ["파티션", 410, 14], ["책상", 401, 20], ["캐비닛", 407, 7], ["테이블", 406, 5], ["칸막이", 410, 4], ["책장", 402, 4]] },
  { major: "사무용장비", count: 286, middles: [["컴퓨터", 501, 74], ["기타사무장비", 506, 12], ["출력장비", 503, 7], ["OA장비", 504, 4], ["입력장비", 502, 3]] },
  { major: "전산장비", count: 23, middles: [["스토리지", 702, 8], ["네트워크장비", 704, 6], ["연산장치", 703, 5], ["서버", 701, 4]] },
  { major: "가전제품", count: 22, middles: [["생활가전", 901, 16], ["영상가전", 902, 4], ["주방가전", 903, 2]] },
  { major: "방송장비", count: 21, middles: [["영상장비", 801, 12], ["음향장비", 802, 9]] },
  { major: "기타자산", count: 12, middles: [["기타자산", 1001, 1]] },
  { major: "소프트웨어", count: 1, middles: [["소프트웨어", 601, 1]] },
];

export const TOTAL_ASSETS = MAJOR_PLAN.reduce((s, m) => s + m.count, 0); // 906
export const RFID_REGISTERED = 305; // → 미등록 601
export const NOTEBOOK_COUNT = 45;
export const MISMATCH_COUNT = 6; // 관리번호 보존/계산 불일치 시연

// 레거시 대장의 총 취득금액(기준 집계값). 생성 단가를 이 합계에 맞춰 비례 보정한다.
// → 대시보드는 여전히 데이터셋을 합산해서 보여준다(표시값 하드코딩 아님).
export const LEGACY_TOTAL_ACQUISITION = 1_171_911_757;

export interface ItemTemplate {
  item: string;
  spec: string;
  min: number;
  max: number;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate[]> = {
  의자: [
    { item: "사무용 회전의자", spec: "메쉬, 헤드레스트", min: 120000, max: 220000 },
    { item: "회의용 의자", spec: "고정형, 패브릭", min: 60000, max: 120000 },
    { item: "임원용 의자", spec: "천연가죽, 하이백", min: 300000, max: 550000 },
  ],
  책상: [
    { item: "1인용 책상", spec: "1400x700, 화이트", min: 180000, max: 260000 },
    { item: "컴퓨터용 책상", spec: "1200x600, 멀바우", min: 150000, max: 230000 },
    { item: "임원용 책상", spec: "1800x900, 원목", min: 400000, max: 650000 },
  ],
  책장: [{ item: "2단 책장", spec: "목재", min: 90000, max: 160000 }, { item: "5단 책장", spec: "철재", min: 150000, max: 260000 }],
  테이블: [{ item: "회의용 테이블", spec: "2400x1200, 원목", min: 400000, max: 700000 }, { item: "간이 테이블", spec: "원형 Φ900", min: 120000, max: 220000 }],
  캐비닛: [{ item: "철재 캐비닛", spec: "3단, 잠금", min: 150000, max: 240000 }, { item: "서류 캐비닛", spec: "5단", min: 180000, max: 300000 }],
  파티션: [{ item: "사무실 파티션", spec: "H1200, 패브릭", min: 70000, max: 130000 }],
  칸막이: [{ item: "데스크 칸막이", spec: "H400, 아크릴", min: 40000, max: 90000 }],
  컴퓨터: [
    { item: "데스크톱컴퓨터", spec: "i5, 16GB, 512GB SSD", min: 1200000, max: 1600000 },
    { item: "PC모니터", spec: "27인치 QHD IPS", min: 280000, max: 420000 },
    { item: "일체형PC", spec: "24인치, i5, 8GB", min: 900000, max: 1300000 },
  ],
  입력장비: [{ item: "바코드 스캐너", spec: "USB, 1D/2D", min: 150000, max: 260000 }],
  출력장비: [{ item: "레이저복합기", spec: "흑백 A4, 양면", min: 450000, max: 700000 }, { item: "컬러 레이저프린터", spec: "A4", min: 350000, max: 600000 }],
  OA장비: [{ item: "복합기", spec: "컬러 A3, 네트워크", min: 900000, max: 1500000 }],
  기타사무장비: [{ item: "문서세단기", spec: "크로스컷, 중형", min: 180000, max: 320000 }, { item: "전자칠판", spec: "75인치 터치", min: 1500000, max: 2500000 }],
  서버: [{ item: "랙 서버", spec: "2U, Xeon, 64GB", min: 5000000, max: 9000000 }],
  스토리지: [{ item: "NAS 스토리지", spec: "4Bay, 32TB", min: 1500000, max: 2500000 }],
  연산장치: [{ item: "GPU 가속기", spec: "RTX PRO 5000 Blackwell", min: 6000000, max: 7500000 }],
  네트워크장비: [{ item: "L2 스위치", spec: "24포트 기가", min: 400000, max: 800000 }, { item: "무선 AP", spec: "Wi-Fi 6", min: 150000, max: 300000 }],
  영상장비: [{ item: "4K 캠코더", spec: "방송용", min: 2000000, max: 3500000 }, { item: "빔프로젝터", spec: "5000안시", min: 1200000, max: 2200000 }],
  음향장비: [{ item: "무선 마이크 세트", spec: "2채널 핸드헬드", min: 300000, max: 550000 }, { item: "파워앰프", spec: "2채널", min: 400000, max: 700000 }],
  생활가전: [{ item: "공기청정기", spec: "30평형, 헤파", min: 250000, max: 400000 }, { item: "냉장고", spec: "300L", min: 400000, max: 700000 }],
  영상가전: [{ item: "스마트 TV", spec: "65인치 4K", min: 900000, max: 1500000 }],
  주방가전: [{ item: "전자레인지", spec: "23L", min: 80000, max: 150000 }, { item: "커피메이커", spec: "전자동", min: 150000, max: 300000 }],
  소프트웨어: [{ item: "통계분석 소프트웨어", spec: "연간 라이선스", min: 1500000, max: 3000000 }],
  기타자산: [{ item: "기타자산", spec: "-", min: 50000, max: 300000 }],
};

export const NOTEBOOK_TEMPLATE: ItemTemplate = { item: "노트북", spec: "갤럭시북4, i7, 16GB, 512GB", min: 1300000, max: 1500000 };

export const PEOPLE = [
  "방주희", "민수현", "장다인", "김동현", "허아름", "방석훈", "황승재", "김민숙",
  "임채정", "이은실", "전상철", "김하린", "이세영", "조수민", "손경호", "이성재",
  "박상우", "사공민철", "용호중", "김효림", "이다영", "권석재",
];

export const PLACES = [
  { place: "집현관(제2도서관)", building: "B0000142", rooms: ["101호", "102호", "회의실", "서버실"] },
  { place: "보듬관", building: "B0000038", rooms: ["201호", "202호"] },
  { place: "KNU 스타트업 큐브(나동)", building: "B0000225", rooms: ["3층", "4층"] },
];

export const USAGE_WEIGHTS: [UsageType, number][] = [
  ["미확인", 50], ["사무실보관", 18], ["좌석사용", 12], ["개인사용", 12], ["대여용", 5], ["소모품", 3],
];

export const STATUS_WEIGHTS: [AssetStatus, number][] = [
  ["정상", 44], ["사용중", 25], ["보관중", 15], ["점검필요", 5], ["수리중", 3], ["대여중", 3], ["폐기예정", 3], ["분실", 2],
];

export const TAG_WEIGHTS: [TagStatus | "미지정", number][] = [
  ["미지정", 50], ["미부착", 20], ["부착", 18], ["미발급", 8], ["손상", 4],
];

export const SEAT_CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];

export const CONSUMABLE_TEMPLATES: { itemName: string; spec: string; price: number; unit: string; min: number; max: number; safety: number }[] = [
  { itemName: "타포린백", spec: "소형(38*30)", price: 4290, unit: "개", min: 600, max: 1000, safety: 100 },
  { itemName: "보조배터리", spec: "5000mAh", price: 27500, unit: "개", min: 10, max: 150, safety: 30 },
  { itemName: "보조배터리겸 손난로", spec: "96,000mAh", price: 35000, unit: "개", min: 30, max: 135, safety: 40 },
  { itemName: "Warboy (Academy)", spec: "FuriosaAI 1st gen", price: 1430000, unit: "개", min: 8, max: 10, safety: 2 },
  { itemName: "단체 후드집업", spec: "전사/나염", price: 22000, unit: "벌", min: 5, max: 180, safety: 20 },
  { itemName: "그래픽카드", spec: "RTX 3050 6GB", price: 330000, unit: "개", min: 2, max: 9, safety: 3 },
  { itemName: "메모리", spec: "16GB DDR4 25600", price: 115000, unit: "개", min: 4, max: 18, safety: 6 },
  { itemName: "GPU", spec: "RTX PRO 5000", price: 7029000, unit: "개", min: 0, max: 2, safety: 1 },
  { itemName: "USB-C 허브", spec: "7in1, PD100W", price: 38000, unit: "개", min: 8, max: 22, safety: 10 },
  { itemName: "RFID 라벨지", spec: "50x30mm, 1000매", price: 45000, unit: "롤", min: 2, max: 8, safety: 5 },
];
