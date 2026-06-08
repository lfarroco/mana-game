import * as ReplayManagement from "@Core/ReplayManagement";
import * as SessionManagement from "@Core/SessionManagement";
import * as SessionTransitions from "@Core/SessionTransitions";
import * as Types from "@Core/Types";
import * as BaseCollection from "@Data/BaseCollection";
import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";

const BOARD_WIDTH = 3;
const BOARD_HEIGHT = 3;

Card.registerCollection(BaseCollection.BASE_COLLECTION_DATA);

export type LlmPlayerServiceConfig = {
	playerId: string;
	selectedCrystalId: string;
	initialSeed?: string;
	clientVersion?: string;
	runId?: string;
};

export type BoardMove = {
	unitId: string;
	x: number;
	y: number;
};

export type LlmBoardUnit = {
	unitId: string;
	cardId: string;
	isCore: boolean;
	rank: number;
	position: { x: number; y: number };
	power: number;
	bonusPower: number;
	life: number;
	maxLife: number;
	shield: number;
	cooldown: number;
	critical: number;
	evade: number;
	effects: string[];
	reactions: Array<{
		trigger: string;
		position: string;
		effects: string[];
	}>;
};

export type LlmBoardCell = {
	x: number;
	y: number;
	occupant: Pick<LlmBoardUnit, "unitId" | "cardId" | "isCore" | "rank"> | null;
};

export type LlmBoardView = {
	width: number;
	height: number;
	units: LlmBoardUnit[];
	cells: LlmBoardCell[];
};

export type LlmCardDetails = {
	id: string;
	pic: string;
	isCore: boolean;
	rank: number;
	power: number;
	life: number;
	cooldown: number;
	critical: number;
	reflect: number;
	effects: string[];
	reactions: Array<{
		trigger: string;
		position: string;
		effects: string[];
	}>;
};

export type LlmChoiceOption = {
	index: number;
	id: string;
	label?: string;
	cost?: number;
	cardDetails?: LlmCardDetails;
};

export type LlmChoicesView = {
	phase: Types.SessionData["phase"];
	round: number;
	step: number;
	wins: number;
	losses: number;
	options: LlmChoiceOption[];
};

export type LlmStateView = {
	board: LlmBoardView;
	choices: LlmChoicesView;
	snapshot: Types.ReplaySnapshot;
	actionCount: number;
};

export type LlmChoiceResult = {
	selectedActionId: string;
	state: LlmStateView;
	manifest: Types.RunManifest;
};

export type LlmPlayerService = {
	viewBoard(): LlmBoardView;
	viewChoices(): LlmChoicesView;
	viewCardDetails(cardId: string): LlmCardDetails;
	arrangeBoard(moves: BoardMove[]): LlmBoardView;
	makeChoice(selection: number | string, payload?: Types.Action): LlmChoiceResult;
	viewState(): LlmStateView;
	buildRunManifest(): Types.RunManifest;
	getSession(): Types.SessionData;
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const serializeReactions = (reactions: Unit.Unit["reactions"]): LlmCardDetails["reactions"] =>
	reactions.map((reaction) => ({
		trigger: reaction.effectId,
		position: reaction.position,
		effects: reaction.effects.map((effect) => effect.id),
	}));

const serializeBoardUnit = (unit: Unit.Unit): LlmBoardUnit => ({
	unitId: unit.id,
	cardId: unit.cardId,
	isCore: unit.isCore,
	rank: unit.rank,
	position: { x: unit.position.x, y: unit.position.y },
	power: unit.power,
	bonusPower: unit.bonusPower,
	life: unit.life,
	maxLife: unit.maxLife,
	shield: unit.shield,
	cooldown: unit.cooldown,
	critical: unit.critical || 0,
	evade: unit.evade,
	effects: unit.effects.map((effect) => effect.id),
	reactions: serializeReactions(unit.reactions),
});

const serializeCardDetails = (cardId: string): LlmCardDetails => {
	if (!Card.hasCardDefinition(cardId)) {
		throw new Error(`Card ${cardId} is not registered`);
	}

	const card = Card.getCardDefinition(cardId);
	return {
		id: card.id,
		pic: card.pic,
		isCore: !!card.isCore,
		rank: card.rank || 1,
		power: card.power || 0,
		life: card.life || 0,
		cooldown: card.cooldown,
		critical: card.critical || 0,
		reflect: card.reflect || 0,
		effects: (card.effects || []).map((effect) => effect.id),
		reactions: serializeReactions(card.reactions || []),
	};
};

const createBoardCells = (units: Unit.Unit[]): LlmBoardCell[] => {
	const cells: LlmBoardCell[] = [];

	for (let y = 0; y < BOARD_HEIGHT; y++) {
		for (let x = 0; x < BOARD_WIDTH; x++) {
			const occupant = units.find((unit) => unit.position.x === x && unit.position.y === y);
			cells.push({
				x,
				y,
				occupant: occupant
					? {
						unitId: occupant.id,
						cardId: occupant.cardId,
						isCore: occupant.isCore,
						rank: occupant.rank,
					}
					: null,
			});
		}
	}

	return cells;
};

const viewBoardFromSession = (session: Types.SessionData): LlmBoardView => {
	const sortedUnits = [...session.team.units].sort((left, right) => {
		if (left.position.y !== right.position.y) {
			return left.position.y - right.position.y;
		}
		return left.position.x - right.position.x;
	});

	return {
		width: BOARD_WIDTH,
		height: BOARD_HEIGHT,
		units: sortedUnits.map(serializeBoardUnit),
		cells: createBoardCells(sortedUnits),
	};
};

const viewChoicesFromSession = (session: Types.SessionData): LlmChoicesView => {
	const options = session.current_options;

	return {
		phase: session.phase,
		round: session.round,
		step: session.step,
		wins: session.wins,
		losses: session.losses,
		options: options.map((option, index) => ({
			index: index + 1,
			id: option.id,
			...("label" in option ? { label: option.label } : {}),
			...("cost" in option ? { cost: option.cost } : {}),
			...(Card.hasCardDefinition(option.id)
				? { cardDetails: serializeCardDetails(option.id) }
				: {}),
		})),
	};
};

const resolveChoice = (session: Types.SessionData, selection: number | string): Types.PhaseOption => {
	const options = session.current_options;

	if (typeof selection === "number") {
		const option = options[selection - 1];
		if (!option) {
			throw new Error(`Choice index ${selection} is out of range for ${options.length} options`);
		}
		return option;
	}

	const option = options.find((currentOption) => currentOption.id === selection);
	if (!option) {
		throw new Error(`Choice ${selection} is not available in the current phase`);
	}

	return option;
};

const assertBoardMoveInputs = (moves: BoardMove[], units: Unit.Unit[]): void => {
	const unitIds = new Set(units.map((unit) => unit.id));
	const movedIds = new Set<string>();

	for (const move of moves) {
		if (!unitIds.has(move.unitId)) {
			throw new Error(`Unit ${move.unitId} is not on the player board`);
		}

		if (movedIds.has(move.unitId)) {
			throw new Error(`Unit ${move.unitId} was moved more than once in the same request`);
		}

		if (move.x < 0 || move.x >= BOARD_WIDTH || move.y < 0 || move.y >= BOARD_HEIGHT) {
			throw new Error(`Board position (${move.x},${move.y}) is outside the ${BOARD_WIDTH}x${BOARD_HEIGHT} board`);
		}

		movedIds.add(move.unitId);
	}
};

const buildArrangedTeam = (session: Types.SessionData, moves: BoardMove[]): { units: Unit.Unit[] } => {
	assertBoardMoveInputs(moves, session.team.units);

	const movesByUnitId = new Map(moves.map((move) => [move.unitId, move]));
	const arrangedUnits = session.team.units.map((unit) => {
		const move = movesByUnitId.get(unit.id);
		if (!move) {
			return cloneValue(unit);
		}

		return {
			...cloneValue(unit),
			position: { x: move.x, y: move.y },
		};
	});

	const occupiedPositions = new Set<string>();
	for (const unit of arrangedUnits) {
		const key = `${unit.position.x},${unit.position.y}`;
		if (occupiedPositions.has(key)) {
			throw new Error(`Board position (${unit.position.x},${unit.position.y}) is occupied by multiple units`);
		}
		occupiedPositions.add(key);
	}

	const { team, valid } = SessionManagement.updateTeamAction(session, { units: arrangedUnits });
	if (!valid) {
		throw new Error("Board arrangement was rejected by team validation");
	}

	return team;
};

const createManifest = (
	config: LlmPlayerServiceConfig,
	initialSeed: string,
): Types.RunManifest => ({
	runId: config.runId || `llm-run-${config.playerId}-${initialSeed}`,
	playerId: config.playerId,
	selectedCrystalId: config.selectedCrystalId,
	initialSeed,
	clientVersion: config.clientVersion || "llm-player-service",
	actions: [],
});

export function createLlmPlayerService(config: LlmPlayerServiceConfig): LlmPlayerService {
	let session = SessionManagement.createInitialSession(
		config.playerId,
		config.selectedCrystalId,
		config.initialSeed
	);
	let manifest = createManifest(config, session.initial_seed);

	const buildState = (): LlmStateView => ({
		board: viewBoardFromSession(session),
		choices: viewChoicesFromSession(session),
		snapshot: ReplayManagement.buildReplaySnapshot(session),
		actionCount: manifest.actions.length,
	});

	return {
		viewBoard(): LlmBoardView {
			return viewBoardFromSession(session);
		},

		viewChoices(): LlmChoicesView {
			return viewChoicesFromSession(session);
		},

		viewCardDetails(cardId: string): LlmCardDetails {
			return serializeCardDetails(cardId);
		},

		arrangeBoard(moves: BoardMove[]): LlmBoardView {
			session = {
				...session,
				team: buildArrangedTeam(session, moves),
			};

			return viewBoardFromSession(session);
		},

		makeChoice(selection: number | string, action: Types.Action): LlmChoiceResult {
			const selectedOption = resolveChoice(session, selection);
			const nextAction = {
				sequence: manifest.actions.length + 1,
				action,
				teamSnapshot: cloneValue(session.team),
			};

			manifest = {
				...manifest,
				actions: [
					...manifest.actions,
					nextAction,
				],
			};

			session = SessionTransitions.transitionToNextState(session, action).session;

			return {
				selectedActionId: selectedOption.id,
				state: buildState(),
				manifest: cloneValue(manifest),
			};
		},

		viewState(): LlmStateView {
			return buildState();
		},

		buildRunManifest(): Types.RunManifest {
			return cloneValue(manifest);
		},

		getSession(): Types.SessionData {
			return cloneValue(session);
		},
	};
}