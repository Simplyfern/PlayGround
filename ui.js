/* ASH TRAIL — interface, rendering, interactions */

import { WastelandScene } from './scene.js';
import { Game } from './engine.js';
import { ROUTE, CHORES, PACES, RATIONS, WEATHERS, BASE_USE, CREW_TEMPLATES } from './data.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const money = (n) => Math.round(n);

const game = new Game();
const ui = {
  scene: null,
  titleScene: null,
  busy: false,
  muted: false,
  logKey: '',
  shopQty: {},
  started: false,
  modalMode: null,
  currentEvent: null,
  currentArrival: null,
};

/* ============================== audio ============================== */

let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try { audioCtx = new Ctor(); } catch { return null; }
  return audioCtx;
}

function sound(name) {
  if (ui.muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.045;
  master.connect(ctx.destination);
  const notes = {
    click: [[300, 0.035, 'square', 0.4]],
    good: [[440, 0.08, 'sine', 0.5], [660, 0.12, 'sine', 0.4]],
    bad: [[150, 0.16, 'sawtooth', 0.35], [96, 0.24, 'sawtooth', 0.3]],
    drive: [[110, 0.35, 'sawtooth', 0.22], [70, 0.5, 'sawtooth', 0.16]],
    death: [[90, 0.5, 'sine', 0.4], [60, 0.9, 'sine', 0.3]],
    win: [[392, 0.18, 'triangle', 0.4], [523, 0.18, 'triangle', 0.4], [659, 0.42, 'triangle', 0.35]],
  }[name];
  if (!notes) return;
  notes.forEach(([freq, dur, type, vol], i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now + i * 0.01);
    if (name === 'drive') o.frequency.exponentialRampToValueAtTime(freq * 0.6, now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + dur + 0.02);
  });
}

function loadMuted() {
  try { return localStorage.getItem('ashtrail-muted') === '1'; } catch { return false; }
}

function setMuted(m) {
  ui.muted = m;
  try { localStorage.setItem('ashtrail-muted', m ? '1' : '0'); } catch { /* ignore */ }
  const btn = $('#btn-sound');
  if (btn) {
    btn.innerHTML = m ? icon('i-mute') : icon('i-volume');
    btn.setAttribute('aria-label', m ? 'Enable sound' : 'Mute sound');
  }
}

/* ============================== helpers ============================== */

function toast(msg, kind = '') {
  const layer = $('#toast-layer');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  layer.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 320);
  }, 2400);
}

function formatDay(d) { return String(d).padStart(2, '0'); }

function memberStatus(p) {
  if (!p.alive) return { label: 'dead', cls: 'dead' };
  if (p.status === 'sick') return { label: 'sick', cls: 'sick' };
  if (p.status === 'injured') return { label: 'injured', cls: 'injured' };
  if (p.status === 'rad') return { label: 'rad', cls: 'rad' };
  return { label: 'stable', cls: '' };
}

function healthTone(v) {
  if (v > 65) return '#78d7cb';
  if (v > 35) return '#ffb454';
  return '#ff5a4e';
}

function nextStopName() {
  const stop = game.nextStop();
  return stop ? stop.name : 'EDEN-9';
}

function paceEstimate() {
  if (!game.S) return { dist: 0, fuel: 0 };
  const p = PACES[game.S.pace];
  const w = WEATHERS[game.S.weather];
  const dist = Math.round(p.dist * w.dist * (0.58 + game.S.hull * 0.0042));
  const fuel = p.fuel * (1 + (100 - game.S.hull) * 0.0032);
  const scale = 0.42 + 0.58 * (game.aliveCount() / 4);
  const water = BASE_USE.water * p.water * w.water * scale;
  return { dist, fuel, water };
}

/* ============================== start screen ============================== */

function renderStartRoster() {
  const el = $('#start-roster');
  el.innerHTML = CREW_TEMPLATES.map((c) => `
    <div class="roster-card">
      <div class="av" data-tone="${c.tone}">${c.initials}</div>
      <b>${c.name}</b>
      <em>${c.role}</em>
    </div>`).join('');
}

function refreshResume() {
  const btn = $('#btn-resume');
  const saved = game.peekSave();
  if (!saved) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  btn.textContent = `Resume — day ${String(saved.day).padStart(2, '0')}, mile ${Math.round(saved.mile)}`;
}

function showStart() {
  $('#screen-game').classList.add('hidden');
  $('#screen-start').classList.remove('hidden');
  closeModal(true);
  refreshResume();
  if (!ui.titleScene) {
    const c = $('#title-scene');
    if (c) {
      ui.titleScene = new WastelandScene(c, { title: true });
      ui.titleScene.state.weather = 'dusk';
      ui.titleScene.setState({ mile: 120, weather: 'haze', hull: 62, progress: 0.12 });
      ui.titleScene.start();
    }
  } else {
    ui.titleScene.start();
  }
  if (ui.scene) ui.scene.stop();
  document.title = 'ASH TRAIL — Eden-9';
}

function beginGame(resume = false) {
  const state = resume ? game.load() : game.newGame();
  if (!state) return;
  $('#screen-start').classList.add('hidden');
  $('#screen-game').classList.remove('hidden');
  if (ui.titleScene) ui.titleScene.stop();
  ui.started = true;
  ui.shopQty = {};
  if (!ui.scene) {
    ui.scene = new WastelandScene($('#scene'));
    ui.scene.setState({ mile: game.S.mile, weather: game.S.weather, hull: game.S.hull, speed: 0.55 });
    ui.scene.start();
  }
  ui.scene.setState({ mile: game.S.mile, weather: game.S.weather, hull: game.S.hull });
  ui.scene.setSpeed(paceSpeed());
  render();
  if (!resume) {
    toast('The gate closes. Nine hundred sixty miles to go.', '');
    sound('drive');
  }
  document.title = 'ASH TRAIL — day ' + game.S.day;
}

/* ============================== game render ============================== */

function paceSpeed() {
  const p = game.S?.pace || 'steady';
  return p === 'crawl' ? 0.32 : p === 'sprint' ? 0.95 : 0.58;
}

function render() {
  const S = game.S;
  if (!S) return;
  renderHud(S);
  renderSupplies(S);
  renderBars(S);
  renderCrew(S);
  renderLog(S);
  renderControls(S);
  if (ui.scene) {
    ui.scene.setState({
      mile: S.mile, weather: S.weather, hull: S.hull, progress: S.mile / 960,
      pace: S.pace,
    });
    ui.scene.setSpeed(paceSpeed());
  }
}

function renderHud(S) {
  $('#hud-day').textContent = formatDay(S.day);
  $('#hud-mile').textContent = String(Math.round(S.mile)).padStart(3, '0');
  $('#hud-crew').textContent = game.aliveCount();
  const stop = game.nextStop();
  $('#hud-sector').textContent = stop ? `${stop.name} · ${Math.max(0, Math.round(stop.mile - S.mile))} MI` : 'EDEN-9';
  const w = WEATHERS[S.weather] || WEATHERS.clear;
  $('#hud-weather').innerHTML = `${icon(w.icon)}<span>${w.label}</span>`;
  const pct = clamp((S.mile / 960) * 100, 0, 100);
  $('#progress-fill').style.width = pct + '%';
  $('#progress-marker').style.left = pct + '%';
  const ticks = $('#progress-ticks');
  if (!ticks.dataset.ready) {
    ticks.innerHTML = ROUTE.filter((s) => s.mile > 0 && s.mile < 960)
      .map((s) => `<i style="left:${(s.mile / 960) * 100}%"></i>`).join('');
    ticks.dataset.ready = '1';
  }
}

function renderSupplies(S) {
  const items = [
    { id: 'water', k: 'Water', v: Math.floor(S.water), icon: 'i-water', low: 14, crit: 6, unit: 'u' },
    { id: 'food', k: 'Rations', v: Math.floor(S.food), icon: 'i-food', low: 12, crit: 5, unit: 'u' },
    { id: 'fuel', k: 'Fuel', v: Math.floor(S.fuel), icon: 'i-fuel', low: 10, crit: 4, unit: 'u' },
    { id: 'meds', k: 'Meds', v: S.meds, icon: 'i-meds', low: 1, crit: 0, unit: '' },
    { id: 'scrap', k: 'Scrap', v: S.scrap, icon: 'i-scrap', low: 20, crit: 6, unit: '' },
    { id: 'hull', k: 'Hull', v: Math.round(S.hull), icon: 'i-hull', low: 40, crit: 18, unit: '%' },
  ];
  $('#supply-grid').innerHTML = items.map((it) => {
    let cls = '';
    if (it.v <= it.crit) cls = 'crit';
    else if (it.v <= it.low) cls = 'low';
    return `<div class="supply ${cls}" title="${it.k}">
      <div class="supply-top">${icon(it.icon)}<span class="supply-k">${it.k}</span></div>
      <div class="supply-v">${it.v}${it.unit ? `<small>${it.unit}</small>` : ''}</div>
    </div>`;
  }).join('');
  const dist = game.nextStop() ? Math.max(0, Math.round(game.nextStop().mile - S.mile)) : 0;
  $('#stores-meta').textContent = `${dist} mi to ${game.nextStop() ? game.nextStop().short : 'Eden-9'}`;
}

function renderBars(S) {
  const rows = [
    { k: 'Hull', v: S.hull, tone: S.hull > 55 ? '#c9a06a' : S.hull > 25 ? '#ff8a45' : '#ff5a4e', val: Math.round(S.hull) },
    { k: 'Morale', v: S.morale, tone: S.morale > 55 ? '#78d7cb' : S.morale > 28 ? '#ffb454' : '#ff5a4e', val: Math.round(S.morale) },
  ];
  $('#bars').innerHTML = rows.map((r) => `
    <div class="bar-row">
      <span class="bar-k">${r.k}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${clamp(r.v, 0, 100)}%;background:${r.tone}"></div></div>
      <span class="bar-val">${r.val}</span>
    </div>`).join('');
}

function renderCrew(S) {
  $('#crew-grid').innerHTML = S.party.map((p) => {
    const st = memberStatus(p);
    const tone = healthTone(p.health);
    return `
      <div class="crew ${p.alive ? '' : 'dead'}">
        <div class="crew-top">
          <div class="av" data-tone="${p.tone}">${p.alive ? p.initials : '—'}</div>
          <div style="min-width:0">
            <div class="crew-name">${p.name}</div>
            <div class="crew-status ${st.cls}">${p.alive ? `${p.role} · ${st.label}` : 'dead'}</div>
          </div>
        </div>
        <div class="health">
          <div class="health-track"><div class="health-fill" style="width:${p.health}%;background:${tone}"></div></div>
          <span class="health-num">${Math.round(p.health)}</span>
        </div>
      </div>`;
  }).join('');
}

function renderLog(S, force = false) {
  const log = $('#log');
  const key = `${S.log.length}:${S.day}:${game.phase}`;
  if (!force && key === ui.logKey) return;
  ui.logKey = key;
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 70;
  log.innerHTML = S.log.map((e) => `
    <div class="entry ${e.kind || ''}">
      <span class="d">D${formatDay(e.day)}</span>
      <div>${e.text}</div>
    </div>`).join('');
  if (nearBottom || force) log.scrollTop = log.scrollHeight;
  $('#log-meta').textContent = `day ${formatDay(S.day)}`;
}

function renderControls(S) {
  const locked = game.phase !== 'travel' || !!S.ended;
  $$('#pace-group button').forEach((b) => {
    const on = b.dataset.pace === S.pace;
    b.classList.toggle('on', on);
    b.disabled = locked;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $$('#ration-group button').forEach((b) => {
    const on = b.dataset.ration === S.ration;
    b.classList.toggle('on', on);
    b.disabled = locked;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  $('#pace-note').textContent = PACES[S.pace].note;
  $('#ration-note').textContent = RATIONS[S.ration].note;

  const est = paceEstimate();
  $('#drive-sub').textContent = `~${est.dist} mi · ${est.fuel.toFixed(1)} fuel · ${est.water.toFixed(1)} water`;
  const drive = $('#btn-drive');
  drive.disabled = locked;

  const costs = { scavenge: { water: 1 }, repair: { scrap: 6 }, distill: { fuel: 3 }, forage: {}, rest: {} };
  $('#action-grid').innerHTML = CHORES.map((c, i) => {
    let disabled = locked;
    let reason = '';
    if (S.fuel <= 0 && c.id === 'distill') reason = 'No fuel';
    if (!game.canAfford(costs[c.id] || {})) { disabled = true; reason = 'Not enough supplies'; }
    if (c.id === 'repair' && S.hull >= 99) { disabled = true; reason = 'Hull intact'; }
    return `<button class="action" data-chore="${c.id}" ${disabled ? 'disabled' : ''}
        title="${c.cost}${reason ? ' — ' + reason : ''}">
      <b>${c.label}</b><span>${c.sub}</span>
    </button>`;
  }).join('');
  $$('#action-grid .action').forEach((b) => { b.dataset.index = CHORES.findIndex((c) => c.id === b.dataset.chore) + 1; });
}

/* ============================== wiring ============================== */

function guard(fn) {
  if (ui.busy) return;
  ui.busy = true;
  try { fn(); } finally { setTimeout(() => { ui.busy = false; }, 120); }
}

function onDrive() {
  if (!game.S || game.phase !== 'travel' || game.S.ended) return;
  guard(() => {
    const res = game.drive();
    if (!res) return;
    render();
    if (res.ended) { showEnding(res.ended); return; }
    if (ui.scene) { ui.scene.setSpeed(1.25); setTimeout(() => ui.scene && ui.scene.setSpeed(paceSpeed()), 900); }
    sound('drive');
    if (res.arrival) { showArrival(res.arrival); return; }
    if (res.event) { showEvent(res.event); return; }
    if (game.S.ended) showEnding(game.S.ended);
  });
}

function onChore(id) {
  if (!game.S || game.phase !== 'travel' || game.S.ended) return;
  guard(() => {
    const res = game.chore(id);
    if (!res) return;
    render();
    if (res.blocked) { toast(res.blocked, 'bad'); sound('bad'); return; }
    sound(id === 'rest' ? 'good' : 'click');
    if (res.ended) { showEnding(res.ended); return; }
    if (res.event) { showEvent(res.event); return; }
    if (game.S.ended) showEnding(game.S.ended);
  });
}

function setPace(pace) {
  if (!game.S || game.phase !== 'travel') return;
  game.S.pace = pace;
  render();
  sound('click');
}

function setRation(ration) {
  if (!game.S || game.phase !== 'travel') return;
  game.S.ration = ration;
  render();
  sound('click');
}

export function boot() {
  ui.muted = loadMuted();
  setMuted(ui.muted);
  renderStartRoster();
  refreshResume();
  showStart();

  $('#btn-start').addEventListener('click', () => { ensureAudio(); sound('click'); beginGame(false); });
  $('#btn-resume').addEventListener('click', () => { ensureAudio(); sound('click'); beginGame(true); });
  $('#btn-sound').addEventListener('click', () => { setMuted(!ui.muted); if (!ui.muted) sound('good'); });
  $('#btn-quit').addEventListener('click', () => { sound('click'); showQuit(); });
  $('#btn-drive').addEventListener('click', onDrive);

  $('#pace-group').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pace]');
    if (b) setPace(b.dataset.pace);
  });
  $('#ration-group').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ration]');
    if (b) setRation(b.dataset.ration);
  });
  $('#action-grid').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-chore]');
    if (b && !b.disabled) onChore(b.dataset.chore);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (!$('#modal-layer').classList.contains('hidden')) {
      if (e.key === 'Enter' || e.key === ' ') {
        const primary = $('#modal-card [data-enter]');
        if (primary && !primary.disabled) { e.preventDefault(); primary.click(); }
      }
      return;
    }
    if ($('#screen-game').classList.contains('hidden')) {
      if (e.key === 'Enter') $('#btn-start').click();
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); if (!$('#btn-drive').disabled) onDrive(); }
    else if (/^[1-5]$/.test(e.key)) {
      const chore = CHORES[Number(e.key) - 1];
      if (chore) onChore(chore.id);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!ui.scene) return;
    if (document.hidden) ui.scene.stop();
    else if (!$('#screen-game').classList.contains('hidden')) ui.scene.start();
  });

  window.addEventListener('beforeunload', () => { if (game.S && !game.S.ended) game.save(); });

  // test hook (harmless in production)
  window.__ASH = { game, render, boot };
}

/* ============================== modals ============================== */

function openModal(html, mode) {
  ui.modalMode = mode;
  const layer = $('#modal-layer');
  const card = $('#modal-card');
  card.innerHTML = html;
  layer.classList.remove('hidden');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    card.scrollTop = 0;
    const focusable = card.querySelector('button:not([disabled])');
    if (focusable && window.innerWidth > 700) focusable.focus({ preventScroll: true });
  });
}

function closeModal(silent = false) {
  $('#modal-layer').classList.add('hidden');
  $('#modal-card').innerHTML = '';
  document.body.classList.remove('modal-open');
  ui.modalMode = null;
  if (!silent) sound('click');
}

function modalVisual(iconName, tag) {
  return `<div class="modal-visual">
    <div class="mv-stripes"></div>
    <div class="mv-icon">${icon(iconName)}</div>
    <span class="tag">${tag}</span>
  </div>`;
}

/* ============================== events ============================== */

function showEvent(view) {
  ui.currentEvent = view;
  const buttons = view.choices.map((c) => `
    <button class="choice" data-choice="${c.i}" ${c.disabled ? 'disabled' : ''} ${c.i === 0 ? 'data-enter="1"' : ''}>
      <b><i>${String(c.i + 1).padStart(2, '0')}</i>${c.label}</b>
      <span>${c.disabled || c.hint}</span>
    </button>`).join('');
  openModal(`
    <div class="modal-kicker">${view.kicker} · DAY ${formatDay(game.S.day)}</div>
    <h3>${view.title}</h3>
    ${modalVisual(artIcon(view.art), 'FIELD NOTE · ' + view.id.toUpperCase())}
    <p class="modal-text">${view.text}</p>
    <div class="modal-choices">${buttons}</div>
  `, 'event');
  sound('bad');
  if (ui.scene) ui.scene.kick(0.8);
}

function artIcon(kind) {
  return {
    raider: 'i-hull', rain: 'i-rain', drone: 'i-signal', family: 'i-morale',
    greenhouse: 'i-food', dog: 'i-morale', rad: 'i-storm', wreck: 'i-hull',
    medic: 'i-meds', terminal: 'i-scrap', cult: 'i-flag', bridge: 'i-hull',
    shrine: 'i-flag', water: 'i-water', signal: 'i-signal',
  }[kind] || 'i-dust';
}

function chooseEvent(index) {
  const res = game.resolveEvent(index);
  if (!res) return;
  render();
  if (ui.scene) ui.scene.kick(1.2);
  const ended = game.endIfNeeded();
  if (ended) { showEnding(ended); return; }
  ui.pendingOutcomeArrival = res.arrival;
  const arrival = res.arrival;
  openModal(`
    <div class="modal-kicker">${arrival ? 'ARRIVAL' : 'CONSEQUENCE'}</div>
    <div class="modal-outcome"><p>${res.text}</p></div>
    ${arrival ? `<p class="modal-text">Through the dust: <strong>${arrival.name}</strong>. ${arrival.mile === 960 ? 'The last mile.' : 'A place to trade, rest, and hear a lie or two.'}</p>` : ''}
    <div class="modal-actions">
      <button class="btn btn-primary" data-act="outcome-continue" data-enter="1">${arrival ? 'Approach the stop' : 'Back on the road'}</button>
    </div>
  `, 'outcome');
  sound('click');
}

function outcomeContinue() {
  const fin = game.finishEvent();
  render();
  if (fin.arrival) { showArrival(fin.arrival); return; }
  closeModal();
}

/* ============================== endings ============================== */

function showEnding(end) {
  const winners = end.survivors;
  const lost = end.lost;
  const n = winners.length;
  const victory = end.victory;
  let title;
  let copy;
  if (victory) {
    title = n === 4 ? 'All four of you walk in.' : n === 3 ? 'Three of you walk in.' : n === 2 ? 'Two of you walk in.' : n === 1 ? 'One of you walks in.' : 'The gate opens on an empty crawler.';
    copy = n === 4
      ? 'The guard counts four and steps aside. Behind the fence there is grass, and a woman with a clipboard, and a sky the color of clean water. Nobody says anything for a long time.'
      : `The guard counts ${n} and does not ask about the seats that are empty. Eden-9 takes you in. The gate closes behind the Mule, and for the first time in nine hundred miles, nothing is following.`;
  } else {
    title = 'The road keeps what it takes.';
    copy = end.reason || 'Somewhere past the last mile marker, the Mule stops. The dust fills the seats. Eden-9 stays a rumor.';
  }

  const crewRows = [
    ...winners.map((p) => `<div class="epitaph-row"><div class="av" data-tone="${p.tone}">${p.initials}</div><span>${p.name}</span><span class="why" style="color:var(--green)">made it · ${p.health}hp</span></div>`),
    ...lost.map((p) => `<div class="epitaph-row gone"><div class="av" data-tone="${p.tone}">${p.initials}</div><span>${p.name}</span><span class="why">lost</span></div>`),
  ].join('');

  openModal(`
    <div class="end-flag" style="color:${victory ? 'var(--green)' : 'var(--red)'}">${victory ? '● RUN COMPLETE — EDEN-9' : '● RUN TERMINATED'}</div>
    <h3>${title}</h3>
    <p class="modal-text">${copy}</p>
    <div class="epitaph">${crewRows}</div>
    <div class="stats">
      <div class="stat-cell"><div class="k">Days</div><div class="v">${end.day}</div></div>
      <div class="stat-cell"><div class="k">Miles</div><div class="v">${end.mile}<small>/960</small></div></div>
      <div class="stat-cell"><div class="k">Survivors</div><div class="v">${n}<small>/4</small></div></div>
      <div class="stat-cell"><div class="k">Score</div><div class="v">${end.score}</div></div>
    </div>
    <p class="end-note">${victory ? `Grade <strong style="color:var(--amber)">${end.grade}</strong>. ${end.day} days on the road. ${end.events} encounters. ${money(end.loot)} scrap scavenged from the corpse of the world.` : 'The trail is long. Try again with more water and fewer heroics.'}</p>
    <div class="modal-actions">
      <button class="btn btn-primary" data-act="new-run" data-enter="1">Run it again</button>
      <button class="btn" data-act="title">Return to title</button>
    </div>
  `, 'ending');
  sound(victory ? 'win' : 'death');
}

/* ============================== confirm quit ============================== */

function showQuit() {
  openModal(`
    <div class="modal-kicker">PAUSE</div>
    <h3>Abandon the run?</h3>
    <p class="modal-text">The crew does not get a second crawler. All progress on this run will be lost.</p>
    <div class="modal-actions">
      <button class="btn btn-primary" data-act="quit-cancel" data-enter="1">Keep driving</button>
      <button class="btn" data-act="quit-confirm" style="color:var(--rust);border-color:rgba(255,107,53,.4)">Abandon run</button>
    </div>
  `, 'quit');
}

/* ============================== landmarks ============================== */

function showArrival(stop) {
  ui.arrivalView = stop;
  ui.rumorText = '';
  ui.shopQty = { water: 1, food: 1, fuel: 1, meds: 1 };
  if (stop.final) {
    openModal(`
      <div class="modal-kicker">MILE 960 · EDEN-9</div>
      <div class="lm-head"><h3>EDEN-9 PERIMETER</h3><span class="lm-mile">THE END</span></div>
      ${modalVisual('i-flag', 'PERIMETER · CLEARANCE PENDING')}
      <p class="modal-text">${stop.blurb}</p>
      <p class="voice">${stop.voice}</p>
      <p class="modal-text">Behind the guard: a road that is not broken, a fence with no razor wire, trees. The Mule will not be allowed past the gate. That is fine. It has done its part.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" data-act="enter-eden" data-enter="1">Walk in</button>
      </div>
    `, 'arrival');
    sound('win');
    return;
  }
  renderArrival();
  sound('good');
}

function renderArrival() {
  const stop = ui.arrivalView;
  if (!stop) return;
  const S = game.S;
  const stock = S.stocks[stop.mile];
  const next = ROUTE.find((s) => s.mile > stop.mile);
  const items = [
    { id: 'water', label: 'Water', icon: 'i-water' },
    { id: 'food', label: 'Rations', icon: 'i-food' },
    { id: 'fuel', label: 'Fuel cells', icon: 'i-fuel' },
    { id: 'meds', label: 'Medicine', icon: 'i-meds' },
  ];
  const rows = items.map((it) => {
    const price = stop.prices[it.id];
    const have = stock[it.id];
    const qty = clamp(ui.shopQty[it.id] || 1, 1, Math.max(1, Math.min(25, have || 1)));
    const cost = Math.round(price * qty);
    const cant = have <= 0 ? 'Sold out' : S.scrap < price ? 'No scrap' : '';
    return `<div class="shop-row">
      <div class="nm">${icon(it.icon)}<div>${it.label}<small>${have} left · ${price.toFixed(2)} ea</small></div></div>
      <span class="price">${cost} scrap</span>
      <div class="stepper">
        <button data-act="step" data-item="${it.id}" data-delta="-1" aria-label="Less ${it.label}" ${qty <= 1 || have <= 0 ? 'disabled' : ''}>−</button>
        <span>${qty}</span>
        <button data-act="step" data-item="${it.id}" data-delta="1" aria-label="More ${it.label}" ${qty >= Math.min(25, have) || have <= 0 ? 'disabled' : ''}>+</button>
      </div>
      <button class="btn btn-small" data-act="buy" data-item="${it.id}" ${cant ? 'disabled' : ''}>${cant || 'Buy'}</button>
    </div>`;
  }).join('');

  const rested = S.restedAt.includes(stop.mile);
  openModal(`
    <div class="modal-kicker">MILE ${stop.mile} · ${stop.tag} · SUPPLY STOP</div>
    <div class="lm-head">
      <h3>${stop.name}</h3>
      <span class="lm-mile">${next ? next.mile - stop.mile + ' MI TO ' + next.short.toUpperCase() : 'THE END'}</span>
    </div>
    ${modalVisual('i-scrap', 'TRADE POST · OPEN')}
    <p class="modal-text">${stop.blurb}</p>
    <p class="voice">${stop.voice}</p>
    ${ui.rumorText ? `<p class="rumor-box"><b>Overheard:</b> ${ui.rumorText}</p>` : ''}
    <div class="shop">${rows}</div>
    <div class="scrap-line"><span>SCRAP ON HAND</span><b>${money(S.scrap)}</b></div>
    <div class="modal-actions">
      <button class="btn" data-act="rest-stop" ${rested ? 'disabled' : ''}>${rested ? 'Rested' : 'Rest a day'}</button>
      <button class="btn" data-act="rumor">Ask around</button>
      <button class="btn btn-primary" data-act="leave-stop" data-enter="1">Continue east</button>
    </div>
  `, 'arrival');
}

function stepShop(item, delta) {
  const stop = ui.arrivalView;
  if (!stop) return;
  const have = game.S.stocks[stop.mile][item] || 0;
  const max = Math.max(1, Math.min(25, have));
  ui.shopQty[item] = clamp((ui.shopQty[item] || 1) + delta, 1, max);
  renderArrival();
  sound('click');
}

function buyShop(item) {
  const stop = ui.arrivalView;
  if (!stop) return;
  const qty = ui.shopQty[item] || 1;
  const res = game.buy(item, qty);
  if (!res.ok) { toast(res.msg, 'bad'); sound('bad'); return; }
  render();
  ui.shopQty[item] = 1;
  renderArrival();
  toast(`+${res.actual} ${item} for ${money(res.cost)} scrap`, 'good');
  sound('good');
}

function restStop() {
  const res = game.restAtLandmark();
  if (!res) return;
  if (res.blocked) { toast(res.blocked, 'bad'); return; }
  render();
  if (game.S.ended) { showEnding(game.S.ended); return; }
  renderArrival();
  toast('The crew sleeps under a roof. Everyone heals.', 'good');
  sound('good');
}

function askRumor() {
  const res = game.rumor();
  if (!res) return;
  ui.rumorText = res.text;
  renderArrival();
  render();
  sound('click');
}

function leaveStop() {
  const res = game.leaveLandmark();
  if (!res) return;
  if (res.ended) { showEnding(res.ended); return; }
  render();
  closeModal();
  toast('Back on the road.', '');
}

function enterEden() {
  const res = game.leaveLandmark();
  if (res && res.ended) { showEnding(res.ended); return; }
  const end = game.finish(true);
  if (end) showEnding(end);
}

/* ============================== modal wiring ============================== */

$('#modal-card').addEventListener('click', (e) => {
  const choice = e.target.closest('[data-choice]');
  if (choice && !choice.disabled) {
    chooseEvent(Number(choice.dataset.choice));
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const act = btn.dataset.act;
  if (act === 'outcome-continue') outcomeContinue();
  else if (act === 'leave-stop') leaveStop();
  else if (act === 'rest-stop') restStop();
  else if (act === 'rumor') askRumor();
  else if (act === 'step') stepShop(btn.dataset.item, Number(btn.dataset.delta));
  else if (act === 'buy') buyShop(btn.dataset.item);
  else if (act === 'enter-eden') enterEden();
  else if (act === 'quit-cancel') closeModal();
  else if (act === 'quit-confirm') {
    game.clearSave();
    game.S = null;
    ui.arrivalView = null;
    ui.started = false;
    closeModal(true);
    showStart();
    toast('Run abandoned.', '');
  } else if (act === 'new-run') {
    closeModal(true);
    beginGame(false);
  } else if (act === 'title') {
    closeModal(true);
    game.S = null;
    showStart();
  }
});

document.querySelector('.modal-backdrop').addEventListener('click', () => {
  if (ui.modalMode === 'quit') closeModal();
});

/* ============================== start new run ============================== */

function startNewRun() {
  closeModal(true);
  beginGame(false);
}

/* keep reference for test hooks */
window.__ASH.showEvent = showEvent;
window.__ASH.showArrival = showArrival;
window.__ASH.showEnding = showEnding;

/* ============================== boot call ============================== */

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
