import { PhaseType } from "../Types";
import { PhaseHandler, PhaseTransitionContext, PhaseTransitionResult, ActionType, ValidationResult } from "./types";
import { phaseValidator } from "./PhaseValidator";

export abstract class BasePhaseHandler implements PhaseHandler {
	abstract readonly phase: PhaseType;
	abstract readonly actionType: ActionType;

	/**
	 * Main transition method. 
	 * Orchestrates validation, execution, and result construction.
	 */
	public transition(context: PhaseTransitionContext): PhaseTransitionResult {
		// 1. Validate
		const validation = this.validateAction(context);
		if (!validation.valid) {
			throw new Error(`Invalid action: ${validation.errors.join(', ')}`);
		}

		// 2. Execute subclass logic
		const result = this.computeTransition(context);

		// 3. Common post-processing could go here (logging is handled by the caller/manager usually, but we can return data for it)

		return result;
	}

	/**
	 * Internal method for subclasses to implement the specific logic
	 */
	protected abstract computeTransition(context: PhaseTransitionContext): PhaseTransitionResult;

	/**
	 * Default implementation uses the global validator.
	 */
	public validateAction(context: PhaseTransitionContext): ValidationResult {
		// Ensure the handler matches the phase
		if (context.session.phase !== this.phase && this.phase !== 'encounter') {
			// Note: 'encounter' handler might also handle transitions TO 'shop' happening IN 'encounter' phase.
			// But strictly, the `phase` property of Handler denotes acts acting ON that phase.
			if (context.session.phase !== this.phase) {
				return { valid: false, errors: [`Handler for '${this.phase}' called on session in '${context.session.phase}'`] };
			}
		}
		return phaseValidator.validateAction(context);
	}

	public canHandle(context: PhaseTransitionContext): boolean {
		return context.session.phase === this.phase;
	}

	/**
	 * Helper to generate the next seed based on current seed and action.
	 * Matches GameLogic.generateNextSeed
	 */
	protected generateNextSeed(currentSeed: string, actionId: string): string {
		const input = currentSeed + actionId;
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			const char = input.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash).toString(36);
	}
}
