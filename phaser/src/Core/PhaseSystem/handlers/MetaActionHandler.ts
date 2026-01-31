import { PhaseTransitionContext, PhaseTransitionResult, ActionType, PhaseHandler, ValidationResult } from "../types";
import { actionRegistry } from "../ActionRegistry";
import { PhaseType } from "../../Types";

export class MetaActionHandler implements PhaseHandler {
	readonly phase: PhaseType = 'encounter'; // Dummy, not used for matching if we use canHandle logic
	readonly actionType = ActionType.META_ACTION;

	public canHandle(context: PhaseTransitionContext): boolean {
		return actionRegistry.isMetaAction(context.actionId);
	}

	public validateAction(): ValidationResult {
		// Meta actions are generally always valid if they exist
		// But specific logic might apply (e.g. valid target for discard)
		return { valid: true, errors: [] };
	}

	public transition(context: PhaseTransitionContext): PhaseTransitionResult {
		const { session } = context;

		// Meta actions don't change phase or options usually
		return {
			nextPhase: session.phase,
			// Keep existing options
			nextOptions: session.current_options
				? (Array.isArray(session.current_options) ? session.current_options : session.current_options.options)
				: [],
			stepIncrement: 0,
			roundIncrement: 0
		};
	}
}
