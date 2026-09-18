// 자산 등록 방어 회귀 — 금액/번호 경계값과 저장 메시지.
//
// 배경: 취득단가에 음수·소수·비정상적으로 큰 값이 들어가면 대시보드 취득액 합계가 깨지거나
//   Prisma Int 저장에서 예외가 났다. 서버 액션(createAssetAction/updateAssetAction)에
//   0 이상 정수 가드를 넣었고, 폼 입력에도 min/step 을 걸었다. 또한 저장 성공 화면의
//   "DB 미연동 — 서버 재시작 시 초기화" 라는 낡은(거짓) 문구를 제거했다.
//
// 판정은 "총 자산 건수" 불변식으로 한다: 불량 값 시도는 저장되지 않아야 하고,
//   정상 값 한 건만 증가해야 한다. (토스트 타이밍에 의존하지 않아 안정적)
import { chromium } from 'playwright-core';

const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const ADMIN = process.env.E2E_ADMIN || 'admin@sadan.local';
const ADMIN_PW = process.env.E2E_ADMIN_PW || 'admin1234';
const results = [], fails = [];
const log = (n, ok, d = '') => { results.push(ok); if (!ok) fails.push(n); console.log(`${ok ? 'PASS' : 'FAIL'} — ${n}${d ? ` :: ${d}` : ''}`); };

const b = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
const page = await ctx.newPage(); page.setDefaultTimeout(30000);

async function login() {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.locator('input[type=email]').fill(ADMIN);
  await page.locator('input[type=password]').fill(ADMIN_PW);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL((u) => u.pathname !== '/', { timeout: 30000 });
}
async function assetTotal() {
  await page.goto(BASE + '/assets', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => {});
  const m = (await page.locator('body').innerText()).match(/총\s*([\d,]+)\s*건/);
  return m ? Number(m[1].replace(/,/g, '')) : -1;
}
async function fillRequired(name) {
  await page.goto(BASE + '/assets/new', { waitUntil: 'load' });
  await page.locator('input[name=itemName]').fill(name);
  const major = page.locator('select').first();
  await major.selectOption({ label: '가구' }).catch(async () => { await major.selectOption({ index: 1 }); });
  const mid = page.locator('select').nth(1);
  await page.waitForFunction((el) => el && !el.disabled && el.options.length > 1, await mid.elementHandle(), { timeout: 5000 }).catch(() => {});
  await mid.selectOption({ index: 1 });
  await page.locator('input[type=date]').first().fill('2026-09-18');
}
async function trySubmit(price, stripConstraints) {
  const up = page.locator('input[name=unitPrice]');
  if (stripConstraints) await up.evaluate((el) => { el.removeAttribute('min'); el.removeAttribute('step'); });
  await up.fill(String(price));
  await page.getByRole('button', { name: /자산 등록/ }).click();
  await page.waitForTimeout(1600);
  return (await page.locator('text=/등록 완료/').count()) > 0; // 저장 성공 여부
}

try {
  await login();
  const before = await assetTotal();
  log('자산 총계 조회', before >= 0, String(before));

  await fillRequired('[QA] 음수단가');
  log('음수 단가 저장 거부', !(await trySubmit(-5000, true)));

  await fillRequired('[QA] 소수단가');
  log('소수점 단가 저장 거부', !(await trySubmit('1.5', true)));

  await fillRequired('[QA] 초과단가');
  log('과도한 금액 저장 거부', !(await trySubmit('9999999999999', true)));

  await fillRequired('[QA] 정상단가');
  const okSaved = await trySubmit('150000', false);
  log('정상 단가 저장 성공', okSaved);
  const body = await page.locator('body').innerText();
  log('낡은 "DB 미연동/재시작/데모" 문구 없음', !/DB 미연동|재시작 시 초기화|데모 데이터에 반영/.test(body));

  const after = await assetTotal();
  log('총계는 정상 1건만 증가', after === before + 1, `${before} → ${after}`);
} finally {
  await b.close();
}
const pass = results.filter(Boolean).length;
console.log(`\n===== 자산 등록 방어: ${pass}/${results.length} PASS =====`);
if (fails.length) { console.log('실패:', fails.join(' · ')); process.exit(1); }
