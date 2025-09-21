import * as Systems from "../index"
import * as Board from "@Models/Board";
import { skillsIndex } from "@Models/Skills";
import { getState } from "@Models/State";
import * as ForceSkillsDisplay from "@UI/ForceSkillsDisplay";
import { delay, tween } from "../../../../Utils/animation";
import { hideTooltip, renderTooltip } from "@UI/Tooltip";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import * as sc from "./constants";
import * as ShopUI from "./ShopUI";
import { pickOne, pickRandom } from "../../../../utils";
import { state } from "./ShopUI";

const SKILL_CIRCLE_RADIUS = 90;
const SKILL_CIRCLE_SCALE = 1.5;
const SKILL_TEXT_SCALE = 1.5;
const SKILL_CLICK_SCALE = 0.9;
const SKILL_CLICK_TEXT_SCALE = 1.35;
const SKILL_ICON_FONT_SIZE = '48px';

export function init() {
	ShopUI.create();
}

export async function open(buttonText: string = "Next Round") {
	const availableSkills = pickRandom(Object.keys(skillsIndex), 3);

	const nextRoundCallback = () => {
		Systems.ShopPhase.handleShopPhaseEnded();
		close();
	};

	const onPurchase = async (skillId: string) => {
		purchaseSkill(skillId);
		hideTooltip();
		ShopUI.disableNextRoundButton();
		disableSkillCircles();
		await delay(500);
		Systems.ShopPhase.handleShopPhaseEnded();
		await close();
	};

	ShopUI.displayCommonShop(nextRoundCallback, buttonText);
	renderSkills(availableSkills, onPurchase);

	Board.setEnemyBoardVisible(false);

	await ShopUI.slideIn();
}

function purchaseSkill(skillId: string) {
	const state = getState();
	const player = state.gameData.player;
	const skill = skillsIndex[skillId];

	if (!skill) return;

	// Check if already owned
	if (player.skills.some(s => s.id === skillId)) {
		console.log("Skill already owned");
		return;
	}

	player.skills.push(skill);

	console.log(`Purchased skill: ${skill.name}`);

	ForceSkillsDisplay.updatePlayerSkills();
}

export async function close() {
	await ShopUI.slideOut();
}

export async function handleShopOpenUITrigger(buttonText: string = "Next Round"): Promise<void> {
	await open(buttonText);
}
export function renderSkills(skills: string[], onPurchase: (skillId: string) => void | Promise<void>): void {
	if (!ShopUI.state) throw new Error("ShopUI not initialized. Call create() first.");
	const baseX = ShopUI.state.panelX + 160;
	const baseY = sc.TAVERN_BASE_Y + 130;

	skills.forEach((skillId, index) => {
		const skill = skillsIndex[skillId];
		if (skill) {
			const x = baseX + (index * sc.TAVERN_CHARA_SPACING);
			const circle = scene.add.circle(x, baseY, SKILL_CIRCLE_RADIUS, 0x4e9de0, 0.8);
			circle.setStrokeStyle(2, 0xffffff);

			const iconText = getSkillIcon(skillId);

			const text = scene.add.text(x, baseY, iconText, {
				fontSize: SKILL_ICON_FONT_SIZE,
				color: '#ffffff',
				fontFamily: 'Arial Black',
				stroke: '#000000',
				strokeThickness: 4
			}).setOrigin(0.5);
			text.setScale(1.5); // Larger scale

			circle.setInteractive(
				new Phaser.Geom.Circle(SKILL_CIRCLE_RADIUS, SKILL_CIRCLE_RADIUS, SKILL_CIRCLE_RADIUS),
				Phaser.Geom.Circle.Contains
			);

			circle.on('pointerover', () => {
				renderTooltip(x, baseY - 200, skill.name, skill.description);
			});
			circle.on('pointerout', () => {
				hideTooltip();
			});

			circle.on('pointerdown', () => {
				circle.setScale(SKILL_CLICK_SCALE);
				text.setScale(SKILL_CLICK_TEXT_SCALE);
				onPurchase(skillId);
			});

			circle.on('pointerup', () => {
				circle.setScale(SKILL_CIRCLE_SCALE);
				text.setScale(SKILL_TEXT_SCALE);
			});

			ShopUI.state!.shopContainer.add(circle);
			ShopUI.state!.shopContainer.add(text);
			ShopUI.state!.skillCircles.push(circle);

			tween({
				targets: [circle, text],
				y: `+=20`,
				duration: 4200 + Math.random() * 2000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: index * 100
			});
			tween({
				targets: [text],
				rotation: `+=0.05`,
				duration: 4200 + Math.random() * 2000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
				delay: index * 100
			});
		}
	});
}
function getSkillIcon(_skillId: string): string {
	return pickOne([
		"♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓",

	]);
}

export function disableSkillCircles(): void {
	if (state?.skillCircles) {
		state.skillCircles.forEach(circle => {
			circle.disableInteractive();
			circle.setAlpha(0.5);
		});
	}
}
