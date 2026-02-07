import { PhaseHandler, PhaseTransitionContext, PhaseTransitionResult } from "./types";
import { phaseValidator } from "./PhaseValidator";

function createPhaseManager() {
	const handlers: PhaseHandler[] = [];

	const register = (handler: PhaseHandler): void => {
		handlers.push(handler);
	};

	const findHandler = (context: PhaseTransitionContext): PhaseHandler | null => {
		for (const handler of handlers) {
			if (handler.canHandle(context)) {
				return handler;
			}
		}
		return null;
	};

	const transition = (context: PhaseTransitionContext): PhaseTransitionResult => {
		const handler = findHandler(context);

		if (!handler) {
			throw new Error(`No phase handler found for phase '${context.session.phase}' and action '${context.actionId}'`);
		}

		const { session } = context;
		const validation = phaseValidator.validateAction(context);
		if (!validation.valid) {
			throw new Error(`Invalid action: ${validation.errors.join(', ')}`);
		}

		const result = handler.transition(context);

		const resultValidation = phaseValidator.validateResult(session, result);
		if (!resultValidation.valid) {
			// Non-blocking, but surfaces in strict modes
		}

		return result;
	};

	const clear = (): void => {
		handlers.length = 0;
	};

	return {
		register,
		findHandler,
		transition,
		clear,
	};
}

export const phaseManager = createPhaseManager();
export type PhaseManagerApi = ReturnType<typeof createPhaseManager>;