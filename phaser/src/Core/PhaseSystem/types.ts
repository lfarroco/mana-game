import { ActionPayload, PhaseOption, PhaseType, SessionData } from "@Core/Types";

/**
 * Interface representing the context for a phase transition or action.
 * This provides all necessary state to determine the next state.
 */
export interface PhaseTransitionContext {
	/** Current session state */
	session: SessionData;
	/** ID of the action being performed */
	actionId: string;
	/** Optional payload associated with the action */
	payload?: ActionPayload;
}

/**
 * Result of a phase transition.
 * Describes how the session state should be updated.
 */
export interface PhaseTransitionResult {
	/** The next phase the game should enter */
	nextPhase: PhaseType;
	/** Options available in the next phase */
	nextOptions: PhaseOption[];
	/** Amount to increment the step counter (default: 0) */
	stepIncrement?: number;
	/** Amount to increment the round counter (default: 0) */
	roundIncrement?: number;
	/** Any special data to store/return (e.g. combat state) */
	specialData?: Record<string, any>;
}

/**
 * Categorization of actions to determine flow control.
 */
export enum ActionType {
	/** Advances to a new phase */
	PHASE_TRANSITION = "phase_transition",
	/** Stays in current phase (e.g., discarding a unit) */
	META_ACTION = "meta_action",
	/** Stays in sub-phase logic (e.g., applying an orb) */
	SUB_PHASE = "sub_phase",
	/** Skips the current phase entirely */
	PHASE_SKIP = "phase_skip",
}

/**
 * Validation result object.
 */
export interface ValidationResult {
	/** Whether the action/transition is valid */
	valid: boolean;
	/** List of error messages if invalid */
	errors: string[];
	/** List of warning messages (non-blocking) */
	warnings?: string[];
}

/**
 * Interface for handling logic specific to a phase.
 */
export interface PhaseHandler {
	/** The phase this handler is responsible for */
	readonly phase: PhaseType;
	/** The type of actions this handler primarily deals with */
	readonly actionType: ActionType;

	/**
	 * Checks if this handler can handle the given transition context.
	 */
	canHandle(context: PhaseTransitionContext): boolean;

	/**
	 * Executes the transition logic.
	 */
	transition(context: PhaseTransitionContext): PhaseTransitionResult;

	/**
	 * Validates if the action in the context is legal for this handler.
	 */
	validateAction(context: PhaseTransitionContext): ValidationResult;
}

/**
 * Metadata stored in the action registry.
 */
export interface ActionMetadata {
	/** The type of this action */
	type: ActionType;
	/** Phase this action transitions from (if applicable) */
	fromPhase?: PhaseType;
	/** Phase this action transitions to (if applicable) */
	toPhase?: PhaseType;
	/** Description for debugging/docs */
	description?: string;
}
