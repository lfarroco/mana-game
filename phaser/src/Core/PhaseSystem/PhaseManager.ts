import { PhaseHandler, PhaseTransitionContext, PhaseTransitionResult } from "./types";
import { phaseValidator } from "./PhaseValidator";

export class PhaseManager {
	private handlers: PhaseHandler[] = [];

	public register(handler: PhaseHandler): void {
		this.handlers.push(handler);
	}

	public findHandler(context: PhaseTransitionContext): PhaseHandler | null {
		// 1. Try to find a handler that specifically claims to handle this context
		// Priority: We should search for MetaHandler first if it acts as an override?
		// In our implementation, MetaHandler.canHandle checks action type.
		// Standard Phases check session.phase.

		// We iterate safe order? 
		// If we have overlapping handlers, the order matters.
		// Let's register Meta first or iterate. 
		// But `canHandle` is the gate.

		for (const handler of this.handlers) {
			if (handler.canHandle(context)) {
				return handler;
			}
		}
		return null;
	}

	public transition(context: PhaseTransitionContext): PhaseTransitionResult {
		const handler = this.findHandler(context);

		if (!handler) {
			throw new Error(`No phase handler found for phase '${context.session.phase}' and action '${context.actionId}'`);
		}

		const { session } = context;

		// Validate global constraints before delegation
		const validation = phaseValidator.validateAction(context);
		if (!validation.valid) {
			// Warning: Some meta-actions might fail strict validation if not in options.
			// But our validator handles meta-actions gracefully.
			throw new Error(`Invalid action: ${validation.errors.join(', ')}`);
		}

		const result = handler.transition(context);

		// Validate result consistency
		const resultValidation = phaseValidator.validateResult(session, result);
		if (!resultValidation.valid) {
			// console.warn('Phase transition resulted in invalid state:', resultValidation.errors);
			// We might throw here or strict mode
		}

		return result;
	}
}

// Export a singleton or factory
export const phaseManager = new PhaseManager();