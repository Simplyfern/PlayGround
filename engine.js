/* ASH TRAIL — game rules and state */

import { START, CREW_TEMPLATES, ROUTE, PACES, RATIONS, BASE_USE, WEATHERS, CHORES } from './data.js';
import { EVENTS, AMBIENT, ROAD_RUMORS } from './events.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p) => Math.random() < p;
const SAVE_KEY = 'ashtrail-run-v1';

const START_LOG = [
  ['The Lastlight gate closes behind you. It does not open again.', 'daybreak'],
  ['Four survivors. One crawler. Nine hundred sixty miles to a rumor.', ''],
  ['Mara checks the welds. Imani checks the water. Dex checks the locks. Rook checks the horizon, then checks it again.', ''],
  ['Eden-9 or nothing. Drive.', 'good'],
];

export class Game {
  constructor() {
    this.S = null;
    this.phase = 'menu';
    this.pendingEvent = null;
    this.pendingArrival = null;
    this.lastResult = null;
  }

  /* ---------- lifecycle ---------- */

  newGame() {
    const crew = CREW_TEMPLATES.map((c) => ({
      id: c.id, name: c.name, role: c.role, initials: c.initials, tone: c.tone,
      trait: c.trait, perk: c.perk, health: c.health, status: 'ok', alive: true, cause: null,
    }));
    const stocks = {};
    for (const stop of ROUTE) stocks[stop.mile] = { ...stop.stock };
    this.S = {
      version: 1,
      day: 1, mile: 0,
      water: START.water, food: START.food, fuel: START.fuel, scrap: START.scrap, meds: START.meds,
      hull: START.hull, morale: START.morale,
      pace: 'steady', ration: 'half', weather: 'clear',
      party: crew, stocks,
      visited: [0], restedAt: [], rumors: {}, recentEvents: [],
      stats: { chores: 0, events: 0, miles: 0, scavenged: 0, damages: 0 },
      log: START_LOG.map(([text, kind]) => ({ day: 1, text, kind })),
      ended: null, dog: false,
      scrapEarned: 0, foodFound: 0,
    };
    this.phase = 'travel';
    this.pendingEvent = null;
    this.pendingArrival = null;
    return this.snapshot();
  }

  snapshot() {
    return {
      state: this.S, phase: this.phase,
      event: this.pendingEvent, arrival: this.pendingArrival, ended: this.S?.ended || null,
    };
  }

  save() {
    try { if (this.S) localStorage.setItem(SAVE_KEY, JSON.stringify(this.S)); } catch { /* storage may be unavailable */ }
  }

  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  peekSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const S = JSON.parse(raw);
      if (!S || S.version !== 1 || S.ended) return null;
      return S;
    } catch { return null; }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const S = JSON.parse(raw);
      if (!S || !Array.isArray(S.party) || S.version !== 1) return null;
      this.S = S;
      this.phase = S.ended ? 'ended' : 'travel';
      const stop = ROUTE.find((r) => r.mile === S.mile);
      if (!S.ended && stop && stop.mile > 0 && stop.mile < 960) this.phase = 'arrival';
      this.pendingEvent = null;
      this.pendingArrival = null;
      return this.snapshot();
    } catch { return null; }
  }

  clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  }

  alive() { return this.S.party.filter((p) => p.alive); }
  aliveCount() { return this.alive().length; }
  hasTrait(id) { return this.S.party.some((p) => p.alive && p.id === id); }
  getStop(mile = this.S.mile) { return ROUTE.find((s) => s.mile === mile) || ROUTE[0]; }
  nextStop() { return ROUTE.find((s) => s.mile > this.S.mile) || null; }

  /* ---------- resources ---------- */

  log(text, kind = '') {
    this.S.log.push({ day: this.S.day, text, kind });
    if (this.S.log.length > 120) this.S.log.splice(0, this.S.log.length - 120);
  }

  add(delta) {
    const S = this.S;
    if (delta.water != null) S.water = clamp(S.water + delta.water, 0, 99);
    if (delta.food != null) S.food = clamp(S.food + delta.food, 0, 99);
    if (delta.fuel != null) S.fuel = clamp(S.fuel + delta.fuel, 0, 99);
    if (delta.scrap != null) S.scrap = clamp(S.scrap + delta.scrap, 0, 9999);
    if (delta.meds != null) S.meds = clamp(S.meds + delta.meds, 0, 99);
    if (delta.hull != null) S.hull = clamp(S.hull + delta.hull, 0, 100);
    if (delta.morale != null) S.morale = clamp(S.morale + delta.morale, 0, 100);
    if (delta.mile != null) S.mile = Math.max(0, Math.min(960, S.mile + delta.mile));
    if (delta.scrap > 0) S.scrapEarned += delta.scrap;
  }

  pay(cost) {
    for (const k of Object.keys(cost)) {
      if ((this.S[k] || 0) < cost[k]) return false;
    }
    for (const k of Object.keys(cost)) this.S[k] -= cost[k];
    return true;
  }

  canAfford(cost) {
    return Object.entries(cost).every(([k, v]) => (this.S[k] || 0) >= v);
  }

  health(member, amount, status, cause) {
    if (!member || !member.alive) return member;
    const soften = this.hasTrait('rook') ? 0.88 : 1;
    if (amount < 0) amount *= soften;
    member.health = clamp(member.health + amount, 0, 100);
    if (status && member.health > 0) {
      const bad = ['sick', 'injured', 'rad'];
      if (bad.includes(status)) member.status = status;
    }
    if (member.health <= 0) {
      member.alive = false;
      member.health = 0;
      member.status = 'dead';
      this.log(`${member.name} is dead. ${cause || pick(['The road took them.', 'There was nothing left to do.', 'It was quick, at least.'])}`, 'bad');
    }
    return member;
  }

  hurt(amount, status = 'injured', member = null) {
    const target = member && member.alive ? member : pick(this.alive());
    if (!target) return null;
    this.health(target, -amount, status);
    return target;
  }

  hurtAll(amount, status = 'injured') {
    for (const p of this.alive()) this.health(p, -amount, status);
  }

  heal(amount, member = null) {
    const targets = member ? [member] : this.alive();
    for (const p of targets) {
      if (!p.alive) continue;
      const bonus = this.hasTrait('reyes') ? 1.55 : 1;
      p.health = clamp(p.health + amount * bonus, 0, 100);
      if (p.health > 32) p.status = 'ok';
    }
  }

  byId(id) { return this.S.party.find((p) => p.id === id); }

  /* ---------- day / weather / travel ---------- */

  rollWeather() {
    const prev = this.S.weather;
    const table = [
      ['clear', 0.34], ['haze', 0.24], ['dust', 0.17], ['storm', 0.07], ['rain', 0.11], ['cold', 0.07],
    ];
    if (prev === 'dust') { table[2][1] += 0.08; table[3][1] += 0.06; table[0][1] -= 0.06; }
    if (prev === 'storm') { table[3][1] = 0; table[1][1] += 0.1; }
    if (prev === 'rain') { table[4][1] = 0.02; table[1][1] += 0.08; }
    const total = table.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * total;
    for (const [id, w] of table) {
      r -= w;
      if (r <= 0) { this.S.weather = id; return id; }
    }
    this.S.weather = 'clear';
    return 'clear';
  }

  /** Advances one day. travel=false for chore days and landmark rests. */
  advanceDay({ travel }) {
    const S = this.S;
    const today = S.day;
    const alive = this.alive();
    const n = alive.length;
    if (n === 0) return;
    const p = PACES[S.pace];
    const r = RATIONS[S.ration];
    const w = WEATHERS[S.weather];
    const scale = 0.42 + 0.58 * (n / 4);
    const messages = [];

    // --- fuel & distance ---
    let dist = 0;
    let fuelUsed = 0;
    if (travel) {
      const baseDist = p.dist * w.dist * (0.58 + S.hull * 0.0042) * (S.morale < 30 ? 0.92 : 1) * (this.hasTrait('rook') ? 1.05 : 1);
      dist = Math.round(baseDist * (0.93 + Math.random() * 0.14));
      const fuelNeed = p.fuel * (1 + (100 - S.hull) * 0.0032);
      fuelUsed = Math.min(S.fuel, fuelNeed);
      if (fuelUsed < fuelNeed - 0.001) {
        dist = Math.round(dist * Math.max(0.12, fuelUsed / fuelNeed));
        messages.push({ text: 'The cells run dry before the day does. The Mule rolls on fumes and bad language.', kind: 'warn' });
        S.morale = clamp(S.morale - 2, 0, 100);
      }
      S.fuel = clamp(S.fuel - fuelUsed, 0, 99);
      S.mile = Math.min(960, S.mile + dist);
      S.stats.miles += dist;
    } else {
      // idling still sips fuel for heat / lights
      S.fuel = clamp(S.fuel - 0.6, 0, 99);
    }

    // --- water & food ---
    const waterNeed = BASE_USE.water * p.water * w.water * scale * (travel ? 1 : 0.72);
    const foodNeed = BASE_USE.food * r.food * scale * (travel ? 1 : 0.92);
    const waterHave = S.water;
    const foodHave = S.food;
    S.water = clamp(S.water - waterNeed, 0, 99);
    S.food = clamp(S.food - foodNeed, 0, 99);
    const waterGap = Math.max(0, waterNeed - waterHave) / Math.max(0.1, waterNeed);
    const foodGap = Math.max(0, foodNeed - foodHave) / Math.max(0.1, foodNeed);

    if (waterGap > 0.02) {
      const dmg = 5 + waterGap * 11;
      this.hurtAll(dmg);
      S.morale = clamp(S.morale - 4 * waterGap, 0, 100);
      messages.push({ text: `The canteens are dry. ${waterGap > 0.7 ? 'Everyone is cracking at the lips, seeing spots.' : 'Rationing water down to the last mouthful.'}`, kind: 'bad' });
    }
    if (foodGap > 0.02) {
      const dmg = 3 + foodGap * 7;
      this.hurtAll(dmg);
      S.morale = clamp(S.morale - 3.5 * foodGap, 0, 100);
      messages.push({ text: `${foodGap > 0.7 ? 'Nobody has eaten properly in days.' : 'Rations come up short. Bellies complain louder than the engine.'}`, kind: 'bad' });
    }

    // --- status & morale drift ---
    for (const m of this.alive()) {
      if (m.status === 'sick') this.health(m, -1.3);
      else if (m.status === 'injured') this.health(m, -1.1);
      else if (m.status === 'rad') this.health(m, -1.6);
      else if (waterGap === 0 && foodGap === 0 && r === RATIONS.full && S.morale > 55) this.health(m, 0.5);
    }
    let morale = r.morale + p.morale;
    if (S.weather === 'storm') morale -= 2;
    if (S.weather === 'rain') morale -= 0.6;
    if (waterGap > 0) morale -= 2;
    if (foodGap > 0) morale -= 2;
    if (this.alive().some((m) => m.status === 'sick')) morale -= 0.8;
    if (this.S.dog) morale += 0.5;
    S.morale = clamp(S.morale + morale, 0, 100);

    // --- hull wear ---
    if (travel) {
      let wear = p.hullWear * (0.22 + w.hazard * 5.2) * (0.7 + Math.random() * 0.7);
      if (this.hasTrait('voss')) wear *= 0.78;
      if (wear > 0.15) S.hull = clamp(S.hull - wear, 0, 100);
      if (S.hull < 46 && chance(0.1 + (46 - S.hull) * 0.008)) {
        const dmg = int(2, 7);
        S.hull = clamp(S.hull - dmg, 0, 100);
        S.stats.damages += 1;
        messages.push({ text: `Something under the floorpan lets go. ${this.hasTrait('voss') ? 'Mara hears it first and is already reaching for the torch.' : 'The whole frame shudders.'}`, kind: 'warn' });
      }
    }

    // --- ambient & summary ---
    if (travel) {
      messages.unshift({
        text: `Mile ${Math.floor(S.mile)}. ${dist} miles today${fuelUsed > 0 ? `, ${fuelUsed.toFixed(1)} fuel burned` : ''}. ${WEATHERS[S.weather].label.toLowerCase()}.`,
        kind: 'daybreak',
      });
      if (chance(0.35)) messages.push({ text: pick(AMBIENT), kind: '' });
    }

    S.day += 1;
    this.rollWeather();

    // death / end checks
    if (this.aliveCount() === 0) {
      this.finish(false, 'The last of you stops breathing somewhere on the road. The Mule idles until the fuel runs out.');
    } else if (S.hull <= 0) {
      this.finish(false, 'The Mule gives out — a sound like a dropped toolbox, then nothing. Without wheels, the miles are just weather.');
    }

    return { messages, dist, today, ended: !!S.ended };
  }

  logMany(list) {
    for (const m of list) this.log(m.text, m.kind);
  }

  /* ---------- public turn actions ---------- */

  drive() {
    if (this.phase !== 'travel' || !this.S || this.S.ended) return null;
    const res = this.advanceDay({ travel: true });
    if (!res) return null;
    this.logMany(res.messages);
    if (this.S.ended) return { messages: res.messages, ended: this.S.ended };

    const arrival = this.checkArrival();
    if (arrival) {
      this.pendingArrival = arrival;
      this.phase = 'arrival';
      this.log(`You reach ${arrival.name}.`, 'good');
      this.save();
      return { messages: res.messages, arrival: this.publicStop(arrival) };
    }

    const ev = this.maybeEvent();
    if (ev) {
      this.pendingEvent = ev;
      this.phase = 'event';
      this.log(`— ${ev.title} —`, 'event');
      this.save();
      return { messages: res.messages, event: this.eventView(ev) };
    }

    this.save();
    return { messages: res.messages };
  }

  chore(id) {
    if (this.phase !== 'travel' || !this.S || this.S.ended) return null;
    const chore = CHORES.find((c) => c.id === id);
    if (!chore) return null;
    const messages = [];
    const S = this.S;

    if (id === 'scavenge') {
      if (!this.pay({ water: 1 })) return { blocked: 'You need 1 water for the trip into the ruins.' };
      const p = PACES[S.pace];
      const loot = Math.round(int(13, 27) * (this.hasTrait('dex') ? 1.35 : 1));
      const fuel = int(0, 5);
      this.add({ scrap: loot, fuel });
      S.stats.scavenged += loot;
      messages.push({ text: `You spend the day in a collapsed mall picking copper out of the walls. +${loot} scrap${fuel ? `, +${fuel} fuel` : ''}.`, kind: 'good' });
      if (chance(0.33)) {
        const water = int(3, 6);
        this.add({ water });
        messages.push({ text: `A pipe in the ceiling still holds clean water. You fill ${water} units.`, kind: 'good' });
      }
      if (chance(0.28)) {
        const m = this.hurt(int(5, 12));
        messages.push({ text: `${m ? m.name : 'Someone'} comes back limping. ${pick(['A floor gave way.', 'Someone else was already living in there.', 'A nail through the boot.'])}`, kind: 'bad' });
      }
    } else if (id === 'forage') {
      const food = int(6, 14) + (this.hasTrait('rook') ? 2 : 0);
      const water = int(1, 4);
      this.add({ food, water });
      S.foodFound += food;
      messages.push({ text: `Rook finds a drainage cut with edible weeds and something that used to be a rabbit. +${food} rations, +${water} water.`, kind: 'good' });
      if (chance(0.2)) {
        const m = this.hurt(int(4, 10));
        messages.push({ text: `${m ? m.name : 'Someone'} gets cut open on a snare in the brush.`, kind: 'bad' });
      }
    } else if (id === 'rest') {
      const heal = 9 + (this.hasTrait('reyes') ? 6 : 0);
      this.heal(heal);
      this.add({ morale: 6 });
      messages.push({ text: `You pull off the road and let the engine cool. Everyone sleeps in a pile with the heater on low. The crew looks human again.`, kind: 'good' });
    } else if (id === 'repair') {
      if (S.hull >= 99) return { blocked: 'The Mule is already as whole as it is ever going to be.' };
      if (!this.pay({ scrap: 6 })) return { blocked: 'You need 6 scrap to patch the hull.' };
      const patch = 11 + (this.hasTrait('voss') ? 7 : 0);
      this.add({ hull: patch });
      messages.push({ text: `Mara welds a plate over the worst of it and Dex holds the light. +${patch} hull. ${S.hull > 90 ? '"Good as new," she lies.' : '"It\'ll hold."'}`, kind: 'good' });
    } else if (id === 'distill') {
      if (!this.pay({ fuel: 3 })) return { blocked: 'You need 3 fuel to run the still.' };
      const water = int(11, 17) + (S.weather === 'rain' ? 4 : 0);
      this.add({ water });
      messages.push({ text: `You run the still off the engine block. It gurgles and spits and gives up ${water} units of water that tastes like hot plastic.`, kind: 'good' });
    }

    S.stats.chores += 1;
    const res = this.advanceDay({ travel: false });
    if (res) messages.unshift(...res.messages);
    if (S.ended) { this.logMany(messages); this.save(); return { messages, ended: S.ended }; }
    messages.push(...this.choreDrift(id));
    this.logMany(messages);
    this.save();
    return { messages };
  }

  choreDrift(id) {
    const out = [];
    const roll = Math.random();
    if (roll < 0.13) {
      const m = this.alive()[Math.floor(Math.random() * this.aliveCount())];
      if (id === 'scavenge' && chance(0.5)) {
        this.add({ scrap: 8 });
        out.push({ text: 'On the way back, Dex kicks open a locker with eight more scrap in it. He is insufferable about this.', kind: 'good' });
      } else if (m) {
        this.health(m, -4, id === 'repair' ? 'injured' : 'sick');
        out.push({ text: `${m.name} picks up a cough that settles in for the night.`, kind: 'warn' });
      }
    }
    return out;
  }

  /* ---------- events ---------- */

  maybeEvent() {
    const S = this.S;
    let p = 0.5;
    if (S.pace === 'sprint') p += 0.1;
    if (S.weather === 'storm') p += 0.08;
    if (!chance(p)) return null;
    const eligible = EVENTS.filter((e) => {
      if (S.recentEvents.includes(e.id)) return false;
      if (e.id === 'fever' && this.aliveCount() < 2) return false;
      return true;
    });
    if (!eligible.length) return null;
    const total = eligible.reduce((a, e) => a + e.weight, 0);
    let r = Math.random() * total;
    let chosen = eligible[eligible.length - 1];
    for (const e of eligible) {
      r -= e.weight;
      if (r <= 0) { chosen = e; break; }
    }
    S.recentEvents.push(chosen.id);
    if (S.recentEvents.length > 6) S.recentEvents.shift();
    S.stats.events += 1;
    return chosen;
  }

  eventView(ev) {
    const g = this.context();
    const text = typeof ev.text === 'function' ? ev.text(g) : ev.text;
    const choices = ev.choices.map((c, i) => {
      let disabled = null;
      if (c.requires) disabled = c.requires(g);
      return { i, label: c.label, hint: c.hint, disabled };
    });
    return { id: ev.id, title: ev.title, kicker: ev.kicker, art: ev.art, text, choices };
  }

  context() {
    const g = {
      s: this.S,
      chance, pick, int,
      rand: Math.random,
      add: (d) => this.add(d),
      pay: (c) => this.pay(c),
      can: (c) => this.canAfford(c),
      hurt: (amt, status = 'injured', member = null) => this.hurt(amt, status, member),
      hurtAll: (amt, status) => this.hurtAll(amt, status),
      heal: (amt) => this.heal(amt),
      pickAlive: () => pick(this.alive()),
      alive: () => this.alive(),
      byId: (id) => this.byId(id),
      log: (t, k) => this.log(t, k),
      morale: (n) => this.add({ morale: n }),
      hull: (n) => this.add({ hull: n }),
      trait: (id) => this.hasTrait(id),
    };
    return g;
  }

  resolveEvent(index) {
    if (this.phase !== 'event' || !this.pendingEvent) return null;
    const ev = this.pendingEvent;
    const choice = ev.choices[index];
    if (!choice) return null;
    const g = this.context();
    if (choice.requires && choice.requires(g)) return null;
    const text = choice.run(g) || '';
    this.log(text, 'event');
    this.pendingEvent = null;
    this.phase = 'travel';
    this.pendingArrival = this.checkArrival();
    this.save();
    return { text, arrival: this.pendingArrival ? this.publicStop(this.pendingArrival) : null, ended: this.S.ended };
  }

  finishEvent() {
    if (this.pendingArrival) {
      this.phase = 'arrival';
      return { arrival: this.publicStop(this.pendingArrival) };
    }
    this.pendingArrival = null;
    this.phase = 'travel';
    return {};
  }

  publicStop(stop) {
    return {
      mile: stop.mile, name: stop.name, tag: stop.tag, sector: stop.sector,
      blurb: stop.blurb, voice: stop.voice, prices: stop.prices,
      stock: this.S.stocks[stop.mile], visited: this.S.visited.includes(stop.mile),
      final: stop.mile >= 960,
    };
  }

  checkArrival() {
    const stop = ROUTE.find((s) => s.mile > 0 && this.S.mile >= s.mile);
    if (stop) {
      this.S.mile = Math.max(this.S.mile, stop.mile);
      if (!this.S.visited.includes(stop.mile)) this.S.visited.push(stop.mile);
      return stop;
    }
    return null;
  }

  /* ---------- landmark ---------- */

  buy(item, qty) {
    const S = this.S;
    const stop = ROUTE.find((s) => s.mile === S.mile);
    if (!stop) return { ok: false, msg: 'No trading post here.' };
    const price = stop.prices[item];
    const stock = S.stocks[stop.mile][item];
    qty = Math.max(1, Math.min(99, Math.floor(qty) || 0));
    const actual = Math.min(qty, stock, Math.floor(S.scrap / price));
    if (actual <= 0) return { ok: false, msg: stock <= 0 ? 'Sold out.' : 'Not enough scrap.' };
    S.scrap -= actual * price;
    S.stocks[stop.mile][item] = stock - actual;
    this.add({ [item]: actual });
    this.log(`Bought ${actual} ${item} at ${stop.short} for ${(actual * price).toFixed(0)} scrap.`, 'good');
    this.save();
    return { ok: true, actual, cost: actual * price, stock: S.stocks[stop.mile][item] };
  }

  restAtLandmark() {
    const S = this.S;
    if (this.phase !== 'arrival') return null;
    if (S.restedAt.includes(S.mile)) return { blocked: 'You already rested here.' };
    S.restedAt.push(S.mile);
    this.heal(13);
    this.add({ morale: 5 });
    this.log('You take a room — or a corner of one — and sleep with a roof overhead. It changes very little. It changes everything.', 'good');
    const res = this.advanceDay({ travel: false });
    this.save();
    return { messages: res ? res.messages : [], ended: !!S.ended };
  }

  rumor() {
    const S = this.S;
    const stop = ROUTE.find((s) => s.mile === S.mile);
    const text = pick(ROAD_RUMORS);
    if (S.rumors[S.mile]) return { text: S.rumors[S.mile] };
    S.rumors[S.mile] = text;
    this.log(`At ${stop.short}: ${text}`, '');
    this.save();
    return { text };
  }

  leaveLandmark() {
    if (this.phase !== 'arrival') return null;
    if (this.S.mile >= 960) return { ended: this.finish(true) };
    this.pendingArrival = null;
    this.phase = 'travel';
    this.log('The Mule pulls back onto the road.', '');
    this.save();
    return {};
  }

  /* ---------- endings ---------- */

  finish(victory, reason) {
    const S = this.S;
    if (!S || S.ended) return S ? S.ended : null;
    const survivors = this.alive();
    const score = victory
      ? Math.round((survivors.length * 1000) + Math.max(0, 900 - S.day) * 20 + S.morale * 8 + Math.min(300, S.scrap))
      : 0;
    const grade = !victory ? 'F' : score > 5600 ? 'S' : score > 4700 ? 'A' : score > 3800 ? 'B' : score > 3000 ? 'C' : 'D';
    const lost = S.party.filter((p) => !p.alive);
    S.ended = {
      victory, reason: reason || '', score, grade,
      survivors: survivors.map((p) => ({ name: p.name, role: p.role, initials: p.initials, health: Math.round(p.health), tone: p.tone })),
      lost: lost.map((p) => ({ name: p.name, role: p.role, initials: p.initials, tone: p.tone, cause: p.cause })),
      day: S.day, mile: Math.round(S.mile), loot: S.scrapEarned, events: S.stats.events,
    };
    this.phase = 'ended';
    this.clearSave();
    return S.ended;
  }

  endIfNeeded() {
    if (!this.S || this.S.ended) return this.S?.ended || null;
    if (this.aliveCount() === 0) return this.finish(false, 'The last of you stops breathing somewhere on the road. The Mule idles until the fuel runs out.');
    if (this.S.hull <= 0) return this.finish(false, 'The Mule gives out — a sound like a dropped toolbox, then nothing. Without wheels, the miles are just weather.');
    if (this.S.mile >= 960) return this.finish(true);
    return null;
  }
}
