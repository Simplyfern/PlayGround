/* ASH TRAIL — encounter deck */

const has = (g, cost) => {
  for (const [k, v] of Object.entries(cost)) if ((g.s[k] || 0) < v) return false;
  return true;
};
const need = (cost) => (g) => (has(g, cost) ? null : 'Not enough ' + Object.keys(cost).join(' / '));

export const EVENTS = [
  {
    id: 'toll', weight: 10, art: 'raider', kicker: 'ROADBLOCK',
    title: 'The Cinder Toll',
    text: () => `A chain of welded bumpers stretches across the road. Three figures in tire-tread armor sit on the hood of a truck that has not moved in years. The one with the megaphone taps the barrel of a nail gun against her palm.\n\n"Road tax. Thirty-five scrap, or we open the Mule like a can."`,
    choices: [
      { label: 'Pay the toll', hint: '−35 scrap', requires: need({ scrap: 35 }),
        run: (g) => { g.pay({ scrap: 35 }); g.add({ morale: 1 }); return 'The chain drops. The woman counts the scrap twice, then waves you through with two fingers. "Pleasure doing business." Nobody exhales until the roadblock is a smudge behind you.'; } },
      { label: 'Hand over fuel', hint: '−8 fuel', requires: need({ fuel: 8 }),
        run: (g) => { g.pay({ fuel: 8 }); return 'They siphon eight cells straight from the rack and argue about whether that was enough. It was not, but they let you go anyway. The Mule runs a little lighter and a little angrier.'; } },
      { label: 'Run the chain', hint: 'Risky — damage or injury',
        run: (g) => {
          if (g.chance(0.52)) { g.add({ hull: -15 }); g.hurt(10, 'injured'); g.add({ morale: -3 }); return 'You floor it. The chain catches the front axle and screams along the hull before snapping. Something in the wheel well is making a new noise. Behind you, the nail gun talks.'; }
          g.add({ morale: 5 }); g.add({ mile: 6 }); return 'You hit the chain at speed. It snaps like a guitar string and the Cinder crew scatter. Rook is laughing — actually laughing — for the first time in a week.'; } },
      { label: 'Offer water instead', hint: '−12 water', requires: need({ water: 12 }),
        run: (g) => { g.pay({ water: 12 }); return 'The megaphone woman looks at the cans for a long moment, then nods. "Water\'s worth more than scrap out here. Go on." They even lift the chain politely.'; } },
    ],
  },
  {
    id: 'rain', weight: 8, art: 'rain', kicker: 'WEATHER',
    title: 'Something in the Rain',
    text: () => `The sky opens. The rain comes down dark and slick, tasting of the inside of an old battery. It pools in the cracked road and steams where it hits the hot engine. The Mule's catchment tarp is flapping.`,
    choices: [
      { label: 'Spread the tarp, collect runoff', hint: '+12 water · radiation risk',
        run: (g) => {
          g.add({ water: 12 });
          if (g.chance(0.42)) { g.hurt(8, 'rad'); return 'You collect twelve units of water and a dose of something you cannot filter out. By evening, one of the crew has a nosebleed that will not stop.'; }
          return 'The tarp fills faster than you can believe. Twelve units, filtered twice through cloth and charcoal. Dex says it tastes like victory. It tastes like pennies.'; } },
      { label: 'Seal the Mule, drive through', hint: 'Quiet and clean',
        run: (g) => { g.add({ morale: -1 }); return 'You button up the hatches and crawl through the downpour with the wipers fighting a losing war. Nobody drinks anything they did not carry in. Nobody grows a new lump, either.'; } },
      { label: 'Shelter under the overpass', hint: 'Safe · lose a little time',
        run: (g) => { g.add({ fuel: -1, morale: 1, mile: -2 }); return 'You tuck the Mule under a leaning overpass and wait it out. The rain drums on the decking. Imani breaks out the good tea — the last of it — and for an hour nobody talks about Eden.'; } },
    ],
  },
  {
    id: 'drone', weight: 7, art: 'drone', kicker: 'SIGNAL',
    title: 'The Last Broadcast',
    text: () => `A pre-collapse drone wobbles out of the haze and hovers at eye level, trailing a ribbon of dried warning tape. Its speaker crackles.\n\n"GREETINGS, CITIZEN. RECITE THE LOYALTY OATH AND RECEIVE ONE (1) NUTRITIONAL PACKAGE. ONE (1) PACKAGE PER CITIZEN."`,
    choices: [
      { label: 'Recite the oath', hint: '−4 morale · +12 rations',
        run: (g) => { g.add({ food: 12, water: 4, morale: -4 }); return 'You mumble the old words about the shining future. The drone accepts your performance and drops a crate of grey ration bricks. Mara spits. "We just said all that out loud. For this."'; } },
      { label: 'Strip it for parts', hint: '+22 scrap · shock risk',
        run: (g) => {
          if (g.chance(0.4)) { g.add({ scrap: 22, hull: 3 }); g.hurt(7, 'injured'); return 'You get the rotor assembly and most of the battery. The capacitor has other ideas. Someone loses a thumbnail and gains a new vocabulary.'; }
          g.add({ scrap: 22, hull: 3 }); return 'You crack the drone open like a crab. Rotor, battery, a surprising amount of copper. It keeps saying "THANK YOU, CITIZEN" until the last cell dies.'; } },
      { label: 'Wave it off', hint: 'No cost',
        run: (g) => { g.add({ morale: 1 }); return 'You wave. The drone follows for a mile, reciting the oath to nobody, then its rotors seize and it tumbles into the ditch. The future, doing what it does best.'; } },
    ],
  },
  {
    id: 'family', weight: 8, art: 'family', kicker: 'SURVIVORS',
    title: 'The Hollow Family',
    text: () => `A station wagon with no glass idles on the shoulder. A woman and two children are sitting on the roof, holding a hand-painted sign: WATER FOR MEDICINE. The kids are the color of the road.`,
    choices: [
      { label: 'Give them water', hint: '−10 water · +1 meds · morale up', requires: need({ water: 10 }),
        run: (g) => { g.pay({ water: 10 }); g.add({ meds: 1, morale: 8 }); return 'The woman presses a sealed surgical kit into Imani\'s hands before you can refuse. The older kid gives Rook a stone with a hole in it. Rook keeps it. Nobody says much for the next ten miles.'; } },
      { label: 'Trade for medicine', hint: '−30 scrap · +2 meds', requires: need({ scrap: 30 }),
        run: (g) => { g.pay({ scrap: 30 }); g.add({ meds: 2, morale: -1 }); return 'Thirty scrap for two boxes of painkillers. The woman counts the coins three times and does not meet your eyes. It is not charity. It is not robbery either. It is just the road.'; } },
      { label: 'Drive on', hint: 'Keep everything',
        run: (g) => { g.add({ morale: -6 }); return 'You drive on. In the mirror, the sign keeps tilting to follow you. Dex turns the radio up too loud, and nobody asks him to turn it down.'; } },
    ],
  },
  {
    id: 'greenhouse', weight: 7, art: 'greenhouse', kicker: 'RUIN',
    title: 'The Glass Garden',
    text: () => `Half a research greenhouse is still standing, fogged from the inside. Through the glass: rows of tomato plants, thick and red and real. A sealed door. A warning placard bleached almost white.`,
    choices: [
      { label: 'Pry the door open', hint: '+20 rations · injury risk',
        run: (g) => {
          g.add({ food: 20 });
          if (g.chance(0.38)) { g.add({ hull: -3 }); g.hurt(9, 'injured'); return 'The door gives suddenly and a storm of glass comes with it. Twenty units of produce, one bad cut, and a hull panel with a new gap. Worth it. Probably.'; }
          return 'The latch gives with a sound like a knuckle cracking. You fill every container you own with tomatoes, peppers, things with leaves. Nobody speaks for ten minutes. Just chewing.'; } },
      { label: 'Vent it, take what falls', hint: '+11 rations · safe',
        run: (g) => { g.add({ food: 11 }); return 'You crack the vent and shake the vines until eleven units of ripe food drop through. Slower. Uglier. Nobody bleeds. Dex pockets a tomato for later and then eats it immediately.'; } },
      { label: 'Mark it on the map', hint: 'Morale +5',
        run: (g) => { g.add({ morale: 5 }); return 'You paint a red X on the gravel and log the coordinates. Maybe someone else finds it. Maybe someone else needs it. Rook says that is the most Eden thing you have done all week.'; } },
    ],
  },
  {
    id: 'dog', weight: 6, art: 'dog', kicker: 'COMPANY',
    title: 'A Dog, Probably',
    text: () => `Something has been following the Mule for three miles. It is low, ribby, and missing an ear. It has the general shape of a dog. When you stop, it stops. When you look at it, it sits down very carefully.`,
    choices: [
      { label: 'Feed it', hint: '−4 rations · +9 morale',
        run: (g) => {
          g.pay({ food: 4 }); g.add({ morale: 9 });
          if (g.chance(0.35)) { g.add({ scrap: 18 }); return 'It eats like it has never eaten. Then it trots ahead of the Mule and stops at a culvert stuffed with copper wire and pre-war tools. Eighteen scrap, freely given. You have a dog now. You did not decide this.'; }
          return 'It eats like it has never eaten, then curls under the Mule\'s axle. Somebody names it Capacitor. Morale goes up nine points. Nobody wants to discuss what happens if it gets hungry again.'; } },
      { label: 'Chase it off', hint: 'Morale −2',
        run: (g) => { g.add({ morale: -2 }); return 'You throw a bolt at the ditch. It flinches, then keeps following at a slightly greater distance. You have not solved the problem. You have only made it more polite.'; } },
      { label: 'Ignore it', hint: 'Nothing happens. Probably.',
        run: (g) => { g.add({ morale: 2 }); return 'You ignore it. By nightfall it is sleeping against the Mule\'s warm engine block. Nobody has the heart to move it. You now have a dog. This is how these things happen.'; } },
    ],
  },
  {
    id: 'hotzone', weight: 7, art: 'rad', kicker: 'SHORTCUT',
    title: 'The Hot Cut',
    text: () => `An old delivery road cuts straight through a subdivision that was evacuated in a hurry and never repaved. The Geiger counter in the dash starts its polite ticking. The road would save fuel and miles. It would also cook you slowly.`,
    choices: [
      { label: 'Take the cut', hint: '+22 miles · radiation',
        run: (g) => { g.add({ mile: 22, fuel: 4 }); g.hurtAll(5); if (g.chance(0.45)) g.hurt(8, 'rad'); return 'You drive fast with the vents shut. The counter climbs, clicks, settles, climbs. You come out the other side twenty-two miles ahead, four fuel richer, and one of you is already feeling sick in a way that is not carsickness.'; } },
      { label: 'Take the long way', hint: '−6 fuel',
        run: (g) => { g.pay({ fuel: 6 }); return 'You swing wide around the hot zone, burning six extra cells on a detour that smells like hot brakes. The counter stays quiet. So does everyone, for a while.'; } },
      { label: 'Send Rook to scout it', hint: 'Free · gamble',
        run: (g) => {
          if (g.chance(0.55)) { g.add({ mile: 16, fuel: 2, morale: 3 }); return 'Rook comes back in forty minutes with a thumb up and a strip of lead flashing for the floorboards. You take the cut fast and clean. The counter barely twitches.'; }
          g.add({ morale: -3 }); return 'Rook comes back grey-faced and shaking. "Shortcut\'s fine," she says. "The people are still in their houses." You take the long way without being asked.'; } },
    ],
  },
  {
    id: 'convoy', weight: 7, art: 'wreck', kicker: 'WRECK',
    title: 'The Convoy That Didn\'t Make It',
    text: () => `Five military trucks, nose to tail, welded shut by time. The doors are open. Whatever happened here, it happened fast and then it stopped happening a very long time ago.`,
    choices: [
      { label: 'Strip it down', hint: '+30 scrap · +5 fuel · injury risk',
        run: (g) => {
          g.add({ scrap: 30, fuel: 5 });
          if (g.chance(0.4)) { g.hurt(8, 'injured'); g.add({ hull: -2 }); return 'You get thirty scrap and five cells out of the wreck, plus a bad gash from a warped panel. The trucks give up their guts without much complaining.'; }
          return 'Thirty scrap, five cells, a box of actual tools, and one skeleton wearing captain\'s bars that everyone agrees not to talk about. The Mule gets a new spare tire out of the deal.'; } },
      { label: 'Check the medical truck', hint: '+2 meds · morale −4',
        run: (g) => { g.add({ meds: 2, morale: -4 }); return 'The medical truck is full of sealed kits and empty seats. You take two boxes and leave the rest. Imani says a few words over the seats. Nobody joins in, but everyone listens.'; } },
      { label: 'Leave it alone', hint: 'Morale +2',
        run: (g) => { g.add({ morale: 2 }); return 'You give the convoy a wide berth. Rook sketches its position in the log with a little cross beside it. Some things are fuel and some things are not yours.'; } },
    ],
  },
  {
    id: 'medic', weight: 6, art: 'medic', kicker: 'STRANGER',
    title: 'The Wandering Stitch',
    text: () => `A man in a butcher\'s apron waves you down with a prosthetic hand. A folding table is open beside him: forceps, antibiotics, a spool of surgical thread. A hand-painted sign reads I FIX PEOPLE. HE IS NOT CHEAP.`,
    choices: [
      { label: 'Pay for treatment', hint: '−30 scrap · heal crew', requires: need({ scrap: 30 }),
        run: (g) => { g.pay({ scrap: 30 }); g.heal(20); return 'He works fast and quietly, muttering to himself in two languages. Thirty scrap later, everyone walks a little straighter and breathes a little deeper. "The road is long," he says. "Keep the wounds clean."'; } },
      { label: 'Trade water instead', hint: '−10 water · heal a little', requires: need({ water: 10 }),
        run: (g) => { g.pay({ water: 10 }); g.heal(9); g.add({ morale: 2 }); return 'He weighs the water cans, nods, and cleans and stitches what he can. He refuses the last can. "For the next one," he says, which is either kindness or a business model.'; } },
      { label: 'Decline', hint: 'Save supplies',
        run: (g) => { return 'You thank him and roll on. He does not seem surprised. The last thing you see is him opening a fresh kit for nobody in particular.'; } },
    ],
  },
  {
    id: 'cache', weight: 6, art: 'terminal', kicker: 'RUIN',
    title: 'Cache 44',
    text: () => `A server farm, stripped to the bone, except for one rack still humming in the dark. A terminal glows green. The login screen has been replaced with a single line: <em>LEAVE A MESSAGE AFTER THE TONE.</em>`,
    choices: [
      { label: 'Play the messages', hint: 'Morale +7',
        run: (g) => { g.add({ morale: 7 }); return 'There are eleven messages. A man telling his daughter the evacuation is temporary. A woman reading a grocery list. A boy asking if anyone else can hear the humming. Then forty years of silence, and one new message, in your own voice: "We\'re still going."'; } },
      { label: 'Strip the batteries', hint: '+9 fuel · +10 scrap',
        run: (g) => { g.add({ fuel: 9, scrap: 10 }); return 'The rack dies mid-sentence. You take nine good cells and ten scrap of copper bus. The silence afterward is the loudest thing in the building.'; } },
      { label: 'Download the survey maps', hint: '+18 miles next stretch',
        run: (g) => { g.add({ mile: 18, morale: 2 }); return 'The maps are forty years old and mostly wrong, but they show a service road the ash has not swallowed yet. You take it and make eighteen miles before the sun drops.'; } },
    ],
  },
  {
    id: 'choir', weight: 6, art: 'cult', kicker: 'THE CHOIR',
    title: 'Song at the Crossing',
    text: () => `Robed figures stand across the road, humming in a chord that makes the fillings in your teeth ache. They do not carry weapons. They carry a ledger. The eldest holds out a pen.\n\n"A name for the wall," she says. "Everyone who passes gives one. Then you may pass."`,
    choices: [
      { label: 'Give them a name', hint: '−1 morale? · +8 rations',
        run: (g) => { g.add({ food: 8, morale: -2 }); return 'You write the name of someone you left behind. The elder reads it aloud, and the Choir holds the note until the air tastes like static. They give you eight units of food. You do not feel like you earned it.'; } },
      { label: 'Trade with them', hint: '−20 scrap · +12 rations · +6 water', requires: need({ scrap: 20 }),
        run: (g) => { g.pay({ scrap: 20 }); g.add({ food: 12, water: 6, morale: 2 }); return 'The ledger closes. The Choir trades dried vegetables and clean water at a price that is not a price but a donation, and they sing you out of the crossing like a door closing gently.'; } },
      { label: 'Drive around the field', hint: '−5 hull · −2 morale',
        run: (g) => { g.add({ hull: -5, morale: -2 }); return 'You put the Mule through the field. The crosses lean away from the wheels. The Choir keeps singing, unbothered, and the sound follows you for a mile before the wind takes it.'; } },
    ],
  },
  {
    id: 'bridge', weight: 6, art: 'bridge', kicker: 'TERRAIN',
    title: 'The Fallen Span',
    text: () => `A highway bridge has dropped its middle third into a dry riverbed. The gap is fourteen feet. On the far side the road is clear for miles. On this side there is a detour that adds half a day and eats fuel.`,
    choices: [
      { label: 'Jump the gap', hint: 'Risky · shortcut',
        run: (g) => {
          if (g.chance(0.55)) { g.add({ mile: 15, morale: 6 }); return 'You back up, say something that is not quite a prayer, and hit the gap at forty. For a moment the Mule is airborne and everyone is screaming. Then the far lip catches both front tires and you are across.'; }
          g.add({ hull: -18, morale: -4 }); g.hurt(8, 'injured'); return 'The front end comes down hard on the far lip. Metal folds. Someone\'s head meets the roll bar. You are across, technically, with a hull that will never be straight again.'; } },
      { label: 'Take the detour', hint: '−7 fuel',
        run: (g) => { g.pay({ fuel: 7 }); return 'You take the long way through the riverbed, crawling over gravel and old shopping carts. Seven cells gone, but the Mule comes out the other side intact and nobody has to be brave.'; } },
      { label: 'Plate the gap with scrap', hint: '−12 scrap · safe crossing',
        run: (g) => { g.pay({ scrap: 12, hull: -1 }); g.add({ mile: 12, morale: 2 }); return 'You cut fencing and bolt it over the gap with Mara swearing in three languages. It holds. Barely. Twelve scrap and one long afternoon, and you are across with the hull still more or less hull-shaped.'; } },
    ],
  },
  {
    id: 'sniper', weight: 6, art: 'raider', kicker: 'AMBUSH',
    title: 'The Overpass',
    text: () => `A shot cracks off the road twenty feet ahead. Then another, closer. There is a figure on the overpass with a scoped rifle and all the time in the world. A voice rolls down through a hand-cranked loudspeaker: "TOLL."`,
    choices: [
      { label: 'Floor it', hint: '−8 hull · injury risk',
        run: (g) => {
          g.add({ hull: -8, morale: 2 });
          if (g.chance(0.35)) { g.hurt(14, 'injured'); return 'You floor it. A round punches through the cargo box and out the other side, close enough to make someone scream. You are through. The Mule has a new hole with daylight in it.'; }
          return 'You floor it. The shots go wide, then behind, then nowhere. Rook hangs out the window and gives the overpass a gesture that is not in any survival manual.'; } },
      { label: 'Throw out scrap', hint: '−25 scrap', requires: need({ scrap: 25 }),
        run: (g) => { g.pay({ scrap: 25 }); g.add({ morale: -3 }); return 'You push twenty-five scrap into the road and roll forward slowly. The rifle follows you until you are out of range. Nobody speaks. The toll was cheap. It still feels expensive.'; } },
      { label: 'Wait for dark', hint: 'Lose time · safe',
        run: (g) => { g.add({ fuel: -2, mile: -3, morale: -2 }); return 'You kill the engine and wait. The sniper waits too. Four hours later the light goes and so does the figure. You drive on with the headlights off, which is its own kind of gamble, and make it.'; } },
    ],
  },
  {
    id: 'shrine', weight: 5, art: 'shrine', kicker: 'ROADSIDE',
    title: 'A Shrine of Useful Things',
    text: () => `Someone has built a shrine out of the road\'s dead: mirrors, baby shoes, a motorcycle, forty thousand bottle caps. In the middle, a plastic saint with a solar panel for a halo. Offerings are piled at her feet — batteries, canned food, a good knife.`,
    choices: [
      { label: 'Leave an offering', hint: '−10 scrap · morale +6', requires: need({ scrap: 10 }),
        run: (g) => { g.pay({ scrap: 10 }); g.add({ morale: 6 }); return 'You leave ten scrap and a dead lighter. The saint\'s halo flickers once, weakly, then steadies. It is probably the sun. Everyone feels better anyway.'; } },
      { label: 'Take the offerings', hint: '+26 scrap · +3 rations · morale −7',
        run: (g) => { g.add({ scrap: 26, food: 3, morale: -7 }); return 'You take the batteries and the knife and the cans. The halo flickers. Nobody looks at the saint on the way back to the Mule. The road feels a little colder for the next few miles.'; } },
      { label: 'Add a name to the wall', hint: 'Morale +3',
        run: (g) => { g.add({ morale: 3 }); return 'You scratch a name into the mirror glass with a screwdriver. It joins a hundred others. It is not much of a memorial, but it is the only one this road is offering.'; } },
    ],
  },
  {
    id: 'fever', weight: 7, art: 'medic', kicker: 'CREW',
    title: 'Fever',
    text: (g) => {
      const p = g.pickAlive();
      g.lastFever = p ? p.id : null;
      return `${p ? p.name : 'Someone'} wakes up burning and cannot keep water down. By noon the fever has a rhythm to it, and the rest of the crew is giving ${p ? p.name.split(' ')[0] : 'them'} a lot of room.`;
    },
    choices: [
      { label: 'Use medicine', hint: '−1 meds · fast recovery', requires: (g) => (g.s.meds >= 1 ? null : 'No medicine left'),
        run: (g) => {
          const p = g.byId(g.lastFever) || g.pickAlive();
          g.pay({ meds: 1 });
          if (p) { g.heal(26, p); p.status = 'ok'; }
          return `${p ? p.name : 'The patient'} takes the pills and sleeps for sixteen hours. The fever breaks sometime before dawn. Imani sits with them the whole time and does not mention that we only had three doses left.`;
        } },
      { label: 'Quarantine them', hint: 'Slow recovery · morale −2',
        run: (g) => {
          const p = g.byId(g.lastFever) || g.pickAlive();
          if (p) { g.hurt(10, 'sick', p); }
          g.add({ morale: -2 });
          return `${p ? p.name : 'The patient'} rides in the back with a tarp for a door. The fever burns itself down over two days. Nobody else gets sick. Nobody visits, either.`;
        } },
      { label: 'Push through it', hint: 'Harsh · morale −4',
        run: (g) => {
          const p = g.byId(g.lastFever) || g.pickAlive();
          if (p) { g.hurt(17, 'sick', p); }
          g.add({ morale: -4 });
          return `You keep driving. ${p ? p.name.split(' ')[0] : 'They'} sweats through the seat and refuses to be looked at. The fever passes. Something in the way the crew looks at you does not.`;
        } },
    ],
  },
  {
    id: 'ferry', weight: 5, art: 'water', kicker: 'CROSSING',
    title: 'The Ferryman',
    text: () => `The river is not water. It is a slow green chemical soup that hisses where it touches the bank. A man with a flat-bottomed raft and a hand winch offers to take the Mule across. "Price is price," he says. "You can swim instead."`,
    choices: [
      { label: 'Pay the ferryman', hint: '−30 scrap', requires: need({ scrap: 30 }),
        run: (g) => { g.pay({ scrap: 30 }); g.add({ morale: 1 }); return 'The raft groans and the winch screams, but the Mule crosses dry. The ferryman counts his scrap and points at the far bank. "Eden\'s that way. Probably."'; } },
      { label: 'Fuel his winch', hint: '−10 fuel',
        run: (g) => { g.pay({ fuel: 10 }); return 'You give him ten cells for the winch motor. He spends five and keeps five, which everyone understands is the actual toll. The crossing is slow, loud, and dry.'; } },
      { label: 'Ford the river', hint: 'Hull and health damage',
        run: (g) => {
          g.add({ hull: -13, morale: -3 }); g.hurtAll(6);
          if (g.chance(0.4)) g.hurt(9, 'rad');
          return 'The Mule goes in green and comes out grey. The chemical soup finds every seam. Everyone who had to get out and push has a rash by morning, and the undercarriage will never stop smelling like a battery fire.'; } },
    ],
  },
  {
    id: 'trader', weight: 6, art: 'water', kicker: 'SUPPLY',
    title: 'Water, Cheap',
    text: () => `A tanker truck with a hand-painted sign: CLEAN. DEFINITELY CLEAN. The driver is sweating despite the cold and keeps looking at the horizon. The hose is already out.`,
    choices: [
      { label: 'Buy a full load', hint: '−22 scrap · +30 water', requires: need({ scrap: 22 }),
        run: (g) => { g.pay({ scrap: 22 }); g.add({ water: 30 }); return 'Thirty units, straight from the tank, filtered through your own cloth anyway. The driver takes the scrap and leaves before you can ask where he got it. It is wet. That will have to do.'; } },
      { label: 'Buy a half load', hint: '−12 scrap · +15 water', requires: need({ scrap: 12 }),
        run: (g) => { g.pay({ scrap: 12 }); g.add({ water: 15 }); return 'Fifteen units and a conversation about the weather that lasts exactly as long as the transfer. He is gone before the hose is coiled.'; } },
      { label: 'Take the truck', hint: '+40 water · morale −10 · risk',
        run: (g) => {
          g.add({ water: 40, scrap: 10, morale: -10 });
          if (g.chance(0.5)) { g.hurt(10, 'injured'); return 'You take the truck. The driver runs. Someone else comes running back with a pipe. You get forty units of water, ten scrap, and a cracked rib. The water tastes like winning, which is to say it tastes like blood.'; }
          return 'You take the truck, and the driver lets you, which is somehow worse. Forty units of water and ten scrap. Nobody drinks for a while. Then everyone drinks, because thirst has no morals either.'; } },
    ],
  },
  {
    id: 'signal', weight: 5, art: 'signal', kicker: 'SIGNAL',
    title: 'Eden-9, Maybe',
    text: () => `The radio finds a voice in the static: a woman, calm, reading coordinates on a loop. "Eden-9 perimeter. Clean water. Shelter. Come in on the east road. There is room." Then the loop starts again. It could be real. It could be a recording. It could be bait.`,
    choices: [
      { label: 'Listen all night', hint: '+7 morale · −2 water',
        run: (g) => { g.add({ morale: 7, water: -2 }); return 'You sit in the dark and let her talk. The coordinates match nothing on your map, which Imani says is a good sign. For the first time in weeks, everyone sleeps without being asked twice.'; } },
      { label: 'Answer the signal', hint: '+8 morale · may draw attention',
        run: (g) => {
          g.add({ morale: 8 });
          if (g.chance(0.35)) { g.add({ hull: -9, morale: -4 }); return 'You key the mic. A voice answers immediately — too immediately. Nothing follows but engine noise on the horizon and a long hour of driving with the lights off. Morale takes the hit after the adrenaline wears off.'; }
          return 'You key the mic. The woman pauses, then says your call sign back to you. "East road. Four days. We\'ll leave the gate open." The crew cheers loud enough to wake the dead, who do not complain.'; } },
      { label: 'Save the batteries', hint: '+3 fuel · morale −2',
        run: (g) => { g.add({ fuel: 3, morale: -2 }); return 'You pull the cells and the voice dies mid-word. Three units of fuel is three units of fuel. Rook says she will remember the coordinates. Nobody asks her to repeat them.'; } },
    ],
  },
  {
    id: 'breakdown', weight: 7, art: 'wreck', kicker: 'THE MULE',
    title: 'The Mule Is Angry',
    text: () => `Something lets go in the drivetrain with a sound like a dropped toolbox. The Mule coasts to a stop, shudders, and refuses to start. Mara is already under it with a flashlight in her teeth.`,
    choices: [
      { label: 'Weld it properly', hint: '−8 scrap · +16 hull', requires: need({ scrap: 8 }),
        run: (g) => { g.pay({ scrap: 8 }); g.add({ hull: 16 }); return 'Mara cuts, welds, and hits something with a hammer until it agrees with her. Eight scrap and two hours. The Mule starts on the first try and sounds almost apologetic.'; } },
      { label: 'Cannibalize cargo', hint: '−7 rations · +11 hull',
        run: (g) => { g.pay({ food: 7 }); g.add({ hull: 11, morale: -2 }); return 'You cut the seat rails out of the cargo box and bolt them into the drivetrain. It holds. Seven units of food are gone, traded for metal that used to hold food. Mara calls this "logistics."'; } },
      { label: 'Beat it until it works', hint: 'Hull −9 · free',
        run: (g) => { g.add({ hull: -9, morale: -3 }); return 'You hit the starter housing with a wrench until the engine catches. It catches. It also leaks something new, and the noise it makes now has a personality. Mara says that is fine. Mara is lying.'; } },
    ],
  },
];

export const AMBIENT = [
  'Mile markers every quarter-mile, all of them wrong.',
  'A billboard advertising a soft drink that no longer exists.',
  'The road crew left their equipment. The road crew left everything.',
  'Someone has painted a door on a concrete wall. It is very convincing.',
  'A flock of something circles the same patch of sky for an hour.',
  'The radio plays three seconds of a song, then nothing, then three seconds again.',
  'Wind through a fence sounds like breathing until you stop noticing it.',
  'A child\'s shoe on the center line. One shoe. Always one.',
  'The horizon is closer than it was this morning.',
  'A car passed you in the other direction. Neither driver waved.',
  'Static, then a voice counting down from forty. It reaches nine and stops.',
  'The sun is the color of an old bruise today.',
];

export const ROAD_RUMORS = [
  '"Past the basin the dust gets in your teeth and stays there. Filter twice."',
  '"The Choir don\'t rob you. That\'s the problem. You rob yourself."',
  '"Static Mesa talks to itself all night. Don\'t answer it."',
  '"If you see a clean coat before Eden, run. Nobody out here has a clean coat."',
  '"The Mule\'s a good rig. Keep her fed and she\'ll outlive you."',
  '"Water first. Always water first. You can walk hungry."',
  '"There\'s a greenhouse off the old service road. Red things growing in it. I didn\'t stop."',
  '"Eden-9 is real. My brother\'s second cousin is there. Or was. Or something."',
];
