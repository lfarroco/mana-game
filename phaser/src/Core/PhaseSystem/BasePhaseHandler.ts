import { PhaseType } from "../Types";
import { PhaseHandler, PhaseTransitionContext, PhaseTransitionResult, ActionType, ValidationResult } from "./types";
import { phaseValidator } from "./PhaseValidator";

type PhaseHandlerConfig = {
	phase: PhaseType;
	actionType: ActionType;
	computeTransition: (context: PhaseTransitionContext) => PhaseTransitionResult;
	validateAction?: (context: PhaseTransitionContext) => ValidationResult;
	canHandle?: (context: PhaseTransitionContext) => boolean;
};

function defaultValidateAction(phase: PhaseType, context: PhaseTransitionContext): ValidationResult {
	if (phase !== 'encounter' && context.session.phase !== phase) {
		return { valid: false, errors: [`Handler for '${phase}' called on session in '${context.session.phase}'`] };
	}

	return phaseValidator.validateAction(context);
}

export function createPhaseHandler(config: PhaseHandlerConfig): PhaseHandler {
	const { phase, actionType, computeTransition, validateAction, canHandle } = config;

	const handler: PhaseHandler = {
		phase,
		actionType,
		canHandle: canHandle || ((context) => context.session.phase === phase),
		validateAction: (context) => {
			const validator = validateAction || ((ctx: PhaseTransitionContext) => defaultValidateAction(phase, ctx));
			return validator(context);
		},
		transition: (context) => {
			const validation = handler.validateAction(context);
			if (!validation.valid) {
				throw new Error(`Invalid action: ${validation.errors.join(', ')}`);
			}
			return computeTransition(context);
		},
	};

	return handler;
}

export type PhaseHandlerFactory = typeof createPhaseHandler;
