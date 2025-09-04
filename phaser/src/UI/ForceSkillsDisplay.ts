import * as c from "../constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { cpuForce, Force, playerForce, Skill } from "@Models/Entities/Force";
import * as SkillTooltip from "./SkillTooltip";
import { pickOne } from "../utils";

interface SkillCircle {
	circle: Phaser.GameObjects.Arc;
	text: TextObj;
	skill: Skill;
}

let playerContainer: Container;
let cpuContainer: Container;
let playerCircles: SkillCircle[] = [];
let cpuCircles: SkillCircle[] = [];

const CIRCLE_RADIUS = 35;
const CIRCLE_SPACING = 10;
const SKILL_OFFSET_Y = 40;

function getSkillIcon(_skillId: string, _forceId: string): string {

	// placeholder for now
	return pickOne(["⚔️", "☠️"])
}

export function initForceSkillsDisplay() {
	playerContainer = scene.add.container(0, 0);
	playerContainer.setDepth(1000);
	cpuContainer = scene.add.container(0, 0);
	cpuContainer.setDepth(1000);
	updatePlayerSkills();
	updateCpuSkills();
}

export function updatePlayerSkills() {
	clearPlayerSkills();
	renderSkills(playerForce);
}

export function updateCpuSkills() {
	clearCpuSkills();
	renderSkills(cpuForce);
}

function renderSkills(force: Force) {
	const isPlayer = force === playerForce;
	const container = isPlayer ? playerContainer : cpuContainer;
	const circles = isPlayer ? playerCircles : cpuCircles;

	const boardY = c.PLAYER_BOARD_Y;
	const boardHeight = c.TILE_HEIGHT * 3 + 8 * 2;
	const skillsY = boardY + boardHeight + SKILL_OFFSET_Y;

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

	const circle = scene.add.circle(x, y, CIRCLE_RADIUS, isPlayer ? 0x4e9de0 : 0xe04e4e, 0.8);
	circle.setStrokeStyle(2, 0xffffff);

	const iconText = getSkillIcon(skill.id, isPlayer ? c.FORCE_ID_PLAYER : c.FORCE_ID_CPU);

	const text = scene.add.text(x, y, iconText, {
		fontSize: '28px',
		color: '#ffffff',
		fontFamily: 'Arial Black',
		stroke: '#000000',
		strokeThickness: 4
	}).setOrigin(0.5);

	circle.setInteractive(
		new Phaser.Geom.Circle(CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS),
		Phaser.Geom.Circle.Contains
	);


	const showTooltip = () => {
		const tooltipX = x;
		const tooltipY = y - 200;
		SkillTooltip.showSkillTooltip(skill, tooltipX, tooltipY);
	};

	const hideTooltip = () => {
		SkillTooltip.hideSkillTooltip();
	};

	circle.on('pointerover', showTooltip);
	circle.on('pointerout', hideTooltip);

	circle.on('pointerdown', () => {
		circle.setScale(0.9);
		text.setScale(0.9);
	});

	circle.on('pointerup', () => {
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

	updatePlayerSkills();
	updateCpuSkills();
}

export function destroyForceSkillsDisplay() {
	clearPlayerSkills();
	clearCpuSkills();
	if (playerContainer) playerContainer.destroy();
	if (cpuContainer) cpuContainer.destroy();
}

export function hideCpuSkills() {
	cpuCircles.forEach(circle => {
		circle.circle.setVisible(false);
		circle.text.setVisible(false);
	});
}

export function showCpuSkills() {
	cpuCircles.forEach(circle => {
		circle.circle.setVisible(true);
		circle.text.setVisible(true);
	});
}

export function getSkillPosition(skillId: string, forceId: string): { x: number; y: number } | null {
	const circles = forceId === c.FORCE_ID_PLAYER ? playerCircles : cpuCircles;
	const skillCircle = circles.find(circle => circle.skill.id === skillId);
	if (skillCircle) {
		return { x: skillCircle.circle.x, y: skillCircle.circle.y };
	}
	return null;
}
