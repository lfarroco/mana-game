const fs = require('fs');
const path = require('path');

// Constants
const AVG_GLOBAL_COOLDOWN = 5000; // ms
const POTENTIAL_TRIGGER_RATE = 1000 / 4000; // triggers per second (0.25)
const MAX_SOURCES = {
	"row_allies": 2, "column_allies": 2, "allies": 8, "enemies": 9,
	"all_allies": 8, "all_enemies": 9, "random_ally": 8, "random_enemy": 9,
	"self": 0, "top_ally": 1, "bottom_ally": 1, "left_ally": 1, "right_ally": 1, "trigger": 1
};

// Effect Categories
const INSTANT_EFFECTS = ["damage", "heal", "shield"];
const PERIODIC_EFFECTS = ["poison", "regen"];
const DAMAGE_EFFECTS = ["damage", "poison"];

function getEffectCounts(effects) {
	let instant = 0;
	let periodic = 0;
	if (effects) {
		effects.forEach(eff => {
			if (INSTANT_EFFECTS.includes(eff.id)) instant++;
			if (PERIODIC_EFFECTS.includes(eff.id)) periodic++;
		});
	}
	return { instant, periodic };
}

function simulate(card, durationSeconds) {
	const power = card.power || 0;
	let cooldown = card.cooldown || 5000;
	if (cooldown <= 0) cooldown = 5000;

	let totalValue = 0;
	let periodicValuePerSec = 0;

	// 1. Setup Main Ability Events
	const mainEffects = getEffectCounts(card.effects);
	// Casts happen at: cooldown, 2*cooldown, ... (assuming start at 0 is "wait for cooldown")
	// Let's assume first cast is at T=Cooldown for 'sustainable' view.

	// 2. Setup Reaction Events
	// Reaction Trigger Interval = AVG_GLOBAL_COOLDOWN / NumSources
	const reactionEvents = [];
	if (card.reactions) {
		card.reactions.forEach(r => {
			const counts = getEffectCounts(r.effects);
			if (counts.instant === 0 && counts.periodic === 0) return;

			const position = r.position || "allies";
			const sources = MAX_SOURCES[position] || 0;
			if (sources === 0) return;

			const interval = AVG_GLOBAL_COOLDOWN / sources;
			reactionEvents.push({
				interval: interval,
				instant: counts.instant,
				periodic: counts.periodic
			});
		});
	}

	// Simulation Loop (Resolution: 100ms for better granularity than 1s)
	let nextMainCast = cooldown;
	// Track next time for each reaction type
	reactionEvents.forEach(r => r.nextTime = r.interval);

	for (let t = 100; t <= durationSeconds * 1000; t += 100) {
		// A. Apply periodic damage (10% of accumulated periodic effects)
		// Periodic damage is usually "per second". We adding 1/10th of it every 100ms? 
		// Or simpler: just add full value every 1000ms.
		if (t % 1000 === 0) {
			totalValue += periodicValuePerSec;
		}

		// B. Main Cast
		if (t >= nextMainCast) {
			totalValue += mainEffects.instant * power;
			// Add a stack of periodic effect. 
			// Each stack contributes Power * 0.1 per second.
			periodicValuePerSec += mainEffects.periodic * (power * 0.1);
			nextMainCast += cooldown;
		}

		// C. Reactions
		reactionEvents.forEach(r => {
			if (t >= r.nextTime) {
				totalValue += r.instant * power;
				periodicValuePerSec += r.periodic * (power * 0.1);
				r.nextTime += r.interval;
			}
		});
	}

	return totalValue / durationSeconds;
}

function calculateDps(card) {
	const power = card.power || 0;
	let cooldown = card.cooldown || 5000;
	if (cooldown <= 0) cooldown = 5000;

	// 1. Base DPS (Instant Main Only)
	const mainEffects = getEffectCounts(card.effects);
	const triggersPerSec = 1000 / cooldown;
	const baseDps = mainEffects.instant * power * triggersPerSec;

	// 2. Potential DPS (Heuristic: Damage/Poison only, max haste, max reactions)
	// Legacy heuristic calculation for reference
	let potDamageInstances = 0;
	if (card.effects) {
		card.effects.forEach(eff => {
			if (DAMAGE_EFFECTS.includes(eff.id)) potDamageInstances++;
		});
	}
	const potBaseDps = potDamageInstances * power * triggersPerSec;
	const potWithHaste = potBaseDps * 2;

	let reactionDps = 0;
	if (card.reactions) {
		card.reactions.forEach(reaction => {
			let dmgInstances = 0;
			if (reaction.effects) {
				reaction.effects.forEach(eff => {
					if (DAMAGE_EFFECTS.includes(eff.id)) dmgInstances++;
				});
			}
			if (dmgInstances > 0) {
				const position = reaction.position || "allies";
				const numSources = MAX_SOURCES[position] || 1;
				reactionDps += (power * dmgInstances) * (numSources * POTENTIAL_TRIGGER_RATE);
			}
		});
	}
	const potentialDps = potWithHaste + reactionDps;

	// 3. Time Windows (Simulated with Reactions)
	const dps10 = simulate(card, 10);
	const dps20 = simulate(card, 20);
	const dps30 = simulate(card, 30);

	return { baseDps, potentialDps, dps10, dps20, dps30 };
}

try {
	const dataPath = path.join(__dirname, 'phaser/public/assets/data/collections/base/data.json');
	const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

	console.log(
		`${"Card Name".padEnd(25)} | ` +
		`${"Base".padEnd(8)} | ` +
		`${"10s".padEnd(8)} | ` +
		`${"20s".padEnd(8)} | ` +
		`${"30s".padEnd(8)} | ` +
		`${"Potential".padEnd(10)}`
	);
	console.log("-".repeat(85));

	data.cards.forEach(card => {
		const stats = calculateDps(card);
		const name = card.name_en || card.id;

		console.log(
			`${name.padEnd(25)} | ` +
			`${stats.baseDps.toFixed(2).padEnd(8)} | ` +
			`${stats.dps10.toFixed(2).padEnd(8)} | ` +
			`${stats.dps20.toFixed(2).padEnd(8)} | ` +
			`${stats.dps30.toFixed(2).padEnd(8)} | ` +
			`${stats.potentialDps.toFixed(2).padEnd(10)}`
		);
	});

} catch (e) {
	console.error(`Error: ${e.message}`);
}
