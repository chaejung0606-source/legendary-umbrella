// 읽기 전용 스모크 테스트 — 프리뷰/프로덕션 **배포 주소**에 대고 돈다.
//
// 목적: 배포 직후 "제대로 열리는지"를 사람 손 없이 몇 분 안에 가른다.
//   A. /api/health — DB 연결·세션 서명키(AUTH_SECRET) 상태, 접속정보 미노출
//   B. 로그인 화면 — Application error 없이 뜨는지, 표시 버전이 이 저장소 버전과 같은지
//   C. 비로그인 보호 — 화면 경로는 307 → /?next=…, 오픈 리다이렉트 차단
//   D. API 가드 — /api/export/* 401, 알 수 없는 종류 400, /api/sheets/* 공개(또는 연동 키) 유지
//   E. 로그인 — v3.2.0 에서 나던 "Application error" 회귀, DB 장애 시에도 안내 문구로 남는지
//   F. 날짜 기본값 — 대여·반납 신청서와 대시보드 '이번 달'이 실제 오늘(KST) 기준 (v3.3.1 회귀)
//   G. 화면 순회 — 주요 화면이 서버 오류·페이지 오류·4xx 없이 열리는지
//   H. 로그인 상태 내보내기 — 권한 있는 계정은 xlsx 를 받는지
//   I. 모바일 폭(390px) 무횡스크롤
//   J. 로그아웃 → 보호 경로 다시 차단, 외부 `next` 로는 로그인 후에도 이동하지 않음
//
// **데이터를 만들거나 바꾸지 않는다.** 서버로 보내는 POST 는 로그인/로그아웃 서버 액션 둘뿐이라
// 운영 DB 에 대고 돌려도 안전하다. 다른 스위트와 달리 DB 에 직접 붙지 않으므로 접속 문자열도 필요 없다.
//
// 실행 예:
//   E2E_BASE=https://sadan-asset-platform.vercel.app node e2e/smoke.e2e.mjs
//   E2E_BASE=https://<preview>.vercel.app E2E_ADMIN=me@x.y E2E_ADMIN_PW=… node e2e/smoke.e2e.mjs
//
// 환경변수:
//   E2E_BASE            검사할 주소 (기본 http://localhost:3100)
//   E2E_ADMIN / E2E_ADMIN_PW  로그인 계정 (기본 admin@sadan.local / admin1234). 빈 문자열이면 E~J 는 SKIP.
//   E2E_SHEETS_KEY      배포에 SHEETS_ACCESS_KEY 가 설정돼 있으면 같은 값 → 키 없는 요청 401, 키 있는 요청 200 확인
//   E2E_EXPECT_VERSION  로그인 화면 하단 버전 기대값 (기본 package.json version, "skip" 이면 건너뜀)
//   E2E_TIMEOUT_MS      원격 응답 대기 (기본 30000 — Vercel 콜드스타트 감안)
//   E2E_PROXY           HTTP(S) 프록시 뒤에서 돌릴 때 (기본 HTTPS_PROXY 환경변수)
//   E2E_CHROMIUM        Chromium 실행 경로 (기본 /opt/pw-browsers/chromium)
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = (process.env.E2E_BASE || 'http://localhost:3100').replace(/\/+$/, '');
const ADMIN = process.env.E2E_ADMIN ?? 'admin@sadan.local';
const ADMIN_PW = process.env.E2E_ADMIN_PW ?? 'admin1234';
const SHEETS_KEY = process.env.E2E_SHEETS_KEY || '';
const PROXY = process.env.E2E_PROXY ?? process.env.HTTPS_PROXY ?? '';
const TIMEOUT = Number(process.env.E2E_TIMEOUT_MS || 30_000);
const PKG_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const EXPECT_VERSION = process.env.E2E_EXPECT_VERSION ?? PKG_VERSION;

const kstToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const TODAY = kstToday();
const MONTH = TODAY.slice(0, 7);

// 화면에 이 문구가 보이면 서버/클라이언트 오류 경계가 렌더된 것이다.
const ERROR_TEXT = /Application error|일시적인 오류가 발생했습니다|Internal Server Error|This page could not be found/;

// ── 결과 집계 ─────────────────────────────────────────────────────────────
const results = [];
function log(name, ok, detail = '') { results.push({ name, status: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`); return ok; }
function skip(name, why) { results.push({ name, status: 'SKIP', detail: why }); console.log(`SKIP — ${name} :: ${why}`); }
async function section(title, fn) {
  console.log(`\n== ${title} ==`);
  try { await fn(); } catch (e) { log(`${title} 실행 중 예외`, false, String(e.message || e).split('\n')[0]); }
}

// ── 브라우저 ───────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium',
  ...(PROXY ? { proxy: { server: PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
const page = await ctx.newPage();
page.setDefaultTimeout(TIMEOUT);

// 페이지 단위 오류 수집 — 화면을 열 때마다 drain() 으로 비우고 판정한다.
const pageErrors = [], consoleErrors = [], badResponses = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('response', (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 400) badResponses.push(`${r.status()} ${u.slice(BASE.length).split('?')[0]}`); });
function drain() {
  const snap = {
    pageErrors: pageErrors.splice(0),
    // 리소스 4xx 는 badResponses 로 따로 잡으므로 콘솔의 중복 메시지는 뺀다.
    consoleErrors: consoleErrors.splice(0).filter((t) => !/favicon|Failed to load resource/i.test(t)),
    badResponses: badResponses.splice(0),
  };
  const ok = !snap.pageErrors.length && !snap.consoleErrors.length && !snap.badResponses.length;
  const detail = [...snap.pageErrors.map((s) => `pageerror ${s}`), ...snap.consoleErrors.map((s) => `console ${s}`), ...snap.badResponses].join(' | ').slice(0, 300);
  return { ok, detail };
}

// 브라우저 컨텍스트의 쿠키를 그대로 쓰는 HTTP 요청(리다이렉트는 따라가지 않는다).
const http = (path, opts = {}) => ctx.request.get(BASE + path, { maxRedirects: 0, timeout: TIMEOUT, ...opts });
const bodyText = () => page.locator('body').innerText();

async function open(path) {
  drain();
  const res = await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  return res;
}

async function login(email, pw, entry = '/') {
  await ctx.clearCookies();
  await open(entry);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.getByRole('button', { name: '로그인' }).click();
  await Promise.race([
    page.waitForURL((u) => u.pathname !== '/', { timeout: TIMEOUT }),
    page.locator('form .ceramic-pink').waitFor({ state: 'visible', timeout: TIMEOUT }),
  ]).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  const banner = page.locator('form .ceramic-pink');
  return { url: new URL(page.url()), error: (await banner.count()) ? (await banner.first().innerText()).trim() : null };
}

console.log(`대상: ${BASE}\n오늘(KST): ${TODAY} · 기대 버전: v${EXPECT_VERSION}${PROXY ? ` · 프록시: ${PROXY}` : ''}`);

let dbUp = false, loggedIn = false;
const MENUS = [
  ['/dashboard', '안녕하세요'], ['/assets', '자산'], ['/loans', '대여 관리'], ['/consumables', '연구재료'],
  ['/promo', '홍보'], ['/rfid', 'RFID'], ['/settings', '설정'],
];
const EXTRA_SCREENS = [['/laptop-loans', '노트북'], ['/assets/new', '자산 등록'], ['/loans/new', '대여'], ['/loans/return', '반납']];
const EXPORT_KINDS = ['assets', 'consumables', 'promo', 'promo-ledger', 'report', 'asset-template'];
const SHEET_KINDS = ['assets', 'loans', 'materials', 'promo'];

try {
  await section('A. 상태 점검 /api/health', async () => {
    const res = await http('/api/health');
    let body = {};
    try { body = await res.json(); } catch { /* JSON 이 아니면 아래에서 실패로 잡힌다 */ }
    dbUp = res.status() === 200 && body.ok === true && body.db === '연결됨';
    log('A1 DB 연결됨 (200 · ok:true)', dbUp, `status ${res.status()} · ${JSON.stringify(body).slice(0, 160)}`);
    log('A2 AUTH_SECRET 설정됨', body.auth === '설정됨', `auth=${body.auth}`);
    log('A3 응답에 접속정보 없음', !/postgres|password|@|:5432|:6543|supabase/i.test(JSON.stringify(body)));
    if (dbUp) log('A4 로그인 가능한 계정 존재', Number(body.accounts) >= 1, `accounts=${body.accounts}`);
    else skip('A4 로그인 가능한 계정 존재', 'DB 연결 실패');
    log('A5 Cache-Control: no-store', /no-store/.test(res.headers()['cache-control'] || ''), res.headers()['cache-control'] || '(없음)');
  });

  await section('B. 로그인 화면(비로그인)', async () => {
    await ctx.clearCookies();
    const res = await open('/');
    log('B1 / 200', res.status() === 200, `status ${res.status()}`);
    const text = await bodyText();
    const hasForm = (await page.locator('input[type="email"]').count()) === 1 && (await page.locator('input[type="password"]').count()) === 1
      && (await page.getByRole('button', { name: '로그인' }).count()) === 1;
    log('B2 로그인 폼 표시 · Application error 없음', hasForm && !ERROR_TEXT.test(text), hasForm ? '' : '폼 요소 누락');
    const shown = text.match(/v(\d+\.\d+\.\d+)/)?.[1];
    if (EXPECT_VERSION === 'skip') skip('B3 표시 버전 = 저장소 버전', '기대값 skip');
    else log('B3 표시 버전 = 저장소 버전', shown === EXPECT_VERSION, `화면 v${shown ?? '?'} · 기대 v${EXPECT_VERSION}`);
    const snap = drain();
    log('B4 로그인 화면 콘솔/페이지 오류·4xx 없음', snap.ok, snap.detail);
    await open('/welcome');
    log('B5 /welcome → 로그인 화면으로 통합', new URL(page.url()).pathname === '/' && (await page.locator('input[type="email"]').count()) === 1, page.url());
  });

  await section('C. 비로그인 보호(화면 경로)', async () => {
    await ctx.clearCookies();
    for (const [p] of [...MENUS, ...EXTRA_SCREENS]) {
      const res = await http(p);
      const loc = res.headers().location || '';
      const ok = res.status() === 307 && /^(https?:\/\/[^/]+)?\/\?next=/.test(loc) && loc.includes(encodeURIComponent(p));
      log(`C ${p} → 307 로그인(next 복귀)`, ok, `status ${res.status()} loc ${loc}`);
    }
    const evil = await http('/?next=https://evil.example');
    log('C 외부 next 로 서버 리다이렉트 없음', evil.status() === 200 && !evil.headers().location, `status ${evil.status()} loc ${evil.headers().location || '(없음)'}`);
  });

  await section('D. API 가드(비로그인)', async () => {
    await ctx.clearCookies();
    for (const k of EXPORT_KINDS) {
      const res = await http(`/api/export/${k}`);
      log(`D /api/export/${k} 비로그인 401`, res.status() === 401, `status ${res.status()}`);
    }
    log('D /api/export/없는것 400', (await http('/api/export/없는것')).status() === 400);
    log('D /api/sheets/없는것 400', (await http('/api/sheets/없는것')).status() === 400);
    for (const k of SHEET_KINDS) {
      if (SHEETS_KEY) {
        const noKey = await http(`/api/sheets/${k}`);
        log(`D /api/sheets/${k} 키 없음 401`, noKey.status() === 401, `status ${noKey.status()}`);
      }
      const res = await http(`/api/sheets/${k}${SHEETS_KEY ? `?key=${encodeURIComponent(SHEETS_KEY)}` : ''}`);
      const csv = (res.headers()['content-type'] || '').includes('text/csv');
      const text = res.status() === 200 ? await res.text() : '';
      log(`D /api/sheets/${k} ${SHEETS_KEY ? '키 포함 ' : ''}200 CSV(BOM)`, res.status() === 200 && csv && text.charCodeAt(0) === 0xfeff,
        `status ${res.status()} · ${res.headers()['content-type'] || ''}${text ? ` · ${text.split(/\r?\n/).length - 1}행` : ''}`);
    }
  });

  await section('E. 로그인', async () => {
    if (!ADMIN || !ADMIN_PW) { skip('E 로그인', 'E2E_ADMIN/E2E_ADMIN_PW 비어 있음'); return; }
    const r = await login(ADMIN, ADMIN_PW);
    const text = await bodyText();
    if (!dbUp) {
      // DB 가 죽어 있어도 로그인 화면은 오류 화면이 아니라 안내 문구로 남아야 한다(v3.2.1).
      log('E0 DB 장애 시 로그인 화면이 안내 문구로 유지(Application error 아님)',
        r.url.pathname === '/' && !ERROR_TEXT.test(text) && /서버에 연결하지 못했습니다|처리하지 못했습니다/.test(r.error || ''), r.error || '(안내 없음)');
      skip('E1~J 로그인 이후 검사', 'DB 연결 실패로 로그인 불가');
      return;
    }
    loggedIn = r.url.pathname !== '/' && !r.error;
    log('E1 로그인 → 첫 허용 메뉴 진입', loggedIn, `${r.url.pathname}${r.error ? ` · ${r.error}` : ''}`);
    log('E2 로그인 직후 Application error 없음', !ERROR_TEXT.test(text));
    const snap = drain();
    log('E3 로그인 흐름 페이지 오류·4xx 없음', snap.ok, snap.detail);
    if (!loggedIn) skip('F~J 로그인 이후 검사', '로그인 실패');
  });

  await section('F. 날짜 기본값 = 오늘(KST)', async () => {
    if (!loggedIn) return;
    await open('/loans/new');
    if (new URL(page.url()).pathname !== '/loans/new') { skip('F1~F3 대여·반납 신청서 날짜', `대여 메뉴 권한 없음 → ${page.url()}`); }
    else {
      const loanedAt = await page.locator('input[name="loanedAt"]').inputValue();
      log('F1 대여 신청서 대여일자 기본값 = 오늘', loanedAt === TODAY, `${loanedAt} vs ${TODAY}`);
      const dueMin = await page.locator('input[name="dueAt"]').getAttribute('min');
      log('F2 반납 예정일 최소값 = 오늘', dueMin === TODAY, `${dueMin} vs ${TODAY}`);
      await open('/loans/return');
      const picker = page.locator('main select').first();
      const options = await picker.locator('option').count();
      if (options <= 1) skip('F3 반납 신청서 반납일자 기본값 = 오늘', '현재 대여 중인 자산이 없음');
      else {
        await picker.selectOption({ index: 1 }); // 선택만 한다 — 제출하지 않는다
        const returnedAt = await page.locator('input[name="returnedAt"]').inputValue();
        log('F3 반납 신청서 반납일자 기본값 = 오늘', returnedAt === TODAY, `${returnedAt} vs ${TODAY}`);
      }
    }
    await open('/dashboard');
    if (new URL(page.url()).pathname !== '/dashboard') skip('F4 대시보드 이번 달 기준', '대시보드 권한 없음');
    else log('F4 대시보드 "이번 달 신규" = 이번 달 기준', (await page.getByText(`${MONTH} 기준`).count()) > 0, `${MONTH} 기준`);
  });

  await section('G. 화면 순회(읽기 전용)', async () => {
    if (!loggedIn) return;
    for (const [p, needle] of [...MENUS, ...EXTRA_SCREENS]) {
      const res = await open(p);
      const finalPath = new URL(page.url()).pathname;
      if (finalPath === '/' ) { log(`G ${p}`, false, `세션 상실 → ${page.url()}`); continue; }
      if (finalPath !== p) { skip(`G ${p}`, `권한 없음 → ${finalPath}`); continue; }
      const text = await bodyText();
      const snap = drain();
      log(`G ${p} 200 · 오류 없음`, res.status() === 200 && !ERROR_TEXT.test(text) && text.includes(needle) && snap.ok,
        `status ${res.status()}${text.includes(needle) ? '' : ` · "${needle}" 없음`}${snap.detail ? ` · ${snap.detail}` : ''}`);
    }
    // 자산 상세 — 목록의 첫 항목을 따라간다(있을 때만).
    await open('/assets');
    const first = page.locator('a[href^="/assets/"]:not([href="/assets/new"])').first();
    if (!(await first.count())) skip('G 자산 상세', '목록에 자산 링크 없음');
    else {
      const href = await first.getAttribute('href');
      const res = await open(href);
      const snap = drain();
      log(`G 자산 상세 ${href}`, res.status() === 200 && !ERROR_TEXT.test(await bodyText()) && snap.ok, `status ${res.status()} ${snap.detail}`);
    }
  });

  await section('H. 로그인 상태 내보내기', async () => {
    if (!loggedIn) return;
    for (const k of ['assets', 'report']) {
      const res = await http(`/api/export/${k}`);
      const xlsx = (res.headers()['content-type'] || '').includes('spreadsheetml');
      if (res.status() === 403) { skip(`H /api/export/${k}`, '이 계정에 해당 메뉴 권한 없음(403)'); continue; }
      log(`H /api/export/${k} 200 xlsx`, res.status() === 200 && xlsx, `status ${res.status()} · ${res.headers()['content-type'] || ''}`);
    }
  });

  await section('I. 모바일 폭(390px) 무횡스크롤', async () => {
    if (!loggedIn) return;
    await page.setViewportSize({ width: 390, height: 844 });
    for (const p of ['/dashboard', '/assets', '/loans/new']) {
      await open(p);
      if (new URL(page.url()).pathname !== p) { skip(`I ${p}`, '권한 없음'); continue; }
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      log(`I ${p} scrollWidth ≤ 화면폭`, sw <= iw + 1, `${sw} vs ${iw}`);
    }
    await page.setViewportSize({ width: 1440, height: 950 });
  });

  await section('J. 로그아웃 · next 안전성', async () => {
    if (!loggedIn) return;
    await open('/dashboard');
    const btn = page.getByRole('button', { name: '로그아웃' }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForURL((u) => u.pathname === '/', { timeout: TIMEOUT }).catch(() => {});
      log('J1 로그아웃 → 로그인 화면', new URL(page.url()).pathname === '/', page.url());
    } else { skip('J1 로그아웃 버튼', '버튼을 찾지 못함 — 쿠키만 비움'); await ctx.clearCookies(); }
    const after = await http('/dashboard');
    log('J2 로그아웃 뒤 /dashboard 다시 307', after.status() === 307, `status ${after.status()}`);
    // 외부 주소가 next 로 들어와도 로그인 뒤 내부 첫 메뉴로만 간다(오픈 리다이렉트 차단).
    const r = await login(ADMIN, ADMIN_PW, '/?next=https://evil.example/');
    log('J3 외부 next 무시 → 내부 메뉴', r.url.origin === new URL(BASE).origin && r.url.pathname !== '/' && !r.error, r.url.href);
    await ctx.clearCookies();
  });
} finally {
  await browser.close();
}

const count = (s) => results.filter((r) => r.status === s).length;
const fails = results.filter((r) => r.status === 'FAIL');
console.log(`\n===== 스모크(${BASE}): ${count('PASS')} PASS · ${count('FAIL')} FAIL · ${count('SKIP')} SKIP (총 ${results.length}) =====`);
if (fails.length) { console.log('실패:\n' + fails.map((f) => `  - ${f.name}${f.detail ? ` :: ${f.detail}` : ''}`).join('\n')); process.exit(1); }
