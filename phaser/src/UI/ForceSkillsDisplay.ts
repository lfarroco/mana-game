import * as c from "../constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { Force, Skill } from "@Models/Entities/Force";
import * as SkillTooltip from "./SkillTooltip";

interface SkillCircle {
	circle: Phaser.GameObjects.Arc;
	text: Phaser.GameObjects.Text;
	skill: Skill;
}

let playerContainer: Phaser.GameObjects.Container;
let cpuContainer: Phaser.GameObjects.Container;
let playerCircles: SkillCircle[] = [];
let cpuCircles: SkillCircle[] = [];

const CIRCLE_RADIUS = 35;
const CIRCLE_SPACING = 10;
const SKILL_OFFSET_Y = 40; // Distance below the board

function getSkillIcon(skillId: string, forceId: string): string {
	// Get skill icon based on force id + skill id
	const key = `${forceId}-${skillId}`;

	switch (key) {
		case "player-player-ally-damage-boost":
			return "⚔️"; // Sword for damage boost
		case "cpu-cpu-poison-damage-boost":
			return "☠️"; // Skull for poison
		default:
			return skillId.charAt(0).toUpperCase(); // Fallback to first letter
	}
}

export function initForceSkillsDisplay() {
	playerContainer = scene.add.container(0, 0);
	cpuContainer = scene.add.container(0, 0);
	updatePlayerSkills();
	updateCpuSkills();
}

export function updatePlayerSkills() {
	clearPlayerSkills();
	const playerForce = scene.state.battleData.forces.find(f => f.id === c.FORCE_ID_PLAYER);
	if (playerForce) {
		renderSkills(playerForce, true);
	}
}

export function updateCpuSkills() {
	clearCpuSkills();
	const cpuForce = scene.state.battleData.forces.find(f => f.id === c.FORCE_ID_CPU);
	if (cpuForce) {
		renderSkills(cpuForce, false);
	}
}

function renderSkills(force: Force, isPlayer: boolean) {
	const container = isPlayer ? playerContainer : cpuContainer;
	const circles = isPlayer ? playerCircles : cpuCircles;

	// Calculate board bottom position
	const boardY = c.PLAYER_BOARD_Y;
	const boardHeight = c.TILE_HEIGHT * 3 + 8 * 2;
	const skillsY = boardY + boardHeight + SKILL_OFFSET_Y;

	// Center the skills horizontally under the board
	const boardWidth = c.TILE_WIDTH * 3 + 8 * 2;
	const totalSkillsWidth = force.skills.length * (CIRCLE_RADIUS * 2 + CIRCLE_SPACING) - CIRCLE_SPACING;
	const startX = isPlayer
		? c.PLAYER_BOARD_X + boardWidth / 2 - totalSkillsWidth / 2
		: c.CPU_BOARD_X + boardWidth / 2 - totalSkillsWidth / 2;

	force.skills.forEach((skill, index) => {
		const x = startX + index * (CIRCLE_RADIUS * 2 + CIRCLE_SPACING);
		const circle = createSkillCircle(skill, x, skillsY, isPlayer);
		container.add(circle.circle);
		container.add(circle.text);
		circles.push(circle);
	});
}

function createSkillCircle(skill: Skill, x: number, y: number, isPlayer: boolean): SkillCircle {
	// Create circle background
	const circle = scene.add.circle(x, y, CIRCLE_RADIUS, isPlayer ? 0x4e9de0 : 0xe04e4e, 0.8);
	circle.setStrokeStyle(2, 0xffffff);

	// Get skill icon based on force id + skill id
	const iconText = getSkillIcon(skill.id, isPlayer ? c.FORCE_ID_PLAYER : c.FORCE_ID_CPU);

	// Create skill text/icon
	const text = scene.add.text(x, y, iconText, {
		fontSize: '28px',
		color: '#ffffff',
		fontFamily: 'Arial Black',
		stroke: '#000000',
		strokeThickness: 4
	}).setOrigin(0.5);

	// Make interactive
	circle.setInteractive();
	text.setInteractive();

	// Add hover effects and tooltip
	const showTooltip = () => {
		SkillTooltip.showSkillTooltip(skill, x, y - CIRCLE_RADIUS - 10);
	};

	const hideTooltip = () => {
		SkillTooltip.hideSkillTooltip();
	};

	circle.on('pointerover', showTooltip);
	circle.on('pointerout', hideTooltip);
	text.on('pointerover', showTooltip);
	text.on('pointerout', hideTooltip);

	// Add click effect
	circle.on('pointerdown', () => {
		circle.setScale(0.9);
		text.setScale(0.9);
	});

	circle.on('pointerup', () => {
		circle.setScale(1);
		text.setScale(1);
	});

	text.on('pointerdown', () => {
		circle.setScale(0.9);
		text.setScale(0.9);
	});

	text.on('pointerup', () => {
		circle.setScale(1);
		text.setScale(1);
	});

	return { circle, text, skill };
}

function clearPlayerSkills() {
	playerCircles.forEach(circle => {
		circle.circle.destroy();
		circle.text.destroy();
	});
	playerCircles = [];
}

function clearCpuSkills() {
	cpuCircles.forEach(circle => {
		circle.circle.destroy();
		circle.text.destroy();
	});
	cpuCircles = [];
}

export function updateForceSkillsDisplay() {
	// Update skills display if forces change
	updatePlayerSkills();
	updateCpuSkills();
}

export function destroyForceSkillsDisplay() {
	clearPlayerSkills();
	clearCpuSkills();
	playerContainer.destroy();
	cpuContainer.destroy();
}

export function getSkillPosition(skillId: string, forceId: string): { x: number; y: number } | null {
	const circles = forceId === c.FORCE_ID_PLAYER ? playerCircles : cpuCircles;
	const skillCircle = circles.find(circle => circle.skill.id === skillId);
	if (skillCircle) {
		return { x: skillCircle.circle.x, y: skillCircle.circle.y };
	}
	return null;
}
