/* ASH TRAIL — static world data */

export const START = {
  water: 52, food: 46, fuel: 42, scrap: 170, meds: 3,
  hull: 84, morale: 66, mile: 0, day: 1,
};

export const CREW_TEMPLATES = [
  { id: 'voss', name: 'Mara Voss', role: 'Mechanic', initials: 'MV', tone: 1, health: 88,
    trait: 'Patchwork', perk: '+8 hull per repair; breakdowns hit softer.' },
  { id: 'reyes', name: 'Imani Reyes', role: 'Medic', initials: 'IR', tone: 0, health: 92,
    trait: 'Steady Hands', perk: 'Medicine and rest heal far more.' },
  { id: 'dex', name: 'Dex Okonkwo', role: 'Scavenger', initials: 'DO', tone: 3, health: 81,
    trait: "Rat's Nose", perk: '+35% loot when scavenging ruins.' },
  { id: 'rook', name: 'Rook', role: 'Scout', initials: 'RK', tone: 2, health: 90,
    trait: 'Quiet Feet', perk: 'Pushes distance; softens ambushes.' },
];

export const ROUTE = [
  {
    mile: 0, name: 'LASTLIGHT GATE', short: 'Lastlight', sector: 'SECTOR 00', tag: 'HOME',
    stock: { water: 99, food: 99, fuel: 60, meds: 4 },
    prices: { water: 0.9, food: 1.3, fuel: 2.3, meds: 14 },
    blurb: 'The last city you know. A wall of shipping containers, a gate that opens inward, and a crowd that does not wave. The Mule idles badly in the cold, loaded with everything you could not sell.',
    voice: 'Gate clerk: "Eden-9? Sure. My cousin went. Send a postcard."',
  },
  {
    mile: 170, name: 'THE SLAG PITS', short: 'Slag Pits', sector: 'SECTOR 02', tag: 'INDUSTRIAL',
    stock: { water: 18, food: 34, fuel: 55, meds: 1 },
    prices: { water: 1.2, food: 1.5, fuel: 1.8, meds: 17 },
    blurb: 'A strip mine that ate a mountain and kept going. Smelters still run on scavenged coal. Everything here is grey, including the people, who trade in engine cores and boiled water.',
    voice: 'Pit boss: "Cheap fuel. Bad water. Don\'t drink the water."',
  },
  {
    mile: 350, name: 'RUSTWATER STATION', short: 'Rustwater', sector: 'SECTOR 04', tag: 'WATER',
    stock: { water: 90, food: 26, fuel: 20, meds: 3 },
    prices: { water: 0.5, food: 1.3, fuel: 2.7, meds: 12 },
    blurb: 'A tilted water tower on a dead rail line, guarded by a co-op of filter-runners. They pump the aquifer, boil it twice, and sell it at a price that is almost fair.',
    voice: 'Filter-runner: "Fill up. Past the basin the rain comes down black."',
  },
  {
    mile: 530, name: 'THE BONE ORCHARD', short: 'Bone Orchard', sector: 'SECTOR 06', tag: 'CULT',
    stock: { water: 30, food: 60, fuel: 24, meds: 4 },
    prices: { water: 1.4, food: 1.0, fuel: 3.0, meds: 10 },
    blurb: 'Wind chimes made of dog tags. A field of crosses with no graves under them. The Choir tends the stalls in silence and sells food it grows in soil they insist is holy.',
    voice: 'Choir elder: "The road takes everyone. We only take a little."',
  },
  {
    mile: 700, name: 'STATIC MESA', short: 'Static Mesa', sector: 'SECTOR 08', tag: 'AI RELAY',
    stock: { water: 40, food: 30, fuel: 45, meds: 2 },
    prices: { water: 1.0, food: 1.8, fuel: 2.0, meds: 15 },
    blurb: 'A pre-collapse relay tower still screaming numbers into the dark. The interceptor AI has decided it owns this mesa, and it trades provisions for "compliance data" — which is you, talking about yourself.',
    voice: 'RELAY-7: "PURCHASE APPROVED. SPEAK CLEARLY INTO THE BOX."',
  },
  {
    mile: 840, name: 'BLACKGLASS BASIN', short: 'Blackglass', sector: 'SECTOR 10', tag: 'HOT ZONE',
    stock: { water: 26, food: 22, fuel: 30, meds: 2 },
    prices: { water: 0.75, food: 1.1, fuel: 2.2, meds: 18 },
    blurb: 'An old solar farm fused into one black mirror by something that happened here before you were born. The glass-miners cut slabs out of it and sell them to people who believe they are lucky.',
    voice: 'Glass-miner: "Eden is eleven miles past the shimmer. Or it isn\'t. Depends who\'s asking."',
  },
  {
    mile: 960, name: 'EDEN-9 PERIMETER', short: 'Eden-9', sector: 'SECTOR 12', tag: 'THE END',
    stock: { water: 0, food: 0, fuel: 0, meds: 0 },
    prices: { water: 1, food: 1, fuel: 1, meds: 1 },
    blurb: 'A fence. Then trees — real ones, unburnt. Then a guard in a clean coat with a clipboard, asking how many of you are still well enough to walk in under your own power.',
    voice: 'Gate guard: "No weapons past the fence. No exceptions. Welcome to Eden-9."',
  },
];

export const PACES = {
  crawl:  { label: 'Crawl',  note: 'quiet & careful',  dist: 16, fuel: 2.0, water: 0.8, food: 0.85, risk: 0.55, hullWear: 0.4, morale: 0 },
  steady: { label: 'Steady', note: 'balanced',          dist: 27, fuel: 3.1, water: 1.0, food: 1.0,  risk: 1.0,  hullWear: 1.0, morale: 0 },
  sprint: { label: 'Sprint', note: 'loud & fast',       dist: 39, fuel: 4.4, water: 1.32, food: 1.15, risk: 1.65, hullWear: 1.9, morale: -1 },
};

export const RATIONS = {
  quarter: { label: 'Quarter', note: 'hungry',   food: 0.55, morale: -1.6 },
  half:    { label: 'Half',    note: 'half',     food: 1.0,  morale: 0 },
  full:    { label: 'Full',    note: 'generous', food: 1.5,  morale: 1.4 },
};

export const BASE_USE = { water: 4.0, food: 4.6 };

export const WEATHERS = {
  clear:  { label: 'CLEAR',    icon: 'i-sun',   dist: 1.00, water: 1.05, hazard: 0.00, dust: 0.15, sky: 'dusk' },
  haze:   { label: 'COPPER HAZE', icon: 'i-dust', dist: 0.94, water: 1.00, hazard: 0.03, dust: 0.45, sky: 'haze' },
  dust:   { label: 'DUST FRONT', icon: 'i-dust', dist: 0.78, water: 1.15, hazard: 0.06, dust: 0.85, sky: 'dust' },
  storm:  { label: 'ASH STORM', icon: 'i-storm', dist: 0.52, water: 1.10, hazard: 0.10, dust: 1.00, sky: 'storm' },
  rain:   { label: 'BLACK RAIN', icon: 'i-rain', dist: 0.82, water: 0.90, hazard: 0.05, dust: 0.30, sky: 'rain' },
  cold:   { label: 'COLD SNAP', icon: 'i-storm', dist: 0.88, water: 0.85, hazard: 0.02, dust: 0.25, sky: 'cold' },
};

export const CHORES = [
  { id: 'scavenge', label: 'Scavenge', sub: '1 water', cost: 'Spends the day. Costs 1 water. Scrap, fuel, and sometimes worse.',
    tooltip: 'Search ruins for scrap and parts. Risk of injury.' },
  { id: 'forage', label: 'Forage', sub: 'free', cost: 'Spends the day. Finds rations and a little water. Risk of injury.',
    tooltip: 'Hunt and gather in the dead land.' },
  { id: 'rest', label: 'Rest', sub: 'heal', cost: 'Spends the day. Heals the crew and steadies morale.',
    tooltip: 'Stop the crawler and let everyone breathe.' },
  { id: 'repair', label: 'Patch', sub: '6 scrap', cost: 'Spends the day. Costs 6 scrap. Restores hull integrity.',
    tooltip: 'Weld, wire, and swear at the Mule.' },
  { id: 'distill', label: 'Distill', sub: '3 fuel', cost: 'Spends the day. Costs 3 fuel. Produces drinkable water.',
    tooltip: 'Run the still on the last of the cells.' },
];

export const LANDMARK_ACTIONS = [
  { id: 'rest', label: 'Rest a day', hint: 'Everyone heals. Morale recovers.' },
  { id: 'talk', label: 'Ask about the road', hint: 'Rumor and rumor-adjacent advice.' },
];

/* Route helper: sector name for a given mile */
export function sectorFor(mile) {
  let current = ROUTE[0];
  for (const stop of ROUTE) if (mile >= stop.mile) current = stop;
  return current;
}

export function nextStop(mile) {
  return ROUTE.find((s) => s.mile > mile) || ROUTE[ROUTE.length - 1];
}
