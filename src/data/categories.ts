import type { AssetMajorCategory, Building } from "@/types";

// 자산분류 기준정보 (실제 엑셀 '자산분류 코드' 시트 구조 반영, 일부 발췌).
export const MAJOR_CATEGORIES: AssetMajorCategory[] = [
  {
    id: "maj-4", code: 4, name: "가구",
    middles: [
      { id: "mid-401", code: 401, name: "책상", majorId: "maj-4", detailItems: ["책상(일반형)", "책상(컴퓨터용)"] },
      { id: "mid-402", code: 402, name: "책장", majorId: "maj-4" },
      { id: "mid-404", code: 404, name: "의자", majorId: "maj-4", detailItems: ["의자(회전형)", "의자(고정형)"] },
      { id: "mid-406", code: 406, name: "테이블", majorId: "maj-4" },
      { id: "mid-407", code: 407, name: "캐비닛", majorId: "maj-4" },
      { id: "mid-410", code: 410, name: "파티션", majorId: "maj-4" },
      { id: "mid-410b", code: 410, name: "칸막이", majorId: "maj-4" },
    ],
  },
  {
    id: "maj-5", code: 5, name: "사무용장비",
    middles: [
      { id: "mid-501", code: 501, name: "컴퓨터", majorId: "maj-5", detailItems: ["PC본체", "PC모니터", "노트북", "일체형PC"] },
      { id: "mid-502", code: 502, name: "입력장비", majorId: "maj-5" },
      { id: "mid-503", code: 503, name: "출력장비", majorId: "maj-5", detailItems: ["프린터(레이저)", "프린터(잉크젯)"] },
      { id: "mid-504", code: 504, name: "OA장비", majorId: "maj-5" },
      { id: "mid-506", code: 506, name: "기타사무장비", majorId: "maj-5" },
    ],
  },
  {
    id: "maj-7", code: 7, name: "전산장비",
    middles: [
      { id: "mid-701", code: 701, name: "서버", majorId: "maj-7" },
      { id: "mid-702", code: 702, name: "스토리지", majorId: "maj-7" },
      { id: "mid-703", code: 703, name: "연산장치", majorId: "maj-7" },
      { id: "mid-704", code: 704, name: "네트워크장비", majorId: "maj-7" },
    ],
  },
  {
    id: "maj-8", code: 8, name: "방송장비",
    middles: [
      { id: "mid-801", code: 801, name: "영상장비", majorId: "maj-8" },
      { id: "mid-802", code: 802, name: "음향장비", majorId: "maj-8" },
    ],
  },
  {
    id: "maj-9", code: 9, name: "가전제품",
    middles: [
      { id: "mid-901", code: 901, name: "생활가전", majorId: "maj-9" },
      { id: "mid-902", code: 902, name: "영상가전", majorId: "maj-9" },
      { id: "mid-903", code: 903, name: "주방가전", majorId: "maj-9" },
    ],
  },
  { id: "maj-6", code: 6, name: "소프트웨어", middles: [{ id: "mid-601", code: 601, name: "소프트웨어", majorId: "maj-6" }] },
  { id: "maj-10", code: 10, name: "기타자산", middles: [{ id: "mid-1001", code: 1001, name: "기타자산", majorId: "maj-10" }] },
];

export const BUILDINGS: Building[] = [
  { id: "b-142", campus: "강원대학교 춘천캠퍼스", code: "B0000142", name: "집현관(제2도서관)" },
  { id: "b-038", campus: "강원대학교 춘천캠퍼스", code: "B0000038", name: "보듬관" },
  { id: "b-025", campus: "강원대학교 춘천캠퍼스", code: "B0000025", name: "60주년 기념관(종합강의동)" },
  { id: "b-225", campus: "강원대학교 춘천캠퍼스", code: "B0000225", name: "KNU 스타트업 큐브(나동)" },
  { id: "b-144", campus: "강원대학교 춘천캠퍼스", code: "B0000144", name: "GEM홀" },
];

// 빠른 조회용 헬퍼
export function findMiddleByName(name: string) {
  for (const maj of MAJOR_CATEGORIES) {
    const mid = maj.middles.find((m) => m.name === name);
    if (mid) return { major: maj, middle: mid };
  }
  return null;
}
