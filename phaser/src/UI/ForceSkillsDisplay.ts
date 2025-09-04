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

const CIRCLE_RADIUS = 35;
const CIRCLE_SPACING = 10;
const SKILL_OFFSET_Y = 40;

const BOARD_WIDTH = c.TILE_WIDTH * 3 + 8 * 2;
const BOARD_HEIGHT = c.TILE_HEIGHT * 3 + 8 * 2;
const SKILLS_Y = c.PLAYER_BOARD_Y + BOARD_HEIGHT + SKILL_OFFSET_Y;
const PLAYER_BASE_X = c.PLAYER_BOARD_X + BOARD_WIDTH / 2;
const CPU_BASE_X = c.CPU_BOARD_X + BOARD_WIDTH / 2;

const forceBaseX = new Map<Force, number>();

const forceColors: { [key: string]: number } = {
	[c.FORCE_ID_PLAYER]: 0x4e9de0,
	[c.FORCE_ID_CPU]: 0xe04e4e
};

const forceIdMap = new Map<Force, string>();

const forceContainerMap = new Map<Force, Container>();
const forceCirclesMapObj = new Map<Force, SkillCircle[]>();

let playerContainer: Container;
let cpuContainer: Container;
let playerCircles: SkillCircle[] = [];
let cpuCircles: SkillCircle[] = [];

const forceCirclesMap: { [key: string]: SkillCircle[] } = {
	[c.FORCE_ID_PLAYER]: playerCircles,
	[c.FORCE_ID_CPU]: cpuCircles
};

function getSkillIcon(_skillId: string, _forceId: string): string {

	// placeholder for now
	return pickOne(["⚔️", "☠️"])
}

export function initForceSkillsDisplay() {
	playerContainer = scene.add.container(0, 0);
	cpuContainer = scene.add.container(0, 0);
	forceBaseX.set(playerForce, PLAYER_BASE_X);
	forceBaseX.set(cpuForce, CPU_BASE_X);
	forceIdMap.set(playerForce, c.FORCE_ID_PLAYER);
	forceIdMap.set(cpuForce, c.FORCE_ID_CPU);
	forceContainerMap.set(playerForce, playerContainer);
	forceContainerMap.set(cpuForce, cpuContainer);
	forceCirclesMapObj.set(playerForce, playerCircles);
	forceCirclesMapObj.set(cpuForce, cpuCircles);
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
	const container = forceContainerMap.get(force)!;
	const circles = forceCirclesMapObj.get(force)!;

	const totalSkillsWidth = force.skills.length * (CIRCLE_RADIUS * 2 + CIRCLE_SPACING) - CIRCLE_SPACING;
	const baseX = forceBaseX.get(force)!;
	const startX = baseX - totalSkillsWidth / 2;

	force.skills.forEach((skill, index) => {
		const x = startX + index * (CIRCLE_RADIUS * 2 + CIRCLE_SPACING);
		const circle = createSkillCircle(skill, x, SKILLS_Y, force);
		container.add(circle.circle);
		container.add(circle.text);
		circles.push(circle);
	});
}

function createSkillCircle(skill: Skill, x: number, y: number, force: Force): SkillCircle {
	const forceId = forceIdMap.get(force)!;
	const color = forceColors[forceId];

	const circle = scene.add.circle(x, y, CIRCLE_RADIUS, color, 0.8);
	circle.setStrokeStyle(2, 0xffffff);

	const iconText = getSkillIcon(skill.id, forceId);

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
	forceCirclesMap[c.FORCE_ID_PLAYER] = playerCircles;
	forceCirclesMapObj.set(playerForce, playerCircles);
}

function clearCpuSkills() {
	cpuCircles.forEach(circle => {
		circle.circle.destroy();
		circle.text.destroy();
	});
	cpuCircles = [];
	forceCirclesMap[c.FORCE_ID_CPU] = cpuCircles;
	forceCirclesMapObj.set(cpuForce, cpuCircles);
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
	const circles = forceCirclesMap[forceId];
	const skillCircle = circles.find(circle => circle.skill.id === skillId);
	if (skillCircle) {
		return { x: skillCircle.circle.x, y: skillCircle.circle.y };
	}
	return null;
}
