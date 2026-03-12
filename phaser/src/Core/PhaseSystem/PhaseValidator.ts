import { PhaseOption, PhaseType, SessionData } from "@Core/Types";
import {
	PhaseTransitionContext,
	PhaseTransitionResult,
	ValidationResult,
} from "@Core/PhaseSystem/types";
import { actionRegistry } from "@Core/PhaseSystem/ActionRegistry";

class PhaseValidator {
	/**
	 * matrix of allowed phase transitions
	 * key: fromPhase, value: allowed toPhases
	 */
	private allowedTransitions: Record<PhaseType, PhaseType[]> = {
		encounter: ["shop", "orb_shop", "combat"], // encounter -> shop is standard, orb_shop special, combat via warning
		shop: ["encounter", "combat"], // shop -> next step/round
		orb_shop: ["encounter", "combat", "orb_shop"], // orb_shop can stay in orb_shop or exit
		combat: ["encounter", "upgrade_core", "add_reaction_core", "victory", "game_over", "combat"], // combat -> next step or end game
		upgrade_core: ["encounter"], // upgrade -> new round
		add_reaction_core: ["encounter"], // reaction -> new round
		victory: [],
		game_over: [],
	};

	/**
	 * Validate if a transition from one phase to another is legal.
	 */
	public validateTransition(from: PhaseType, to: PhaseType): ValidationResult {
		// If staying in same phase, it's generally valid (meta actions, sub-phases)
		if (from === to) {
			return { valid: true, errors: [] };
		}

		const allowed = this.allowedTransitions[from];
		if (!allowed || !allowed.includes(to)) {
			return {
				valid: false,
				errors: [
					`Invalid phase transition from '${from}' to '${to}'. Allowed: ${allowed?.join(", ") || "none"}`,
				],
			};
		}

		return { valid: true, errors: [] };
	}

	/**
	 * Validate if an action is valid for the current session state.
	 */
	public validateAction(context: PhaseTransitionContext): ValidationResult {
		const { session, actionId } = context;
		const { current_options, phase } = session;

		// 1. Validate action is available in options
		// Some actions might be implicit or hidden (like 'phase_complete' or debug actions),
		// but generally player actions must be in options.
		// 'discard_unit' is a meta action available globally (UI usually handles availability),
		// but strictly speaking should check if allowed.
		// For now we trust if it's not a transition action.

		const isMeta = actionRegistry.isMetaAction(actionId);
		const isSubPhase = actionRegistry.isSubPhaseAction(actionId);

		if (isMeta || isSubPhase) {
			// Meta and Sub-phase actions might not be in 'current_options' usually
			return { valid: true, errors: [] };
		}

		// "hidden" system actions
		const systemActions = [
			"phase_complete",
			"return_to_menu",
			"upgrade_core_done",
			"orb_shop_done",
			"add_reaction_core_done",
			"skip_shop",
			"skip_encounter",
		];
		if (systemActions.includes(actionId)) {
			return { valid: true, errors: [] };
		}

		if (!current_options) {
			return { valid: false, errors: ["No options available for this session."] };
		}

		let optionsList: PhaseOption[] = [];
		if (Array.isArray(current_options)) {
			optionsList = current_options;
		} else if (typeof current_options === "object" && "options" in current_options) {
			optionsList = current_options.options;
		}

		const optionExists = optionsList.some((opt) => opt.id === actionId);

		// Special case which sucks: sometimes actionId has arguments embedded or is matched by type in the old logic
		// but in the new system we try to be exact.
		// However, for shop/encounter, actionId is the card ID.

		if (!optionExists) {
			// Fallback check: maybe it's a valid action but not strictly in options list (e.g. implicitly allowed)
			// But for strict validation we want it in the list.
			return {
				valid: false,
				errors: [`Action '${actionId}' is not in the current available options.`],
			};
		}

		// 2. Validate action is appropriate for phase via Registry
		const meta = actionRegistry.get(actionId);
		if (meta && meta.fromPhase && meta.fromPhase !== phase) {
			return {
				valid: false,
				errors: [
					`Action '${actionId}' is valid for phase '${meta.fromPhase}', but current phase is '${phase}'.`,
				],
			};
		}

		return { valid: true, errors: [] };
	}

	/**
	 * Validate the result of a transition to ensure state consistency.
	 */
	public validateResult(
		previousSession: SessionData,
		result: PhaseTransitionResult
	): ValidationResult {
		const fromPhase = previousSession.phase;
		const toPhase = result.nextPhase;

		const transitionCheck = this.validateTransition(fromPhase, toPhase);
		if (!transitionCheck.valid) {
			return transitionCheck;
		}

		// Validate step/round increment logic
		// e.g. Round shouldn't go backwards
		if (result.roundIncrement && result.roundIncrement < 0) {
			return { valid: false, errors: ["Round cannot decrement."] };
		}

		return { valid: true, errors: [] };
	}
}

export const phaseValidator = new PhaseValidator();
