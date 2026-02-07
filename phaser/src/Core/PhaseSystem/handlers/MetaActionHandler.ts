import { PhaseTransitionContext, PhaseTransitionResult, ActionType, ValidationResult } from "../types";
import { createPhaseHandler } from "../BasePhaseHandler";
import { actionRegistry } from "../ActionRegistry";
import { PhaseType } from "../../Types";

export const metaActionHandler = createPhaseHandler({
	phase: 'encounter' as PhaseType,
	actionType: ActionType.META_ACTION,
	canHandle: (context: PhaseTransitionContext) => actionRegistry.isMetaAction(context.actionId),
	validateAction: (): ValidationResult => ({ valid: true, errors: [] }),
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session } = context;

		return {
			nextPhase: session.phase,
			nextOptions: session.current_options
				? (Array.isArray(session.current_options) ? session.current_options : session.current_options.options)
				: [],
			stepIncrement: 0,
			roundIncrement: 0,
		};
	},
});
