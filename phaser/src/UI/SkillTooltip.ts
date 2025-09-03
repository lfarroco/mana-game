import { Skill } from "../Models/Entities/Force";
import { hideTooltip, renderTooltip } from "./Tooltip";

export const showSkillTooltip = (skill: Skill, x: number, y: number): void => {
	const title = skill.name;
	const description = getSkillDescription(skill);

	renderTooltip(x, y, title, description);
};

export const hideSkillTooltip = (): void => {
	hideTooltip();
};

const getSkillDescription = (skill: Skill): string => {
	const { effectId } = skill.reactions[0];

	switch (effectId) {
		case 'damage':
			return `[color=#ff6b6b]Damage[/color] [color=#ffd93d]${effectId}[/color]\n[color=#c0c0c0]Deals damage to enemy forces[/color]`;
		case 'heal':
			return `[color=#51cf66]Heal[/color] [color=#ffd93d]${effectId}[/color]\n[color=#c0c0c0]Restores morale to allied forces[/color]`;
		case 'shield':
			return `[color=#74c0fc]Shield[/color] [color=#ffd93d]${effectId}[/color]\n[color=#c0c0c0]Grants shield protection[/color]`;
		case 'ally_damage_power_boost':
			return `[color=#ff8cc8]Battle Fury[/color] [color=#ffd93d]+${effectId}[/color]\n[color=#c0c0c0]Allied units gain power when using damage effects[/color]`;
		default:
			return `[color=#c0c0c0]Unknown skill effect[/color]`;
	}
};
