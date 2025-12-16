const fs = require('fs');
const path = require('path');

// --- Configuration & Constants ---

// The game runs on a grid (assumed 3x3 per side for standard battles)
// Total Units per side = 9.
const GRID_ROWS = 3;
const GRID_COLS = 3;
const TEAM_SIZE = GRID_ROWS * GRID_COLS;

const AVG_COOLDOWN = 5000; // ms
const AVG_UNIT_POWER = 20; // Used for valuing percentage buffs/debuffs

// Effect Value Multipliers (Heuristic)
// Instant Damage/Heal/Shield = 1.0 * Power
const POISON_TOTAL_RATIO = 1.0; // Poison ticks ~10 times for 0.1 power? -> 1.0 Total
const REGEN_TOTAL_RATIO = 1.0; 
const BURN_TOTAL_RATIO = 1.0;

// Valuing Time-Based Buffs/Debuffs (Haste, Slow)
// 1 second of Haste/Slow on an average unit (20 Power, 5s CD -> 4 DPS)
// impacts output by roughly 1 second of production = 4 Value.
const SECONDS_OF_PRODUCTION_VALUE = AVG_UNIT_POWER / (AVG_COOLDOWN / 1000); // 4

// Valuing Power Buffs (increase_power)
// Permanent Increase Power = Infinite value? No, assume combat lasts ~30s.
const COMBAT_DURATION = 30; // seconds
const BUFF_DURATION_MULTIPLIER_PERM = 6; // Equivalent to ~6 casts (30s / 5s)
const BUFF_DURATION_MULTIPLIER_TEMP = 1; // Equivalent to ~1 cast

// Target Counts (Heuristics for maximum potential)
// "random_ally" usually has a 'count' property.
// These are defaults if not specified or for implicit group targets.
const TARGET_COUNTS = {
    "self": 1,
    "trigger": 1,
    "random_ally": 1, 
    "random_enemy": 1,
    "strongest_enemy": 1,
    "weakest_enemy": 1,
    "strongest_ally": 1,
    "weakest_ally": 1,
    "top_ally": 1,
    "bottom_ally": 1,
    "left_ally": 1,
    "right_ally": 1,
    
    // Group Targets
    "row_allies": 2, // 3 in row - self
    "column_allies": 2, // 3 in col - self
    "all_allies": TEAM_SIZE - 1, // 8
    "all_enemies": TEAM_SIZE, // 9
};

// Reaction Source Counts (How many units can trigger this?)
// Excluding Self usually.
const REACTION_SOURCES = {
    "all": TEAM_SIZE * 2 - 1, // Everyone? TriggerSystem usually restricts to friends/foes or all.
    "allies": TEAM_SIZE - 1, // 8
    "enemies": TEAM_SIZE, // 9
    "row_allies": 2,
    "column_allies": 2,
    "top_ally": 1,
    "bottom_ally": 1,
    "left_ally": 1,
    "right_ally": 1
};

// Reaction Frequency (Triggers per second per source unit)
// Based on typical behavior (1 cast per 5s)
const EVENT_FREQUENCY = {
    "damage": 0.2, // ~1 per 5s
    "heal": 0.1,   // Less common
    "shield": 0.1,
    "poison": 0.05,
    "regen": 0.05,
    "slow": 0.05,
    "haste": 0.05,
    "all": 0.3     // 1.5 effects per cast?
};

// --- Analysis Logic ---

function getTargetCount(targetObj) {
    if (!targetObj) return 0;
    // Some targets have explicit count
    if (targetObj.count) return targetObj.count;
    // Fallback to type defaults
    return TARGET_COUNTS[targetObj.id] || 1;
}

function analyzeEffect(effect, ownerPower) {
    let off = 0; // Offensive Power
    let def = 0; // Defensive Power
    
    if (!effect) return { off, def };

    switch (effect.id) {
        // --- Direct Output ---
        case "damage":
            off += ownerPower;
            break;
        case "poison":
            off += ownerPower * POISON_TOTAL_RATIO;
            break;
        case "heal":
            def += ownerPower;
            break;
        case "shield":
            def += ownerPower;
            break;
        case "regen":
            def += ownerPower * REGEN_TOTAL_RATIO;
            break;

        // --- Buffs (Offensive potential) ---
        case "increase_power": {
            const amt = effect.amount || 0;
            const tgts = getTargetCount(effect.targets);
            const durationMult = effect.permanent ? BUFF_DURATION_MULTIPLIER_PERM : BUFF_DURATION_MULTIPLIER_TEMP;
            // Value: Amount * Targets * (Attacks/Sec) * Duration
            // To simplify: We treat 'Amount' as raw damage added per hit.
            // Avg Unit attacks 0.2 times/sec.
            // Contribution over battle = Amount * 0.2 * 30s = Amount * 6.
            // Which matches our durationMult logic roughly.
            off += amt * tgts * durationMult; 
            break;
        }
        case "increase_critical": {
            const amt = effect.amount || 0; // e.g. 5 (percent)
            const tgts = getTargetCount(effect.targets);
            // 5% crit ~ 5% dmg increase?
            // 0.05 * 20 (AvgPower) * 6 (Duration)
            off += (amt / 100 * AVG_UNIT_POWER) * tgts * BUFF_DURATION_MULTIPLIER_PERM;
            break;
        }
        case "multiply_power": {
            const mult = effect.multiplier || 1;
            const tgts = getTargetCount(effect.targets);
            // Increases power by (Mult-1) * Base.
            // (1.5 - 1) * 20 = 10 power added.
            off += ((mult - 1) * AVG_UNIT_POWER) * tgts * BUFF_DURATION_MULTIPLIER_TEMP;
            break;
        }
        case "charge": {
            // Reduces cooldown by Duration.
            // Effectively grants extra time/attacks.
            // Value ~ DurationSeconds * ProductionPerSecond
            const dur = effect.duration || 0;
            const tgts = getTargetCount(effect.targets);
            off += (dur / 1000 * SECONDS_OF_PRODUCTION_VALUE) * tgts;
            break;
        }
        case "haste": {
            const dur = effect.duration || 1000;
            const tgts = getTargetCount(effect.targets);
            off += (dur / 1000 * SECONDS_OF_PRODUCTION_VALUE) * tgts;
            break;
        }
        case "re_hasted": 
             // Reaction specific, usually no inherent value other than trigger?
             break;

        // --- Debuffs (Defensive potential) ---
        case "slow": {
            const dur = effect.duration || 1000;
            const tgts = getTargetCount(effect.targets);
            // Slowing enemy reduces incoming damage. Defensive value.
            def += (dur / 1000 * SECONDS_OF_PRODUCTION_VALUE) * tgts;
            break;
        }
        case "decrease_power": {
            const pct = effect.percentage || 0; // e.g. 10 (percent)
            const tgts = getTargetCount(effect.targets);
            // Reducing enemy power by 10%.
            // 0.10 * 20 * 6 (Perm?)
            const durationMult = effect.permanent ? BUFF_DURATION_MULTIPLIER_PERM : BUFF_DURATION_MULTIPLIER_TEMP;
            def += (pct / 100 * AVG_UNIT_POWER) * tgts * durationMult;
            break;
        }
        
         // --- Other ---
        case "on_crit":
        case "on_battle_start":
             // Triggers for reactions, covered by reaction logic if they have effects.
             break;
    }

    return { off, def };
}

function calculateCardStats(card) {
    const power = card.power || 0;
    const cooldown = card.cooldown || 5000;
    
    // 1. Main Action Analysis
    let mainOff = 0;
    let mainDef = 0;
    
    if (card.effects) {
        card.effects.forEach(e => {
            const val = analyzeEffect(e, power);
            mainOff += val.off;
            mainDef += val.def;
        });
    }
    
    // Convert per-cast value to Value Per Second
    const mainOffPPS = (mainOff / cooldown) * 1000;
    const mainDefPPS = (mainDef / cooldown) * 1000;
    
    // 2. Reaction Analysis
    let reacOffPPS = 0;
    let reacDefPPS = 0;
    
    if (card.reactions) {
        card.reactions.forEach(r => {
            const sources = REACTION_SOURCES[r.position] || 0;
            if (sources === 0) return;
            
            const eventType = r.effectId || "all";
            // Check for specific global reactions that might differ?
            // Assuming standard flow.
            
            const freqPerSource = EVENT_FREQUENCY[eventType] || 0.1;
            const totalTriggersPerSec = sources * freqPerSource;
            
            let rOff = 0;
            let rDef = 0;
            if (r.effects) {
                r.effects.forEach(e => {
                     const val = analyzeEffect(e, power);
                     rOff += val.off;
                     rDef += val.def;
                });
            }
            
            reacOffPPS += rOff * totalTriggersPerSec;
            reacDefPPS += rDef * totalTriggersPerSec;
        });
    }
    
    return {
        name: card.name_en || card.id,
        mainOffPPS, mainDefPPS,
        reacOffPPS, reacDefPPS,
        totalOffPPS: mainOffPPS + reacOffPPS,
        totalDefPPS: mainDefPPS + reacDefPPS,
        totalScore: (mainOffPPS + reacOffPPS) + (mainDefPPS + reacDefPPS)
    };
}

// --- Execution ---

try {
    // Attempt to locate data file
    const dataPath = path.resolve(__dirname, 'phaser/public/assets/data/collections/base/data.json');
    if (!fs.existsSync(dataPath)) {
        throw new Error(`Data file not found at ${dataPath}`);
    }
    
	const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

	console.log(
		`${"Card Name".padEnd(25)} | ` +
		`${"Off(M)".padEnd(8)} | ` +
        `${"Def(M)".padEnd(8)} | ` +
        `${"Off(R)".padEnd(8)} | ` +
        `${"Def(R)".padEnd(8)} | ` +
		`${"Total".padEnd(8)}`
	);
	console.log("-".repeat(80));

	data.cards.forEach(card => {
		const stats = calculateCardStats(card);
		console.log(
			`${stats.name.padEnd(25)} | ` +
			`${stats.mainOffPPS.toFixed(1).padEnd(8)} | ` +
            `${stats.mainDefPPS.toFixed(1).padEnd(8)} | ` +
            `${stats.reacOffPPS.toFixed(1).padEnd(8)} | ` +
            `${stats.reacDefPPS.toFixed(1).padEnd(8)} | ` +
			`${stats.totalScore.toFixed(1).padEnd(8)}`
		);
	});

} catch (e) {
	console.error(`Error: ${e.message}`);
}
