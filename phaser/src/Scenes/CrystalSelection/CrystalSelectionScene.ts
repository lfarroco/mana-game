import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";
import { setCurrentScene } from "@Models/State";
import { getCores, CardDefinition } from "@Models/Entities/Card";
import { createUIButton } from "@Components/UIButton";
import { vec2 } from "@Models/Geometry";
import { cloudsBg } from "../Title/components/cloudsBg";
import { buildEffectBlock, getReactionDescription } from "@Systems/Chara/CharaTooltip";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { t } from "@i18n/i18n";

// Layout constants
const CARD_DISPLAY_Y = 380;
const DESCRIPTION_Y = 550;
const PAGINATION_Y = 720;
const PLAY_BUTTON_Y = 820;
const BACK_BUTTON_Y = 920;
const NAV_BUTTON_OFFSET_X = 350;
const DOT_SIZE = 16;
const DOT_SPACING = 32;

export default class CrystalSelectionScene extends Phaser.Scene {
	private crystals: CardDefinition[] = [];
	private currentIndex = 0;
	private crystalSprite!: Phaser.GameObjects.Image;
	private crystalName!: Phaser.GameObjects.Text;
	private paginationDots: Phaser.GameObjects.Arc[] = [];
	descriptionText!: BBCodeText;

	constructor() {
		super(constants.SCENE_KEYS.CRYSTAL_SELECTION);
	}

	create() {
		setCurrentScene(this);

		cloudsBg();

		this.crystals = getCores();
		this.currentIndex = 0;

		const title = io.Text(
			t("crystalSelection.title"),
			{
				...constants.titleTextConfig,
				fontSize: "48px",
			});
		io.SetPosition(title, vec2(constants.MIDDLE_SCREEN_X, 150));
		io.Centralize(title);

		this.createCrystalDisplay();

		this.createNavigationButtons();

		this.createPaginationDots();

		this.createActionButtons();

		this.updateDisplay();
	}

	private createCrystalDisplay() {
		const crystal = this.crystals[this.currentIndex];

		this.add.rectangle(
			constants.MIDDLE_SCREEN_X,
			CARD_DISPLAY_Y + 90,
			550,
			500,
			0x000000,
			0.8
		);

		this.crystalSprite = this.add.image(
			constants.MIDDLE_SCREEN_X,
			CARD_DISPLAY_Y,
			crystal.pic
		);
		this.crystalSprite.setDisplaySize(200, 200);

		this.tweens.add({
			targets: this.crystalSprite,
			y: CARD_DISPLAY_Y - 15,
			duration: 1500,
			ease: "Sine.InOut",
			yoyo: true,
			repeat: -1,
		});

		this.crystalName = io.Text(crystal.name, {
			...constants.titleTextConfig,
			fontSize: "36px",
		});
		io.SetPosition(this.crystalName, vec2(constants.MIDDLE_SCREEN_X, CARD_DISPLAY_Y + 140));
		io.Centralize(this.crystalName);

		this.descriptionText = this.add
			.rexBBCodeText(
				constants.MIDDLE_SCREEN_X,
				DESCRIPTION_Y,
				"",
				{
					fontSize: "24px",
					fontFamily: "Arimo",
					align: "center",
					color: "#ffffff",
				}
			)
			.setOrigin(0.5, 0)
			.setWrapMode(1)
			.setWrapWidth(700);
	}

	private createNavigationButtons() {
		createUIButton(
			t("crystalSelection.previous"),
			vec2(constants.MIDDLE_SCREEN_X - NAV_BUTTON_OFFSET_X, CARD_DISPLAY_Y),
			() => this.navigateToPrevious(),
			200
		);

		createUIButton(
			t("crystalSelection.next"),
			vec2(constants.MIDDLE_SCREEN_X + NAV_BUTTON_OFFSET_X, CARD_DISPLAY_Y),
			() => this.navigateToNext(),
			200
		);
	}

	private createPaginationDots() {
		const totalDots = this.crystals.length;
		const totalWidth = (totalDots - 1) * DOT_SPACING;
		const startX = constants.MIDDLE_SCREEN_X - totalWidth / 2;

		for (let i = 0; i < totalDots; i++) {
			const dot = this.add.circle(
				startX + i * DOT_SPACING,
				PAGINATION_Y,
				DOT_SIZE / 2,
				0xffffff,
				0.3
			);
			dot.setStrokeStyle(2, 0xffffff, 0.5);
			this.paginationDots.push(dot);
		}
	}

	private createActionButtons() {
		createUIButton(
			t("crystalSelection.play"),
			vec2(constants.MIDDLE_SCREEN_X, PLAY_BUTTON_Y),
			() => this.startGameWithCrystal()
		);

		createUIButton(
			t("crystalSelection.back"),
			vec2(constants.MIDDLE_SCREEN_X, BACK_BUTTON_Y),
			() => this.returnToTitle()
		);
	}

	private navigateToPrevious() {
		this.currentIndex =
			(this.currentIndex - 1 + this.crystals.length) % this.crystals.length;
		this.updateDisplay();
	}

	private navigateToNext() {
		this.currentIndex = (this.currentIndex + 1) % this.crystals.length;
		this.updateDisplay();
	}

	private updateDisplay() {
		const crystal = this.crystals[this.currentIndex];

		this.crystalSprite.setTexture(crystal.pic);

		this.crystalName.setText(crystal.name);
		io.Centralize(this.crystalName);

		const description = this.buildCrystalDescription(crystal);
		this.descriptionText.setText(description);

		this.paginationDots.forEach((dot, i) => {
			dot.setFillStyle(0xffffff, i === this.currentIndex ? 1 : 0.3);
		});
	}

	private buildCrystalDescription(crystal: CardDefinition): string {
		const power = crystal.power || 0;

		const effectBlocks = crystal.effects
			.map((e) => buildEffectBlock(e, power))
			.filter((e): e is string => e !== null);

		const reactionBlocks = crystal.reactions.map((r) =>
			getReactionDescription(r, power)
		);

		const cdAsSeconds = ((crystal.cooldown || 0) / 1000).toFixed(1);
		const statsBlock = `[color=#c0c0c0]${t("crystalSelection.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`;

		const lifeBlock = crystal.life
			? ` | [color=#c0c0c0]${t("crystalSelection.life")}[/color] [color=#51cf66]${crystal.life}[/color]`
			: "";

		const allEffects = [...effectBlocks, ...reactionBlocks].join("\n");

		return `${statsBlock}${lifeBlock}\n\n${allEffects || t("crystalSelection.noAbilities")}`;
	}

	private async startGameWithCrystal() {
		const selectedCrystal = this.crystals[this.currentIndex];

		await io.Fade(300, 0x000000);
		this.scene.start(constants.SCENE_KEYS.BATTLEGROUND, {
			selectedCrystalId: selectedCrystal.id,
		});
	}

	private returnToTitle() {
		this.scene.start(constants.SCENE_KEYS.TITLE);
	}
}
