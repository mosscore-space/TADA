if (window.top !== window.self) {
  document.body.textContent = 'TADA cannot run inside a frame.';
  throw new Error('framed');
}
(() => {
'use strict';

/* ═════════ helpers ═════════ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmtDate = ms => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtTime = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDur = min => { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h ${pad(m)}m` : `${m}m`; };
const fmtHMS = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const toLocalInput = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const tripMin = t => (t.end - t.start) / 60000;

const ICON = {
  track:'<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  settings:'<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2.2"/><circle cx="9" cy="12" r="2.2"/><circle cx="17" cy="18" r="2.2"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  play:'<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  left:'<path d="M15 5l-7 7 7 7"/>', right:'<path d="M9 5l7 7-7 7"/>',
  cloud:'<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.75 3.75 0 0 1 17.5 18z"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M3 3l18 18"/><path d="M10.6 6.1A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 7.6C3.8 9.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  starfill:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" fill="currentColor"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  upload:'<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

/* ═════════ storage ═════════ */
const K = { auth:'tada.auth', data:'tada.data', local:'tada.local', fails:'tada.fails' };
const AUTOLOCK_MS = 5 * 60 * 1000;
const SESSION_KEY = 'tada.unlocked';
const jget = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Could not save — storage blocked or full'); return false; } };

const DEFAULT_ISLANDS = ['Gdh Thinadhoo','Gdh Madaveli','Gdh Hoandedhdhoo','Gdh Fiyoaree','Gdh Rathafandhoo','Gdh Nadella','Gdh Faresmaathodaa','Gdh Vaadhoo'];
const DEFAULT_REASONS = ['ATM Maintenance','ATM Maintenance with tech','ATM Jam','Card Delivery','Mobile Banking Trip','Sales Trip'];
const THEMES = [
  { id:'matcha',   name:'Matcha',       c:['#E9F1D8','#3E5E22','#6E9A3E'] },
  { id:'night',    name:'Matcha Night', c:['#11190F','#A5C96A','#26361F'] },
  { id:'espresso', name:'Espresso',     c:['#1A100C','#C49A6C','#3A261C'] },
  { id:'lagoon',   name:'Lagoon',       c:['#E1F0F4','#0F6E8A','#2A9CB9'] },
  { id:'sunset',   name:'Sunset',       c:['#FBEBE2','#B8512E','#E0794F'] },
  { id:'midnight', name:'Midnight',     c:['#0E1320','#7C97FF','#222B43'] }
];

let data = Object.assign({ trips:[], islands:DEFAULT_ISLANDS.slice(), reasons:DEFAULT_REASONS.slice(), home:'Gdh Thinadhoo', settingsUpdatedAt:0, deleted:{} }, jget(K.data, {}));
let local = Object.assign({ theme:'matcha', active:null, remember:false }, jget(K.local, {}));
local.gh = Object.assign({ repo:'', branch:'main', path:'tada-data.json', token:'', auto:true, lastSync:0 }, local.gh || {});
const saveData = () => jset(K.data, data);
const saveLocal = () => jset(K.local, local);

/* ═════════ formatting rules ═════════ */
function fmtReason(s) {
  s = String(s).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  if (s === s.toUpperCase() && /[A-Z]/.test(s)) s = s.toLowerCase();   // shouted input → calm it down
  s = s.replace(/\b[A-Z]{5,}\b/g, w => w.toLowerCase());               // long SHOUTED words → lowercase (short acronyms like CRM stay)
  s = s.replace(/\batm\b/gi, 'ATM');                                     // ATM is always full caps
  return s.charAt(0).toUpperCase() + s.slice(1);                          // sentence-style first capital
}
function fmtIsland(s) {
  s = String(s).trim().replace(/\s+/g, ' ');
  if (s && s === s.toLowerCase()) s = s.replace(/\b[a-z]/g, c => c.toUpperCase());
  return s;
}
const touchSettings = () => { data.settingsUpdatedAt = Date.now(); };

/* ═════════ password ═════════ */
const b64e = u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
const b64d = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
async function hashPw(pw, salt, alg) {
  pw = String(pw).normalize('NFC');                                      // same password, same hash, whatever keyboard composed it
  if (alg === 'pbkdf2') {
    if (!(window.crypto && crypto.subtle)) throw new Error('secure-context');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt:b64d(salt), iterations:150000, hash:'SHA-256' }, key, 256);
    return b64e(new Uint8Array(bits));
  }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57; const str = pw + salt;           // fallback when crypto.subtle is unavailable
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}
async function makeAuth(pw) {
  const salt = b64e(crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(16)) : Uint8Array.from({ length:16 }, () => Math.random() * 256));
  const alg = (window.crypto && crypto.subtle) ? 'pbkdf2' : 'weak';
  return { salt, alg, hash: await hashPw(pw, salt, alg) };
}
async function checkPw(pw) {
  const a = jget(K.auth, null); if (!a) return false;
  return (await hashPw(pw, a.salt, a.alg)) === a.hash;
}

/* ═════════ UI state ═════════ */
const ui = {
  tab:'track',            // track | history | settings
  flow:null,              // null | draft | start-time | end-time
  month:{ y:new Date().getFullYear(), m:new Date().getMonth() },
  syncState:'idle', syncMsg:'', unlocked:false
};
let draft = null, edit = null, pickH = 0, pickM = 0, tickTimer = null, installEvt = null;

/* ═════════ toast / sheet ═════════ */
let toastT;
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
let sheetRender = null;
function openSheet(renderFn) { sheetRender = renderFn; drawSheet(true); }
function drawSheet(fresh) {
  const host = $('#sheetHost');
  if (!sheetRender) { host.innerHTML = ''; return; }
  const prev = $('.sheet', host); const top = prev ? prev.scrollTop : 0;
  host.innerHTML = `<div class="backdrop" data-act="sheetBackdrop"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${sheetRender()}</div></div>`;
  const sh = $('.sheet', host); if (!fresh) sh.scrollTop = top;
  if (!fresh) $('.backdrop', host).style.animation = 'none', sh.style.animation = 'none';
}
function closeSheet() { sheetRender = null; edit = null; $('#sheetHost').innerHTML = ''; }
function confirmSheet(title, msg, okLabel, onOk, danger = true) {
  window.__confirmOk = () => { closeSheet(); onOk(); };
  openSheet(() => `<h3>${esc(title)}</h3><p class="muted" style="margin:6px 0 4px">${esc(msg)}</p>
    <div class="actions"><button class="btn ${danger ? 'warn' : ''}" data-act="confirmOk">${esc(okLabel)}</button><button class="btn ghost" data-act="closeSheet">Cancel</button></div>`);
}

/* ═════════ drag time picker ═════════ */
const ITEM = 48;
function buildDrum(host, count, value, onChange) {
  host.innerHTML = '<div class="pad"></div>' + Array.from({ length:count }, (_, i) => `<div class="it" data-i="${i}">${pad(i)}</div>`).join('') + '<div class="pad"></div>';
  const items = $$('.it', host);
  const read = () => Math.max(0, Math.min(count - 1, Math.round(host.scrollTop / ITEM)));
  let idx = -1;
  const mark = i => items.forEach((n, k) => { const d = Math.abs(k - i); n.className = 'it' + (d === 0 ? ' sel' : d === 1 ? ' n1' : d === 2 ? ' n2' : ''); });
  const set = (i, smooth) => host.scrollTo({ top:i * ITEM, behavior: smooth ? 'smooth' : 'auto' });
  host.addEventListener('scroll', () => { const i = read(); if (i !== idx) { idx = i; mark(i); onChange(i); } }, { passive:true });
  host.scrollTop = value * ITEM; idx = value; mark(value); onChange(value);
  // mouse drag (touch uses native momentum scrolling)
  let drag = null;
  host.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; drag = { y:e.clientY, top:host.scrollTop, moved:false }; host.setPointerCapture(e.pointerId); host.style.scrollSnapType = 'none'; host.style.cursor = 'grabbing'; });
  host.addEventListener('pointermove', e => { if (!drag) return; const dy = e.clientY - drag.y; if (Math.abs(dy) > 3) drag.moved = true; host.scrollTop = drag.top - dy; });
  const end = e => {
    if (!drag) return; const moved = drag.moved; drag = null; host.style.scrollSnapType = ''; host.style.cursor = '';
    if (!moved && e.type === 'pointerup') { const el = document.elementFromPoint(e.clientX, e.clientY); const it = el && el.closest && el.closest('.it'); if (it && host.contains(it)) return set(+it.dataset.i, true); }
    set(read(), true);
  };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
  return { set };
}
let drumH, drumM;
// Resolve picked HH:MM to a real timestamp: the latest moment ≤ now with that clock time.
function resolvePick(h, m, ref = Date.now()) {
  const r = new Date(ref);
  if (h === r.getHours() && m === r.getMinutes()) return ref;
  const d = new Date(ref); d.setHours(h, m, 0, 0);
  if (d.getTime() > ref) d.setDate(d.getDate() - 1);
  return d.getTime();
}
function updatePickDay() {
  const el = $('#pickDay'); if (!el) return;
  const ms = resolvePick(pickH, pickM); const d = new Date(ms);
  const rel = sameDay(ms, Date.now()) ? 'Today' : sameDay(ms, Date.now() - 864e5) ? 'Yesterday' : DOW[d.getDay()];
  el.textContent = `${rel} · ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  el.classList.toggle('warn', rel !== 'Today');
}
function mountPicker() {
  const now = new Date();
  drumH = buildDrum($('#drumH'), 24, now.getHours(), v => { pickH = v; updatePickDay(); });
  drumM = buildDrum($('#drumM'), 60, now.getMinutes(), v => { pickM = v; updatePickDay(); });
}

/* ═════════ trips ═════════ */
const monthTrips = (y, m) => data.trips.filter(t => { const d = new Date(t.start); return d.getFullYear() === y && d.getMonth() === m; }).sort((a, b) => b.start - a.start);
const routeShort = (o, ds) => [o, ...ds, o].map(n => n.replace(/^Gdh\s+/i, '')).join(' → ');   // full loop: origin → stops → back to origin

function tripRow(t, withDel = true) {
  const d = new Date(t.start);
  return `<div class="trip" data-act="editTrip" data-id="${esc(t.id)}">
    <div class="tile"><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div>
    <div class="grow">
      <div class="tt">${esc(t.destinations.join(', '))}</div>
      <div class="sub">From ${esc(t.origin)}</div>
      <div class="sub">${fmtTime(t.start)} → ${fmtTime(t.end)} · <b style="color:var(--text)">${fmtDur(tripMin(t))}</b></div>
      <div class="pills">${t.reasons.map(r => `<span class="pill-r">${esc(r)}</span>`).join('')}</div>
    </div>
    ${withDel ? `<button class="del" data-act="delTrip" data-id="${esc(t.id)}" aria-label="Delete trip">${ic('trash')}</button>` : ''}
  </div>`;
}

/* chip form shared by new-trip draft and the edit sheet */
const ctxState = c => c === 'edit' ? edit : draft;
function formFields(ctx) {
  const s = ctxState(ctx);
  const origins = data.islands.includes(s.origin) ? data.islands : [s.origin, ...data.islands];
  const destPool = [...data.islands.filter(i => i !== s.origin)];
  s.dests.forEach(d => { if (!destPool.includes(d) && d !== s.origin) destPool.push(d); });
  const reasonPool = [...data.reasons]; s.reasons.forEach(r => { if (!reasonPool.includes(r)) reasonPool.push(r); });
  return `
    <label class="lbl">Origin island</label>
    <select class="field" data-change="origin" data-ctx="${ctx}">${origins.map(i => `<option value="${esc(i)}" ${i === s.origin ? 'selected' : ''}>${esc(i)}${i === data.home ? ' (Home)' : ''}</option>`).join('')}</select>
    <label class="lbl">Destinations <span class="hint">pick one or more</span></label>
    <div class="chips">${destPool.map(i => `<button type="button" class="chip ${s.dests.includes(i) ? 'on' : ''}" data-act="tdest" data-ctx="${ctx}" data-v="${esc(i)}">${esc(i)}${i === data.home ? '<span class="home">HOME</span>' : ''}</button>`).join('')}</div>
    <label class="lbl">Reason <span class="hint">pick one or more</span></label>
    <div class="chips">${reasonPool.map(r => `<button type="button" class="chip ${s.reasons.includes(r) ? 'on' : ''}" data-act="treason" data-ctx="${ctx}" data-v="${esc(r)}">${esc(r)}</button>`).join('')}
      ${s.adding ? '' : `<button type="button" class="chip add" data-act="reasonAdd" data-ctx="${ctx}">${ic('plus').replace('class="ic "', 'class="ic" style="width:16px;height:16px"')} New reason</button>`}</div>
    ${s.adding ? `<form class="add-row" data-form="reasonNew" data-ctx="${ctx}"><input class="field" name="r" placeholder="e.g. atm cash replenishment" autocomplete="off" autocapitalize="sentences" maxlength="60"><button class="btn" type="submit">Add</button></form>` : ''}`;
}
function addReasonTo(ctx, raw) {
  const s = ctxState(ctx); const name = fmtReason(raw); if (!name) return;
  const found = data.reasons.find(r => r.toLowerCase() === name.toLowerCase());
  const use = found || name;
  if (!found) { data.reasons.push(use); touchSettings(); saveData(); scheduleSync(); }
  if (!s.reasons.includes(use)) s.reasons.push(use);
  s.adding = false;
}

/* ═════════ views ═════════ */
function titleFor() {
  if (ui.flow === 'draft') return 'New trip';
  if (ui.flow === 'start-time') return 'Start time';
  if (ui.flow === 'end-time') return 'End time';
  return { track:'Track', history:'History', settings:'Settings' }[ui.tab];
}
function renderShell() {
  document.body.classList.toggle('flow', !!ui.flow);
  const inFlow = !!ui.flow;
  const ghOn = !!(local.gh.repo && local.gh.token);
  const a = local.active;
  $('#root').innerHTML = `<div id="app">
    <div class="top">
      <div class="bar">
        ${inFlow ? `<button class="icon-btn" data-act="flowBack" aria-label="Back">${ic('back')}</button>` : '<span></span>'}
        <h2>${titleFor()}</h2>
        ${ghOn ? `<button class="icon-btn sync-ic ${ui.syncState}" data-act="syncNow" aria-label="Sync">${ic('cloud')}</button>` : '<span></span>'}
      </div>
      ${a ? `<button class="live" data-act="goTrack"><span class="pulse"></span><span class="grow"><span class="t" id="tick">${fmtHMS(Date.now() - a.start)}</span><div class="r">${esc(routeShort(a.origin, a.dests))}</div></span></button>` : ''}
    </div>
    <main id="main"></main>
    <nav class="nav">
      ${[['track','Track'],['history','History'],['settings','Settings']].map(([k, l]) => `<button data-act="tab" data-v="${k}" class="${ui.tab === k ? 'on' : ''}"><span class="pill">${ic(k)}</span>${l}</button>`).join('')}
    </nav>
  </div>`;
  renderMain();
}
function renderMain() {
  const m = $('#main'); if (!m) return;
  if (ui.tab === 'track') m.innerHTML = viewTrack();
  else if (ui.tab === 'history') m.innerHTML = viewHistory();
  else m.innerHTML = viewSettings();
  if (ui.tab === 'track' && (ui.flow === 'start-time' || ui.flow === 'end-time')) mountPicker();
  window.scrollTo(0, 0);
}

function viewTrack() {
  const a = local.active;
  if (ui.flow === 'draft') {
    const ok = draft.dests.length && draft.reasons.length;
    return formFields('draft') + `<div class="cta"><button class="btn big" data-act="proceed" id="proceedBtn" ${ok ? '' : 'disabled'}>Proceed with trip ${ic('right')}</button></div>`;
  }
  if (ui.flow === 'start-time' || ui.flow === 'end-time') {
    const starting = ui.flow === 'start-time';
    const r = starting ? draft : a;
    return `<div class="pick">
      <h3>${starting ? 'When did you leave?' : 'When did you arrive back?'}</h3>
      <div class="sub">${esc(routeShort(r.origin, r.dests))}</div>
      <div class="picker">
        <div class="cap c1">Hrs</div><div class="cap c3">Mins</div>
        <div class="band"></div>
        <div class="drum" id="drumH"></div>
        <div class="colon">:</div>
        <div class="drum" id="drumM"></div>
      </div>
      <div class="pick-day" id="pickDay"></div>
      <button class="link" data-act="pickNow">Set to current time</button>
    </div>
    <div class="cta"><button class="btn big ${starting ? '' : 'warn'}" data-act="${starting ? 'confirmStart' : 'confirmEnd'}">${starting ? ic('play') + ' Start trip' : ic('stop') + ' End trip'}</button></div>`;
  }
  if (a) {
    return `<div class="card">
      <h3>Trip in progress</h3>
      <div class="route">
        <div class="stop from"><small>From</small><b>${esc(a.origin)}</b></div>
        ${a.dests.map(d => `<div class="stop"><small>To</small><b>${esc(d)}</b></div>`).join('')}
        <div class="stop from"><small>Back to</small><b>${esc(a.origin)}</b></div>
      </div>
      <div class="pills">${a.reasons.map(r => `<span class="pill-r">${esc(r)}</span>`).join('')}</div>
      <div class="muted small" style="margin-top:12px">Started ${fmtTime(a.start)} · ${sameDay(a.start, Date.now()) ? 'today' : fmtDate(a.start)}</div>
    </div>
    <button class="btn big warn" data-act="endFlow">${ic('stop')} End trip</button>
    <div style="text-align:center;margin-top:8px"><button class="link danger" data-act="discard">Discard this trip</button></div>`;
  }
  const now = new Date(); const mt = monthTrips(now.getFullYear(), now.getMonth());
  const total = mt.reduce((s, t) => s + tripMin(t), 0);
  const last = [...data.trips].sort((x, y) => y.start - x.start)[0];
  return `<div class="card"><div class="muted small" style="margin-bottom:8px">${MONTHS[now.getMonth()]} so far</div>
      <div class="stats"><div><b>${mt.length}</b><span>${mt.length === 1 ? 'trip' : 'trips'}</span></div><div><b>${fmtDur(total)}</b><span>on the road</span></div></div></div>
    <div class="start-wrap"><button class="btn big" data-act="startFlow">${ic('play')} Start trip</button></div>
    ${last ? `<div class="sec">Last trip</div>${tripRow(last, false)}` : `<div class="empty">${ic('track', 'ic')}<div>No trips yet.<br>Tap <b>Start trip</b> when you head out.</div></div>`}`;
}

function viewHistory() {
  const { y, m } = ui.month; const list = monthTrips(y, m);
  const total = list.reduce((s, t) => s + tripMin(t), 0);
  const nowD = new Date(); const isCur = y === nowD.getFullYear() && m === nowD.getMonth();
  return `<div class="mnav">
      <button class="icon-btn" data-act="monthPrev" aria-label="Previous month">${ic('left')}</button>
      <b>${MONTHS[m]} ${y}</b>
      <button class="icon-btn" data-act="monthNext" ${isCur ? 'disabled' : ''} aria-label="Next month">${ic('right')}</button>
    </div>
    <div class="summary"><span><b>${list.length}</b> ${list.length === 1 ? 'trip' : 'trips'}</span><span><b>${fmtDur(total)}</b> total</span></div>
    <div class="tools">
      <button class="btn ghost" data-act="exportX" ${list.length ? '' : 'disabled'}>${ic('download')} Export Excel</button>
      <button class="btn ghost" data-act="copyTable" ${list.length ? '' : 'disabled'}>${ic('copy')} Copy table</button>
    </div>
    ${list.length ? list.map(t => tripRow(t)).join('') : `<div class="empty">${ic('history', 'ic')}<div>No trips in ${MONTHS[m]}.</div></div>`}
    <button class="btn ghost" data-act="addManual" style="margin-top:6px">${ic('plus')} Add a trip manually</button>`;
}

function syncStatusLine() {
  const g = local.gh;
  if (!g.repo || !g.token) return '';
  const when = g.lastSync ? `Last synced ${fmtDate(g.lastSync)} ${fmtTime(g.lastSync)}` : 'Not synced yet';
  if (ui.syncState === 'error') return `<div class="status err">${esc(ui.syncMsg)}</div>`;
  if (ui.syncState === 'syncing') return `<div class="status">Syncing…</div>`;
  return `<div class="status">${when}</div>`;
}
function viewSettings() {
  const g = local.gh;
  return `
  <div class="sec" style="margin-top:6px">Theme</div>
  <div class="themes">${THEMES.map(t => `<button class="theme ${local.theme === t.id ? 'on' : ''}" data-act="theme" data-v="${t.id}">
      <div class="sw">${t.c.map(c => `<i style="background:${c}"></i>`).join('')}</div><b>${t.name}</b>
      ${local.theme === t.id ? `<span class="tick">${ic('check')}</span>` : ''}</button>`).join('')}</div>

  <div class="sec">Islands</div>
  <div class="card">
    ${data.islands.map(i => `<div class="set-row"><div class="grow">${esc(i)}${i === data.home ? '<span class="badge">HOME</span>' : ''}</div>
      ${i === data.home ? '' : `<button class="mini" data-act="setHome" data-v="${esc(i)}" aria-label="Make home">${ic('star')}</button><button class="mini danger" data-act="delIsland" data-v="${esc(i)}" aria-label="Remove">${ic('trash')}</button>`}</div>`).join('')}
    <form class="add-row" data-form="island"><input class="field" name="i" placeholder="Add island, e.g. Gdh Dhaandhoo" autocomplete="off" maxlength="40"><button class="btn" type="submit">Add</button></form>
    <div class="note">Home is the default origin for every new trip. Tap the star to change it.</div>
  </div>

  <div class="sec">Reasons</div>
  <div class="card">
    ${data.reasons.map(r => `<div class="set-row"><div class="grow">${esc(r)}</div><button class="mini danger" data-act="delReason" data-v="${esc(r)}" aria-label="Remove">${ic('trash')}</button></div>`).join('')}
    <form class="add-row" data-form="reasonSettings"><input class="field" name="r" placeholder="Add a new reason" autocomplete="off" maxlength="60"><button class="btn" type="submit">Add</button></form>
  </div>

  <div class="sec">GitHub data sync</div>
  <div class="card">
    <form class="form-grid" data-form="gh">
      <div><label>Data repository (owner/name)</label><input class="field sm" name="repo" value="${esc(g.repo)}" placeholder="shaiman/tada-data" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div class="row2">
        <div><label>Branch</label><input class="field sm" name="branch" value="${esc(g.branch)}" autocapitalize="off" spellcheck="false"></div>
        <div><label>File</label><input class="field sm" name="path" value="${esc(g.path)}" autocapitalize="off" spellcheck="false"></div>
      </div>
      <div><label>Personal access token</label><input class="field sm" type="password" name="token" value="${esc(g.token)}" placeholder="github_pat_…" autocomplete="off" spellcheck="false"></div>
      <label class="sw-row"><input type="checkbox" name="auto" ${g.auto ? 'checked' : ''}> Sync automatically after every change</label>
      <button class="btn" type="submit">${ic('cloud')} Save &amp; sync now</button>
      ${g.repo || g.token ? `<button class="btn ghost sm" type="button" data-act="ghDisconnect">Disconnect</button>` : ''}
    </form>
    ${syncStatusLine()}
    ${g.repo && g.token ? `<div class="sec" style="font-size:17px;margin:18px 2px 8px">Other devices</div>
      <div class="note" style="margin:0 2px 10px">Sign in anywhere with just your password. Download the connection file once, add it to the root of your TADA site repo (next to <b>index.html</b>) and commit it. It holds your repo and token, encrypted with your password.</div>
      <button class="btn ghost sm" data-act="connFile">${ic('download')} Download connection file</button>
      <div class="status" style="margin-top:10px">${connBlob ? '✓ A connection file is live on this site' : 'No connection file on this site yet'}</div>` : ''}
    <div class="note">Use a <b>private</b> repo, separate from the one hosting this app, and a fine-grained token limited to that repo with <b>Contents: read &amp; write</b>. The token is stored only on this device.</div>
  </div>

  <div class="sec">Data</div>
  <div class="card"><div class="row2">
    <button class="btn ghost sm" data-act="backupExport">${ic('download')} Backup</button>
    <button class="btn ghost sm" data-act="backupImport">${ic('upload')} Restore</button>
  </div><input type="file" id="importFile" accept="application/json,.json" class="hidden">
  <div class="note">${data.trips.length} trips stored on this device. Restore merges a backup into what you already have.</div></div>

  <div class="sec">Security</div>
  <div class="card"><div class="row2">
    <button class="btn ghost sm" data-act="changePw">Change password</button>
    <button class="btn ghost sm" data-act="logout">Sign out</button>
  </div>
  <label class="sw-row" style="margin-top:14px"><input type="checkbox" id="rememberChk" ${local.remember ? 'checked' : ''}> Keep me signed in on this device</label>
  ${installEvt ? `<button class="btn sm" style="margin-top:14px" data-act="install">Install TADA on this phone</button>` : ''}
  <div class="note">The password locks the screen on this device. It does not encrypt your data.</div></div>
  <div class="note" style="text-align:center;margin:18px 0 0">TADA · v1.2</div>`;
}

/* ═════════ connection file: repo + token, encrypted with your password ═════════ */
const CONN_FILE = 'tada-connection.json', CONN_ITER = 600000;
let connBlob = null, forceSetup = false;
const isSafeRef = v => /^[\w.\-\/]{1,120}$/.test(v) && !v.split('/').some(p => p === '..' || p === '.' || p === '');
async function connKey(pw, salt, iter) {
  if (!(window.crypto && crypto.subtle)) throw new Error('secure-context');
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pw).normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:iter, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']);
}
async function encryptConn(pw, obj) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await connKey(pw, salt, CONN_ITER);
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { app:'TADA-connection', v:1, kdf:'PBKDF2-SHA256', iter:CONN_ITER, salt:b64e(salt), iv:b64e(iv), ct:b64e(new Uint8Array(ct)) };
}
async function decryptConn(pw, blob) {                       // null = wrong password / damaged / unsafe contents
  try {
    const iter = Math.min(Math.max(+blob.iter || 0, 100000), 1500000);
    const key = await connKey(pw, b64d(blob.salt), iter);
    const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:b64d(blob.iv) }, key, b64d(blob.ct));
    const c = JSON.parse(new TextDecoder().decode(plain));
    const ok = c && /^[\w.-]+\/[\w.-]+$/.test(c.repo) && isSafeRef(c.branch) && isSafeRef(c.path) && /^[\w-]{20,255}$/.test(c.token);
    return ok ? { repo:c.repo, branch:c.branch, path:c.path, token:c.token } : null;
  } catch (ex) { if (ex && ex.message === 'secure-context') throw ex; return null; }
}
async function loadConn(ms = 3000) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(CONN_FILE, { cache:'no-store', signal:ctl.signal }); clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.app === 'TADA-connection' && j.v === 1 && ['salt', 'iv', 'ct'].every(k => typeof j[k] === 'string') ? j : null;
  } catch { return null; }
}
const applyConn = c => { Object.assign(local.gh, { repo:c.repo, branch:c.branch, path:c.path, token:c.token, auto:true, lastSync:0 }); saveLocal(); };
async function downloadConn(pw) {
  const g = local.gh; if (!g.repo || !g.token) throw new Error('not-linked');
  const blob = await encryptConn(pw, { repo:g.repo, branch:g.branch, path:g.path, token:g.token });
  download(new Blob([JSON.stringify(blob, null, 1)], { type:'application/json' }), CONN_FILE);
}

/* ═════════ login ═════════ */
const loginMode = () => jget(K.auth, null) ? 'login' : (connBlob && !forceSetup ? 'join' : 'setup');
function showLogin() {
  const mode = loginMode(), setup = mode === 'setup', join = mode === 'join';
  const sub = setup ? 'Create a password to lock your trips' : join ? 'Enter your password to connect this device' : 'Welcome back';
  $('#root').innerHTML = `<div class="login">
    <div class="brand"><img src="icons/icon.svg" alt=""><h1>TADA</h1><p>${sub}</p></div>
    <form id="loginForm" autocomplete="off">
      <div class="pw-wrap"><input class="pw" id="pw" type="password" placeholder="${setup ? 'Choose a password' : 'Password'}" autocomplete="${setup ? 'new-password' : 'current-password'}" autocapitalize="off" spellcheck="false" enterkeyhint="go">
        <button type="button" class="pw-eye" data-act="eye" aria-label="Show password">${ic('eye')}</button></div>
      ${setup ? `<input class="pw second" id="pw2" type="password" placeholder="Repeat password" autocomplete="new-password">` : ''}
      <div class="login-err" id="loginErr"></div>
      <button class="btn-login" type="submit" style="margin-top:6px">${setup ? 'Set password &amp; enter' : join ? 'Connect &amp; log in' : 'Log in'}</button>
      <label class="keep"><input type="checkbox" id="keep" ${local.remember ? 'checked' : ''}> Keep me signed in</label>
    </form>
    <div class="foot">${join ? '<button class="link" data-act="freshSetup">Start fresh without sync</button>' : setup ? (connBlob ? '<button class="link" data-act="backToJoin">I already have a TADA password</button>' : '') : '<button class="link" data-act="forgot">Forgot password?</button>'}</div>
  </div>`;
  if (matchMedia('(hover:hover)').matches) $('#pw').focus();
}
const lockLeft = () => Math.max(0, (jget(K.fails, { n:0, until:0 }).until || 0) - Date.now());
function recordFail() {
  const f = jget(K.fails, { n:0, until:0 }); f.n = (f.n || 0) + 1;
  if (f.n >= 5) f.until = Date.now() + Math.min(15 * 60e3, 30e3 * 2 ** (f.n - 5));   // 30s, 1m, 2m … capped at 15m
  jset(K.fails, f); return f;
}
const waitText = ms => ms >= 60e3 ? `${Math.ceil(ms / 60e3)} min` : `${Math.ceil(ms / 1000)} s`;
async function onLogin(e) {
  e.preventDefault();
  const pw = $('#pw').value, mode = loginMode(), err = $('#loginErr'), btn = $('.btn-login'); let joined = false;
  btn.disabled = true;
  const fail = msg => {
    btn.disabled = false; err.textContent = msg; const i = $('#pw'); i.type = 'password'; const eye = $('.pw-eye'); if (eye) eye.innerHTML = ic('eye');
    i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake');
  };
  if (mode !== 'setup' && lockLeft() > 0) return fail(`Too many attempts. Try again in ${waitText(lockLeft())}.`);
  try {
    const bad = () => { const f = recordFail(); return fail(f.until > Date.now() ? `Too many attempts. Try again in ${waitText(lockLeft())}.` : 'Wrong password'); };
    if (mode === 'setup') {
      if (pw.length < 4) return fail('Use at least 4 characters');
      if (pw !== $('#pw2').value) return fail("Passwords don't match");
      jset(K.auth, await makeAuth(pw));
    } else if (mode === 'join') {                                    // new device: the password opens the connection file
      const c = await decryptConn(pw, connBlob); if (!c) return bad();
      jset(K.auth, await makeAuth(pw)); applyConn(c); joined = true;
    } else {
      if (!(await checkPw(pw))) return bad();
      if (!local.gh.token && connBlob) { const c = await decryptConn(pw, connBlob); if (c) { applyConn(c); joined = true; } }   // known device, not linked yet
    }
  } catch (ex) { return fail(ex.message === 'secure-context' ? 'Open TADA over https to log in' : 'Something went wrong'); }
  try { localStorage.removeItem(K.fails); } catch {}
  local.remember = $('#keep').checked; saveLocal();
  unlock();
  if (joined) toast('Connected to GitHub — syncing your trips…', 3500);
}
function unlock() {
  ui.unlocked = true;
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
  renderShell(); startTick(); syncNow(false);
}
function logout() {
  ui.unlocked = false; local.remember = false; saveLocal();
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  clearInterval(tickTimer); closeSheet(); ui.flow = null; ui.tab = 'track'; showLogin();
}

/* ═════════ live counter ═════════ */
function startTick() {
  clearInterval(tickTimer);
  tickTimer = setInterval(() => { const a = local.active, el = $('#tick'); if (a && el) el.textContent = fmtHMS(Date.now() - a.start); }, 1000);
}

/* ═════════ theme ═════════ */
function applyTheme() {
  document.documentElement.dataset.theme = local.theme;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  $('meta[name=theme-color]').setAttribute('content', bg);
}

/* ═════════ export / copy ═════════ */
const HEAD = ['Date', 'Origin', 'Destinations', 'Start', 'End', 'Duration', 'Reason'];
const rowOf = t => [fmtDate(t.start), t.origin, t.destinations.join(', '), fmtTime(t.start), fmtTime(t.end), fmtDur(tripMin(t)), t.reasons.join(', ')];
const viewedRows = () => monthTrips(ui.month.y, ui.month.m).slice().reverse().map(rowOf);   // chronological for spreadsheets

async function copyTable() {
  const rows = viewedRows(); if (!rows.length) return;
  const clean = s => { s = String(s).replace(/[\t\r\n]+/g, ' '); return /^[=+\-@]/.test(s) ? "'" + s : s; };   // stop pasted cells turning into formulas
  rows.forEach(r => r.forEach((c, i) => { r[i] = clean(c); }));
  const tsv = [HEAD, ...rows].map(r => r.join('\t')).join('\n');
  const html = '<table><thead><tr>' + HEAD.map(h => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
  try {
    if (window.ClipboardItem && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([tsv], { type:'text/plain' }), 'text/html': new Blob([html], { type:'text/html' }) })]);
    } else await navigator.clipboard.writeText(tsv);
    toast(`Copied ${rows.length} ${rows.length === 1 ? 'trip' : 'trips'} — paste anywhere`);
  } catch {
    try { await navigator.clipboard.writeText(tsv); toast('Copied — paste anywhere'); }
    catch { const ta = document.createElement('textarea'); ta.value = tsv; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); toast(ok ? 'Copied — paste anywhere' : 'Copy blocked by the browser'); }
  }
}

// minimal .xlsx writer (stored zip, no dependencies)
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
  files.forEach(f => {
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, 0, true); lh.setUint16(12, DATE, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, DATE, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
const xe = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
function buildXlsx(rows, sheetName) {
  const col = i => String.fromCharCode(65 + i);
  const widths = [14, 20, 34, 9, 9, 11, 34];
  const cell = (r, c, v, s) => `<c r="${col(c)}${r}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
  const sheetRows = [HEAD, ...rows].map((r, ri) => `<row r="${ri + 1}"${ri === 0 ? ' ht="24" customHeight="1"' : ''}>${r.map((v, ci) => cell(ri + 1, ci, v, ri === 0 ? 1 : 2)).join('')}</row>`).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF3E5E22"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return zipStore([
    { name:'[Content_Types].xml', text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name:'_rels/.rels', text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name:'xl/workbook.xml', text:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xe(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name:'xl/_rels/workbook.xml.rels', text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name:'xl/styles.xml', text:styles },
    { name:'xl/worksheets/sheet1.xml', text:sheet }
  ]);
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportXlsx() {
  const rows = viewedRows(); if (!rows.length) return;
  const { y, m } = ui.month;
  download(buildXlsx(rows, `Trips ${MON[m]} ${y}`), `TADA_trips_${y}-${pad(m + 1)}.xlsx`);
  toast('Excel file saved');
}

/* ═════════ GitHub sync ═════════ */
const payloadOf = d => ({
  app:'TADA', version:1,
  trips: d.trips.map(t => ({ id:t.id, origin:t.origin, destinations:t.destinations, reasons:t.reasons, start:t.start, end:t.end, updatedAt:t.updatedAt || 0 })).sort((a, b) => a.id < b.id ? -1 : 1),
  islands:d.islands, reasons:d.reasons, home:d.home, settingsUpdatedAt:d.settingsUpdatedAt || 0,
  deleted:Object.fromEntries(Object.entries(d.deleted || {}).sort())
});
const cStr = (v, max = 80) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, max) : '';   // strips control + bidi-override chars
const cNum = v => Number.isFinite(v) && v > 0 && v < 4102444800000 ? v : 0;
const cList = (v, n) => Array.isArray(v) ? v.map(x => cStr(x, 60)).filter(Boolean).slice(0, n) : [];
function cleanTrip(t) {
  if (!t || typeof t !== 'object') return null;
  const id = cStr(t.id, 40).replace(/[^\w-]/g, ''), start = cNum(t.start), end = cNum(t.end);
  if (!id || !start || !end || end <= start) return null;
  const destinations = cList(t.destinations, 30); if (!destinations.length) return null;
  return { id, origin:cStr(t.origin, 60), destinations, reasons:cList(t.reasons, 20), start, end, updatedAt:Math.min(cNum(t.updatedAt), Date.now() + 864e5) };
}
function cleanRemote(b) {                                     // anything arriving from GitHub / a backup file is untrusted
  if (!b || typeof b !== 'object') return null;
  const deleted = {}; Object.entries(b.deleted && typeof b.deleted === 'object' ? b.deleted : {}).slice(0, 5000).forEach(([k, v]) => { const id = cStr(k, 40).replace(/[^\w-]/g, ''); if (id && cNum(v)) deleted[id] = Math.min(v, Date.now() + 864e5); });
  const islands = cList(b.islands, 200), reasons = cList(b.reasons, 200);
  return { trips:(Array.isArray(b.trips) ? b.trips : []).slice(0, 20000).map(cleanTrip).filter(Boolean), islands:islands.length ? islands : null, reasons:reasons.length ? reasons : null,
           home:cStr(b.home, 60), settingsUpdatedAt:Math.min(cNum(b.settingsUpdatedAt), Date.now() + 864e5), deleted };
}
function mergeData(a, rawB) {
  const b = cleanRemote(rawB); if (!b) return a;
  const map = new Map();
  [...a.trips, ...(b.trips || [])].forEach(t => { const p = map.get(t.id); if (!p || (t.updatedAt || 0) > (p.updatedAt || 0)) map.set(t.id, t); });
  const deleted = { ...(a.deleted || {}) };
  Object.entries(b.deleted || {}).forEach(([id, ts]) => { if (ts > (deleted[id] || 0)) deleted[id] = ts; });
  Object.entries(deleted).forEach(([id, ts]) => { const t = map.get(id); if (t && ts >= (t.updatedAt || 0)) map.delete(id); });
  const remoteNewer = b.settingsUpdatedAt > (a.settingsUpdatedAt || 0) && b.islands && b.reasons && b.islands.includes(b.home);
  const s = remoteNewer ? b : a;
  return { trips:[...map.values()], islands:s.islands, reasons:s.reasons, home:s.home, settingsUpdatedAt:Math.max(a.settingsUpdatedAt || 0, b.settingsUpdatedAt || 0), deleted };
}
const utf8b64 = str => { const u = new TextEncoder().encode(str); let s = ''; u.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
const b64utf8 = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), c => c.charCodeAt(0)));

let syncing = false, syncAgain = false, syncDebounce;
function setSync(state, msg = '') {
  ui.syncState = state; ui.syncMsg = msg;
  const b = $('.sync-ic'); if (b) b.className = `icon-btn sync-ic ${state}`;
  if (ui.tab === 'settings' && !ui.flow && !sheetRender) { const st = $('.status'); if (st) st.outerHTML = syncStatusLine() || '<span></span>'; }
}
function scheduleSync() {
  const g = local.gh; if (!g.repo || !g.token || !g.auto) return;
  clearTimeout(syncDebounce); syncDebounce = setTimeout(() => syncNow(false), 1500);
}
async function syncNow(manual) {
  const g = local.gh;
  if (!g.repo || !g.token) { if (manual) toast('Set up GitHub sync in Settings'); return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true; setSync('syncing');
  const base = `https://api.github.com/repos/${g.repo}/contents/${g.path.split('/').map(encodeURIComponent).join('/')}`;
  const H = { Authorization:`Bearer ${g.token}`, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' };
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`${base}?ref=${encodeURIComponent(g.branch)}`, { headers:H, cache:'no-store' });
      let remote = null, sha = null;
      if (r.status === 200) {
        const j = await r.json(); sha = j.sha;
        if (!j.content) throw new Error('Data file is too large to sync through the API');
        remote = JSON.parse(b64utf8(j.content));          // untrusted until mergeData() cleans it
      } else if (r.status !== 404) throw await apiError(r, 'read');
      data = mergeData(data, remote); saveData();
      const mine = payloadOf(data);
      const rc = cleanRemote(remote);
      if (rc && JSON.stringify(mine) === JSON.stringify(payloadOf({ trips:rc.trips, islands:rc.islands || [], reasons:rc.reasons || [], home:rc.home, settingsUpdatedAt:rc.settingsUpdatedAt, deleted:rc.deleted }))) break;   // already identical
      const body = { message:`TADA sync ${new Date().toISOString()}`, content:utf8b64(JSON.stringify({ ...mine, savedAt:new Date().toISOString() }, null, 1)), branch:g.branch };
      if (sha) body.sha = sha;
      const put = await fetch(base, { method:'PUT', headers:{ ...H, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
      if (put.ok) break;
      if ((put.status === 409 || put.status === 422) && attempt < 2) continue;      // someone wrote in between — merge again
      throw await apiError(put, 'write');
    }
    g.lastSync = Date.now(); saveLocal(); setSync('ok');
    if (manual) toast('Synced with GitHub');
    if (!ui.flow && !sheetRender) renderMain();
  } catch (ex) {
    setSync('error', navigator.onLine === false ? 'Offline — will sync when you’re back online' : ex.message);
    if (manual) toast('Sync failed');
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; scheduleSync(); }
  }
}
async function apiError(res, what) {
  let msg = ''; try { msg = (await res.json()).message || ''; } catch {}
  if (res.status === 401) return new Error('GitHub rejected the token. Check it and its expiry.');
  if (res.status === 403) return new Error(`GitHub denied access (${msg || '403'}). The token needs Contents: read & write.`);
  if (res.status === 404) return new Error('Repository not found, or the token has no access to it. Check owner/name and the token’s repo access.');
  return new Error(`GitHub ${what} failed (${res.status}) ${msg}`.trim());
}

/* ═════════ actions ═════════ */
const A = {
  tab(el) { ui.tab = el.dataset.v; ui.flow = null; renderShell(); },
  goTrack() { ui.tab = 'track'; renderShell(); },
  flowBack() {
    if (ui.flow === 'draft') { ui.flow = null; draft = null; }
    else if (ui.flow === 'start-time') ui.flow = 'draft';
    else if (ui.flow === 'end-time') ui.flow = null;
    renderShell();
  },
  startFlow() { draft = { origin:data.home, dests:[], reasons:[], adding:false }; ui.flow = 'draft'; renderShell(); },
  tdest(el) { const s = ctxState(el.dataset.ctx), v = el.dataset.v; s.dests = s.dests.includes(v) ? s.dests.filter(x => x !== v) : [...s.dests, v]; el.classList.toggle('on'); afterChipChange(el.dataset.ctx); },
  treason(el) { const s = ctxState(el.dataset.ctx), v = el.dataset.v; s.reasons = s.reasons.includes(v) ? s.reasons.filter(x => x !== v) : [...s.reasons, v]; el.classList.toggle('on'); afterChipChange(el.dataset.ctx); },
  reasonAdd(el) { ctxState(el.dataset.ctx).adding = true; rerenderCtx(el.dataset.ctx); const i = $('[data-form=reasonNew] input'); if (i) i.focus(); },
  proceed() { if (!draft.dests.length || !draft.reasons.length) return; ui.flow = 'start-time'; renderShell(); },
  pickNow() { const n = new Date(); drumH.set(n.getHours(), true); drumM.set(n.getMinutes(), true); },
  confirmStart() {
    const start = resolvePick(pickH, pickM);
    local.active = { origin:draft.origin, dests:draft.dests, reasons:draft.reasons, start };
    saveLocal(); draft = null; ui.flow = null; ui.tab = 'track'; renderShell(); toast('Trip started');
  },
  endFlow() { ui.flow = 'end-time'; renderShell(); },
  confirmEnd() {
    const a = local.active, end = resolvePick(pickH, pickM);
    if (end <= a.start) return toast('End time must be after the start time');
    data.trips.push({ id:uid(), origin:a.origin, destinations:a.dests, reasons:a.reasons, start:a.start, end, updatedAt:Date.now() });
    saveData(); local.active = null; saveLocal();
    const d = new Date(a.start); ui.month = { y:d.getFullYear(), m:d.getMonth() };
    ui.flow = null; ui.tab = 'history'; renderShell(); toast(`Trip saved · ${fmtDur((end - a.start) / 60000)}`); scheduleSync();
  },
  discard() { confirmSheet('Discard this trip?', 'The running trip will be thrown away and nothing is saved to history.', 'Discard trip', () => { local.active = null; saveLocal(); renderShell(); toast('Trip discarded'); }); },

  monthPrev() { const { y, m } = ui.month; ui.month = m === 0 ? { y:y - 1, m:11 } : { y, m:m - 1 }; renderMain(); },
  monthNext() { const { y, m } = ui.month; ui.month = m === 11 ? { y:y + 1, m:0 } : { y, m:m + 1 }; renderMain(); },
  exportX: exportXlsx, copyTable,
  addManual() { const now = Date.now(); edit = { isNew:true, id:uid(), origin:data.home, dests:[], reasons:[], adding:false, startStr:toLocalInput(now - 36e5), endStr:toLocalInput(now) }; openSheet(editSheet); },
  editTrip(el) {
    const t = data.trips.find(x => x.id === el.dataset.id); if (!t) return;
    edit = { id:t.id, origin:t.origin, dests:[...t.destinations], reasons:[...t.reasons], adding:false, startStr:toLocalInput(t.start), endStr:toLocalInput(t.end) };
    openSheet(editSheet);
  },
  delTrip(el) {
    const id = el.dataset.id, t = data.trips.find(x => x.id === id); if (!t) return;
    confirmSheet('Delete this trip?', `${fmtDate(t.start)} · ${t.destinations.join(', ')}`, 'Delete', () => deleteTrip(id));
  },
  saveEdit() {
    const s = edit; syncEditInputs();
    const start = new Date(s.startStr).getTime(), end = new Date(s.endStr).getTime();
    if (!s.dests.length) return toast('Pick at least one destination');
    if (!s.reasons.length) return toast('Pick at least one reason');
    if (!(start > 0) || !(end > 0)) return toast('Set both start and end');
    if (end <= start) return toast('End must be after the start');
    const rec = { id:s.id, origin:s.origin, destinations:s.dests, reasons:s.reasons, start, end, updatedAt:Date.now() };
    const i = data.trips.findIndex(t => t.id === s.id);
    if (i >= 0) data.trips[i] = rec; else data.trips.push(rec);
    delete data.deleted[s.id];
    saveData(); closeSheet();
    const d = new Date(start); ui.month = { y:d.getFullYear(), m:d.getMonth() };
    renderMain(); toast('Saved'); scheduleSync();
  },
  deleteFromEdit() { const id = edit.id; confirmSheet('Delete this trip?', 'This can’t be undone.', 'Delete', () => deleteTrip(id)); },
  closeSheet,
  sheetBackdrop(el, e) { if (e.target === el) closeSheet(); },
  confirmOk() { window.__confirmOk && window.__confirmOk(); },

  theme(el) { local.theme = el.dataset.v; saveLocal(); applyTheme(); renderMain(); },
  setHome(el) { data.home = el.dataset.v; touchSettings(); saveData(); renderMain(); scheduleSync(); toast(`${data.home} is now home`); },
  delIsland(el) { data.islands = data.islands.filter(i => i !== el.dataset.v); touchSettings(); saveData(); renderMain(); scheduleSync(); },
  delReason(el) { data.reasons = data.reasons.filter(r => r !== el.dataset.v); touchSettings(); saveData(); renderMain(); scheduleSync(); },

  syncNow() { syncNow(true); },
  ghDisconnect() { confirmSheet('Disconnect GitHub?', 'Sync stops on this device. Your trips stay here and in the repo.', 'Disconnect', () => { local.gh = Object.assign(local.gh, { repo:'', token:'', lastSync:0 }); saveLocal(); setSync('idle'); renderShell(); }); },
  backupExport() { download(new Blob([JSON.stringify({ ...payloadOf(data), savedAt:new Date().toISOString() }, null, 1)], { type:'application/json' }), `TADA_backup_${new Date().toISOString().slice(0, 10)}.json`); },
  backupImport() { $('#importFile').click(); },
  changePw() { openSheet(() => `<h3>Change password</h3><form data-form="pw" autocomplete="off"><label class="lbl">Current password</label><input class="field" type="password" name="cur" autocomplete="current-password">
    <label class="lbl">New password</label><input class="field" type="password" name="n1" autocomplete="new-password"><input class="field" type="password" name="n2" placeholder="Repeat new password" style="margin-top:10px" autocomplete="new-password">
    <div class="login-err" id="pwErr" style="text-align:left"></div><div class="actions"><button class="btn" type="submit">Update password</button><button type="button" class="btn ghost" data-act="closeSheet">Cancel</button></div></form>`); },
  logout,
  freshSetup() { forceSetup = true; showLogin(); },
  backToJoin() { forceSetup = false; showLogin(); },
  connFile() { openSheet(() => `<h3>Connection file</h3><p class="muted" style="margin:6px 0 0">Enter your TADA password. The file is encrypted with it, so any device can connect with the same password.</p>
    <form data-form="conn" autocomplete="off"><label class="lbl">Password</label><input class="field" type="password" name="pw" autocomplete="current-password">
    <div class="login-err" id="connErr" style="text-align:left"></div><div class="actions"><button class="btn" type="submit">Download tada-connection.json</button><button type="button" class="btn ghost" data-act="closeSheet">Cancel</button></div></form>`); },
  forgot() { confirmSheet('Reset TADA on this device?', 'This erases the password, trips and settings stored on this phone. If GitHub sync was on, your trips are still in the repo — reconnect it afterwards to bring them back.', 'Erase and start over', () => { Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch {} }); try { sessionStorage.clear(); } catch {} location.reload(); }); },
  eye(el) { const i = $('#pw'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; const i2 = $('#pw2'); if (i2) i2.type = i.type; el.innerHTML = ic(show ? 'eyeoff' : 'eye'); },
  async install() { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderMain(); }
};
function deleteTrip(id) {
  data.trips = data.trips.filter(t => t.id !== id); data.deleted[id] = Date.now();
  saveData(); closeSheet(); renderMain(); toast('Trip deleted'); scheduleSync();
}
function afterChipChange(ctx) {
  if (ctx === 'draft') { const b = $('#proceedBtn'); if (b) b.disabled = !(draft.dests.length && draft.reasons.length); }
}
function rerenderCtx(ctx) { if (ctx === 'edit') { syncEditInputs(); drawSheet(false); } else renderMain(); }

function editSheet() {
  const s = edit;
  return `<h3>${s.isNew ? 'Add trip' : 'Edit trip'}</h3>
  ${formFields('edit')}
  <label class="lbl">Start</label><input class="field" type="datetime-local" data-bind="startStr" value="${esc(s.startStr)}">
  <label class="lbl">End</label><input class="field" type="datetime-local" data-bind="endStr" value="${esc(s.endStr)}">
  <div class="dur"><span>Duration</span><span id="durOut">${durText()}</span></div>
  <div class="actions"><button class="btn" data-act="saveEdit">Save</button>${s.isNew ? '' : `<button class="btn ghost" style="color:var(--danger)" data-act="deleteFromEdit">Delete trip</button>`}<button class="btn ghost" data-act="closeSheet">Cancel</button></div>`;
}
function durText() { const a = new Date(edit.startStr).getTime(), b = new Date(edit.endStr).getTime(); return a > 0 && b > a ? fmtDur((b - a) / 60000) : '—'; }
function syncEditInputs() { const s = $('[data-bind=startStr]'), e = $('[data-bind=endStr]'); if (s && edit) edit.startStr = s.value; if (e && edit) edit.endStr = e.value; }

/* ═════════ events ═════════ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (fn) fn(el, e);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-change=origin]')) { const s = ctxState(t.dataset.ctx); s.origin = t.value; s.dests = s.dests.filter(d => d !== t.value); rerenderCtx(t.dataset.ctx); }
  if (t.id === 'rememberChk') { local.remember = t.checked; saveLocal(); }
  if (t.id === 'importFile' && t.files[0]) importBackup(t.files[0]);
});
document.addEventListener('input', e => {
  if (e.target.matches('[data-bind]') && edit) { edit[e.target.dataset.bind] = e.target.value; const o = $('#durOut'); if (o) o.textContent = durText(); }
});
document.addEventListener('submit', async e => {
  const f = e.target; if (f.id === 'loginForm') return onLogin(e);
  const kind = f.dataset.form; if (!kind) return; e.preventDefault();
  const fd = new FormData(f);
  if (kind === 'reasonNew') { addReasonTo(f.dataset.ctx, fd.get('r')); rerenderCtx(f.dataset.ctx); }
  else if (kind === 'reasonSettings') {
    const name = fmtReason(fd.get('r')); if (!name) return;
    if (data.reasons.some(r => r.toLowerCase() === name.toLowerCase())) return toast('That reason already exists');
    data.reasons.push(name); touchSettings(); saveData(); renderMain(); scheduleSync(); toast(`Added “${name}”`);
  } else if (kind === 'island') {
    const name = fmtIsland(fd.get('i')); if (!name) return;
    if (data.islands.some(i => i.toLowerCase() === name.toLowerCase())) return toast('That island is already in the list');
    data.islands.push(name); touchSettings(); saveData(); renderMain(); scheduleSync(); toast(`Added ${name}`);
  } else if (kind === 'gh') {
    const repo = String(fd.get('repo')).trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '').replace(/\/$/, '');
    if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) return toast('Repository should look like owner/name');
    const branch = String(fd.get('branch')).trim() || 'main', path = String(fd.get('path')).trim().replace(/^\//, '') || 'tada-data.json';
    const safe = isSafeRef;
    if (!safe(branch)) return toast('That branch name isn’t valid');
    if (!safe(path)) return toast('File path can only use letters, numbers, . - _ and /');
    Object.assign(local.gh, { repo, branch, path, token:String(fd.get('token')).trim(), auto:!!fd.get('auto') });
    saveLocal(); renderShell(); syncNow(true);
  } else if (kind === 'conn') {
    const err = $('#connErr'), btn = $('button[type=submit]', f); btn.disabled = true; btn.textContent = 'Encrypting…';
    if (!(await checkPw(fd.get('pw')))) { err.textContent = 'Wrong password'; btn.disabled = false; btn.textContent = 'Download tada-connection.json'; return; }
    try { await downloadConn(fd.get('pw')); closeSheet(); toast('Saved — upload it next to index.html in your site repo', 4500); }
    catch { err.textContent = 'Could not create the file'; btn.disabled = false; btn.textContent = 'Download tada-connection.json'; }
  } else if (kind === 'pw') {
    const err = $('#pwErr'), cur = fd.get('cur'), n1 = fd.get('n1'), n2 = fd.get('n2');
    if (!(await checkPw(cur))) { err.textContent = 'Current password is wrong'; return; }
    if (String(n1).length < 4) { err.textContent = 'Use at least 4 characters'; return; }
    if (n1 !== n2) { err.textContent = "New passwords don't match"; return; }
    jset(K.auth, await makeAuth(n1)); closeSheet();
    if (local.gh.repo && local.gh.token) { try { await downloadConn(n1); toast('Password updated — upload the new connection file to your site repo so other devices match', 6000); } catch { toast('Password updated'); } }
    else toast('Password updated');
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetRender) closeSheet(); });
async function importBackup(file) {
  try {
    const j = JSON.parse(await file.text()); if (!j || !Array.isArray(j.trips)) throw new Error('bad');
    const before = data.trips.length;
    data = mergeData(data, Object.assign({ deleted:{} }, j)); saveData(); renderMain(); scheduleSync();
    toast(`Restored — ${data.trips.length - before} new ${data.trips.length - before === 1 ? 'trip' : 'trips'}`);
  } catch { toast('That file isn’t a TADA backup'); }
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (ui.unlocked && ui.tab === 'settings' && !ui.flow) renderMain(); });
window.addEventListener('online', () => syncNow(false));
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
  if (ui.unlocked && !local.remember && hiddenAt && Date.now() - hiddenAt > AUTOLOCK_MS) { hiddenAt = 0; logout(); return; }
  hiddenAt = 0;
  if (document.visibilityState === 'visible' && ui.unlocked) { const el = $('#tick'); if (el && local.active) el.textContent = fmtHMS(Date.now() - local.active.start); syncNow(false); } });

/* ═════════ boot ═════════ */
applyTheme();
let unlockedAlready = false;
try { unlockedAlready = sessionStorage.getItem(SESSION_KEY) === '1'; } catch {}
(async () => {
  const hasAuth = !!jget(K.auth, null);
  if (hasAuth && (unlockedAlready || local.remember)) { unlock(); loadConn().then(b => { connBlob = b; }); return; }
  connBlob = await loadConn();                                  // is there a connection file on this site?
  showLogin();
})();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch {}   // ask the browser not to evict TADA's data
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
