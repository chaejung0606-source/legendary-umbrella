// API 인증 가드 + 날짜(KST) 회귀.
//
// 배경 1 — 미들웨어(src/middleware.ts)의 matcher 는 화면 경로만 보호한다. /api/* 는 걸리지
//   않으므로 예전에는 /api/export/* 를 주소만 알면 로그인 없이 자산원장 전체(906건)를
//   내려받을 수 있었다. 라우트에서 직접 세션+메뉴권한을 확인하도록 고친 뒤의 회귀 테스트다.
// 배경 2 — 구글시트 연동용 /api/sheets/* 와 진단용 /api/health 는 **공개가 정상**이다.
//   보호를 강화하다 이쪽까지 막으면 시트 자동 반영이 죽으므로 함께 확인한다.
// 배경 3 — 앱의 "오늘"이 고정 문자열(2026-06-30)로 박혀 있어 대여·수불 일자가 과거로
//   기록되던 버그를 고쳤다. 화면 기본값이 실제 오늘(KST)인지 확인한다.
//
// 전제: 앱이 E2E_BASE 에 떠 있고, 같은 DATABASE_URL 을 볼 수 있어야 한다.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

if (existsSync('.env')) { try { process.loadEnvFile('.env'); } catch { /* 무시 */ } }

const BASE = process.env.E2E_BASE || 'http://localhost:3100';
const ADMIN = process.env.E2E_ADMIN || 'admin@sadan.local';
const ADMIN_PW = process.env.E2E_ADMIN_PW || 'admin1234';

// 권한을 대시보드 하나로 좁힌 계정 — 403 확인용. 끝나면 지운다.
const LIMITED_EMAIL = 'limited@e2e.local';
const LIMITED_PW = 'limited1234';

const kstToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const results = [], fails = [];
function log(n, ok, d = '') { results.push(ok); if (!ok) fails.push(n); console.log(`${ok ? 'PASS' : 'FAIL'} — ${n}${d ? ` :: ${d}` : ''}`); }

const prisma = new PrismaClient({ log: ['error'] });
const cleanup = () => prisma.account.deleteMany({ where: { email: LIMITED_EMAIL } });

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

// 브라우저 컨텍스트(=쿠키)를 그대로 쓰는 요청. 로그인 상태가 반영된다.
const status = async (path) => (await ctx.request.get(BASE + path, { maxRedirects: 0 })).status();

async function login(email, pw) {
  await ctx.clearCookies();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForTimeout(2500);
}

try {
  await cleanup();

  console.log('== A. 비로그인 — 내보내기 API 는 전부 차단 ==');
  await ctx.clearCookies();
  for (const kind of ['assets', 'consumables', 'promo', 'promo-ledger', 'report', 'asset-template']) {
    const s = await status(`/api/export/${kind}`);
    log(`A ${kind} 비로그인 차단`, s === 401, `status ${s}`);
  }

  console.log('== B. 비로그인 — 공개로 남아야 하는 엔드포인트 ==');
  for (const kind of ['assets', 'loans', 'materials', 'promo']) {
    const s = await status(`/api/sheets/${kind}`);
    log(`B 구글시트 CSV /api/sheets/${kind} 공개 유지`, s === 200, `status ${s}`);
  }
  log('B /api/health 공개 유지', (await status('/api/health')) === 200);

  console.log('== C. 관리자 로그인 — 정상 다운로드 ==');
  await login(ADMIN, ADMIN_PW);
  log('C0 관리자 로그인', page.url().endsWith('/dashboard'), page.url());
  for (const kind of ['assets', 'consumables', 'promo', 'promo-ledger', 'report', 'asset-template']) {
    const res = await ctx.request.get(`${BASE}/api/export/${kind}`);
    const xlsx = (res.headers()['content-type'] || '').includes('spreadsheetml');
    log(`C ${kind} 다운로드 성공`, res.status() === 200 && xlsx, `status ${res.status()}`);
  }

  console.log('== D. 권한 없는 계정 — 메뉴 권한별 403 ==');
  // 평문으로 만들어도 첫 로그인에 해시로 자동 전환된다(password-hashing 스위트 참조).
  await prisma.account.create({
    data: {
      id: 'acc-e2e-limited', name: '[E2E-TEST] 제한계정', email: LIMITED_EMAIL, password: LIMITED_PW,
      role: 'user', permissions: ['dashboard'], active: true, createdAt: new Date().toISOString(),
    },
  });
  await login(LIMITED_EMAIL, LIMITED_PW);
  log('D0 제한계정 로그인', page.url().endsWith('/dashboard'), page.url());
  for (const kind of ['assets', 'consumables', 'promo', 'promo-ledger', 'asset-template']) {
    const s = await status(`/api/export/${kind}`);
    log(`D ${kind} 권한 없음 차단`, s === 403, `status ${s}`);
  }
  log('D report 는 대시보드 권한으로 허용', (await status('/api/export/report')) === 200);

  console.log('== E. 잘못된 종류 ==');
  log('E 알 수 없는 kind 는 400', (await status('/api/export/없는것')) === 400);

  console.log('== F. 날짜 기본값이 실제 오늘(KST) ==');
  const today = kstToday();
  await login(ADMIN, ADMIN_PW);
  await page.goto(BASE + '/loans/new', { waitUntil: 'networkidle' });
  const loanedAt = await page.locator('input[name="loanedAt"]').inputValue();
  log('F1 대여 신청서 대여일자 기본값 = 오늘', loanedAt === today, `${loanedAt} vs ${today}`);
  const dueMin = await page.locator('input[name="dueAt"]').getAttribute('min');
  log('F2 반납 예정일 최소값 = 오늘', dueMin === today, `${dueMin} vs ${today}`);

  // 반납서는 자산을 고른 뒤에야 상세 입력란이 뜬다(대여 중인 자산 목록에서 선택).
  await page.goto(BASE + '/loans/return', { waitUntil: 'networkidle' });
  const picker = page.locator('main select').first();
  await picker.selectOption({ index: 1 });
  await page.locator('input[name="returnedAt"]').waitFor({ state: 'visible' });
  const returnedAt = await page.locator('input[name="returnedAt"]').inputValue();
  log('F3 반납 신청서 반납일자 기본값 = 오늘', returnedAt === today, `${returnedAt} vs ${today}`);

  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  const monthText = await page.getByText(`${today.slice(0, 7)} 기준`).count();
  log('F4 대시보드 "이번 달 신규" 가 이번 달 기준', monthText > 0, `${today.slice(0, 7)} 기준`);

  console.log('== G. 진단 필드 ==');
  const health = await (await ctx.request.get(BASE + '/api/health')).json();
  log('G1 health 에 auth 상태 포함', typeof health.auth === 'string', String(health.auth));
  log('G2 health 가 접속정보를 노출하지 않음',
    !JSON.stringify(health).match(/postgres|password|@|:5432|:6543/i));
} finally {
  await cleanup();
  await prisma.$disconnect();
  await browser.close();
}

const pass = results.filter(Boolean).length;
console.log(`\n===== API 가드/날짜: ${pass}/${results.length} PASS =====`);
if (fails.length) { console.log('실패:', fails.join(' · ')); process.exit(1); }
