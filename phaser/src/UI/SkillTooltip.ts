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

	return skill.description;

};
