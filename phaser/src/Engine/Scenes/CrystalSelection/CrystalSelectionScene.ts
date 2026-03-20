import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";
import { setCurrentScene } from "@Models/State";
import { getCores, CardDefinition } from "@Models/Entities/Card";
import { createUIButton } from "@Components/UIButton";
import { vec2 } from "@Models/Geometry";
import { cloudsBg, getCloudsBg } from "@Scenes/Title/components/cloudsBg";
import { buildEffectBlock, getReactionDescription } from "@Systems/Chara/CharaTooltip";
import { colorPresets } from "@Constants/colorPresets";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { getName, t } from "@i18n/i18n";
import { getSeed, setSeed } from "@Utils/Random";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("CrystalSelectionScene");

//TODO: should also disable seed selection in multiplayer mode
interface CrystalSelectionData {
	isMultiplayer?: boolean;
	isArena?: boolean;
}

// Layout positioning
const CARD_DISPLAY_Y = 380;
const DESCRIPTION_Y = 550;
const PAGINATION_Y = 770;
const PLAY_BUTTON_Y = 850;
const BACK_BUTTON_Y = 950;
const NAV_BUTTON_OFFSET_X = 350;
const TITLE_Y = 100;

// Pagination styling
const DOT_SIZE = 16;
const DOT_SPACING = 32;
const PAGINATION_DOT_COLOR = 0xffffff;
const PAGINATION_DOT_STROKE_COLOR = 0xffffff;
const PAGINATION_DOT_INACTIVE_ALPHA = 0.3;
const PAGINATION_DOT_ACTIVE_ALPHA = 1;
const PAGINATION_DOT_STROKE_WIDTH = 2;
const PAGINATION_DOT_STROKE_ALPHA = 0.5;

// Crystal display styling
const TITLE_FONT_SIZE = "48px";
const CRYSTAL_NAME_FONT_SIZE = "36px";
const DESCRIPTION_FONT_SIZE = "24px";
const DESCRIPTION_LINE_SPACING = 10;
const DESCRIPTION_WRAP_WIDTH = 800;
const DESCRIPTION_ORIGIN_X = 0.5;
const DESCRIPTION_ORIGIN_Y = 0;

// Crystal display box
const CARD_DISPLAY_BG_OFFSET_Y = 90;
const CARD_DISPLAY_BG_WIDTH = 950;
const CARD_DISPLAY_BG_HEIGHT = 650;
const CARD_DISPLAY_BG_COLOR = 0x000000;
const CARD_DISPLAY_BG_ALPHA = 0.8;

// Crystal sprite
const CRYSTAL_SPRITE_SIZE = 200;
const CRYSTAL_FLOAT_ANIMATION_DURATION = 1500;
const CRYSTAL_FLOAT_Y_OFFSET = 15;
const CRYSTAL_FLOAT_EASE = "Sine.InOut";

// Navigation buttons
const NAV_BUTTON_WIDTH = 200;

// Cloud background animation
const CLOUD_BG_ANIMATION_DURATION = 1500;
const CLOUD_BG_ANIMATION_EASE = "Sine.InOut";

export default class CrystalSelectionScene extends Phaser.Scene {
	private crystals: CardDefinition[] = [];
	private currentIndex = 0;
	private crystalSprite!: Phaser.GameObjects.Image;
	private crystalName!: Phaser.GameObjects.Text;
	private paginationDots: Phaser.GameObjects.Arc[] = [];
	private seedText!: Phaser.GameObjects.Text;
	descriptionText!: BBCodeText;
	// @ts-expect-error - Used in keyboard callback functions below
	private isSeededRun: boolean = false;
	private seedWarningText!: Phaser.GameObjects.Text;
	private isMultiplayer: boolean = false;

	constructor() {
		super(constants.SCENE_KEYS.CRYSTAL_SELECTION);
	}

	init(data: CrystalSelectionData) {
		this.isMultiplayer = data.isMultiplayer || data.isArena || false;
		if (this.isMultiplayer) {
			logger.debug("Entering Arena Mode (Multiplayer)");
		}
	}

	create() {
		setCurrentScene(this);

		cloudsBg();

		this.crystals = getCores();
		this.currentIndex = 0;

		io.Text(t("crystalSelection.title"), {
			...constants.titleTextConfig,
			fontSize: TITLE_FONT_SIZE,
		})
			.setPosition(constants.MIDDLE_SCREEN_X, TITLE_Y)
			.setOrigin(0.5);

		this.createCrystalDisplay();

		this.createNavigationButtons();

		this.createPaginationDots();

		this.createActionButtons();

		this.createSeedDisplay();

		this.updateDisplay();
	}

	private createCrystalDisplay() {
		const crystal = this.crystals[this.currentIndex];

		this.add.rectangle(
			constants.MIDDLE_SCREEN_X,
			CARD_DISPLAY_Y + CARD_DISPLAY_BG_OFFSET_Y,
			CARD_DISPLAY_BG_WIDTH,
			CARD_DISPLAY_BG_HEIGHT,
			CARD_DISPLAY_BG_COLOR,
			CARD_DISPLAY_BG_ALPHA
		);

		this.crystalSprite = this.add.image(constants.MIDDLE_SCREEN_X, CARD_DISPLAY_Y, crystal.pic);
		this.crystalSprite.setDisplaySize(CRYSTAL_SPRITE_SIZE, CRYSTAL_SPRITE_SIZE);

		this.tweens.add({
			targets: this.crystalSprite,
			y: CARD_DISPLAY_Y - CRYSTAL_FLOAT_Y_OFFSET,
			duration: CRYSTAL_FLOAT_ANIMATION_DURATION,
			ease: CRYSTAL_FLOAT_EASE,
			yoyo: true,
			repeat: -1,
		});

		this.crystalName = io.Text(getName(crystal.id), {
			...constants.titleTextConfig,
			fontSize: CRYSTAL_NAME_FONT_SIZE,
		});
		io.SetPosition(this.crystalName, vec2(constants.MIDDLE_SCREEN_X, CARD_DISPLAY_Y + 140));
		io.Centralize(this.crystalName);

		this.descriptionText = this.add
			.rexBBCodeText(constants.MIDDLE_SCREEN_X, DESCRIPTION_Y, "", {
				fontSize: DESCRIPTION_FONT_SIZE,
				fontFamily: "Arimo",
				align: "center",
				color: "#ffffff",
			})
			.setOrigin(DESCRIPTION_ORIGIN_X, DESCRIPTION_ORIGIN_Y)
			.setWrapMode(1)
			.setLineSpacing(DESCRIPTION_LINE_SPACING)
			.setWrapWidth(DESCRIPTION_WRAP_WIDTH);
	}

	private createNavigationButtons() {
		createUIButton(
			t("crystalSelection.previous"),
			vec2(constants.MIDDLE_SCREEN_X - NAV_BUTTON_OFFSET_X, CARD_DISPLAY_Y),
			() => this.navigateToPrevious(),
			NAV_BUTTON_WIDTH
		);

		createUIButton(
			t("crystalSelection.next"),
			vec2(constants.MIDDLE_SCREEN_X + NAV_BUTTON_OFFSET_X, CARD_DISPLAY_Y),
			() => this.navigateToNext(),
			NAV_BUTTON_WIDTH
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
				PAGINATION_DOT_COLOR,
				PAGINATION_DOT_INACTIVE_ALPHA
			);
			dot.setStrokeStyle(
				PAGINATION_DOT_STROKE_WIDTH,
				PAGINATION_DOT_STROKE_COLOR,
				PAGINATION_DOT_STROKE_ALPHA
			);
			this.paginationDots.push(dot);
		}
	}

	private createActionButtons() {
		createUIButton(t("crystalSelection.play"), vec2(constants.MIDDLE_SCREEN_X, PLAY_BUTTON_Y), () =>
			this.startGameWithCrystal()
		);

		createUIButton(t("crystalSelection.back"), vec2(constants.MIDDLE_SCREEN_X, BACK_BUTTON_Y), () =>
			this.returnToTitle()
		);
	}

	private navigateToPrevious() {
		this.currentIndex = (this.currentIndex - 1 + this.crystals.length) % this.crystals.length;
		this.updateDisplay();
	}

	private navigateToNext() {
		this.currentIndex = (this.currentIndex + 1) % this.crystals.length;
		this.updateDisplay();
	}

	private updateDisplay() {
		const crystal = this.crystals[this.currentIndex];

		this.crystalSprite.setTexture(crystal.pic);

		this.crystalName.setText(getName(crystal.id));
		io.Centralize(this.crystalName);

		const description = this.buildCrystalDescription(crystal);
		this.descriptionText.setText(description);

		this.paginationDots.forEach((dot, i) => {
			dot.setFillStyle(
				PAGINATION_DOT_COLOR,
				i === this.currentIndex ? PAGINATION_DOT_ACTIVE_ALPHA : PAGINATION_DOT_INACTIVE_ALPHA
			);
		});

		const bg = getCloudsBg();
		if (bg) {
			const preset = this.getColorPresetForCrystal(crystal.id);
			bg.tweenToPreset(preset, CLOUD_BG_ANIMATION_DURATION, CLOUD_BG_ANIMATION_EASE);
		}
	}

	private buildCrystalDescription(crystal: CardDefinition): string {
		const power = crystal.power || 0;

		const effectBlocks = crystal.effects
			.map((e) => buildEffectBlock(e, power))
			.filter((e): e is string => e !== null)
			.map((str) => "- " + str[0].toUpperCase() + str.slice(1));

		const reactionBlocks = crystal.reactions
			.map((r) => getReactionDescription(r, power))
			.map((str) => "- " + str);

		const cdAsSeconds = ((crystal.cooldown || 0) / 1000).toFixed(1);
		const statsBlock = `[color=#c0c0c0]${t("crystalSelection.cooldown")}[/color] [color=#ffa94d]${cdAsSeconds}s[/color]`;

		const lifeBlock = crystal.life
			? ` | [color=#c0c0c0]${t("crystalSelection.life")}[/color] [color=#51cf66]${crystal.life}[/color]`
			: "";

		const allEffects = [...effectBlocks, ...reactionBlocks].join("\n");

		return `${statsBlock}${lifeBlock}\n\n${allEffects || t("crystalSelection.noAbilities")}`;
	}

	private getColorPresetForCrystal(crystalId: string): keyof typeof colorPresets {
		const colorMap: Record<string, keyof typeof colorPresets> = {
			mana_crystal: "nebula",
			critical_crystal: "sunset",
			protective_crystal: "sunset",
			growth_crystal: "forest",
			purple_crystal: "aurora",
			quickstone: "sea",
		};

		return colorMap[crystalId] || "nebula";
	}

	private async startGameWithCrystal() {
		const selectedCrystal = this.crystals[this.currentIndex];

		// Initialize game session through server adapter
		// This works for both single-player and multiplayer
		await io.Fade(300, 0x000000);

		// Stop Battleground scene if it's running to ensure clean start
		this.scene.stop(constants.SCENE_KEYS.BATTLEGROUND);

		// Pass to battleground scene which will initialize via server
		this.scene.start(constants.SCENE_KEYS.BATTLEGROUND, {
			selectedCrystalId: selectedCrystal.id,
			isMultiplayer: this.isMultiplayer,
		});
	}

	private returnToTitle() {
		this.scene.start(constants.SCENE_KEYS.TITLE);
	}

	private createSeedDisplay() {
		this.createSeedInput();
	}

	private createSeedInput() {
		const currentSeed = getSeed();

		const x = constants.SCREEN_WIDTH - 20;
		const y = constants.SCREEN_HEIGHT - 20;
		const width = 200;
		const height = 40;

		// Input Background
		const bg = this.add
			.rectangle(x, y, width, height, 0x000000, 0.5)
			.setOrigin(1, 1)
			.setStrokeStyle(1, 0x888888)
			.setInteractive({ useHandCursor: true });

		// Seed Label
		io.Text("Seed: ", {
			...constants.defaultTextConfig,
			fontSize: "24px",
			color: "#ffffff",
		})
			.setOrigin(1, 0.5)
			.setPosition(x - width - 10, y - height / 2);

		// Seed Text
		this.seedText = io
			.Text(`${currentSeed}`, {
				...constants.defaultTextConfig,
				fontSize: "24px",
				color: "#ffffff",
			})
			.setOrigin(1, 0.5)
			.setPosition(x - 20, y - height / 2);

		// Warning Text
		this.seedWarningText = io
			.Text("Unlocks and stats disabled when using a custom seed", {
				...constants.defaultTextConfig,
				fontSize: "16px",
				color: "#ffff00",
			})
			.setOrigin(1, 0.5)
			.setPosition(x, y - height - 20)
			.setVisible(false);

		// Events
		bg.on("pointerdown", () => {
			this.createKeyboard(this.seedText);
		});

		// Hover effects
		bg.on("pointerover", () => bg.setStrokeStyle(1, 0xffffff));
		bg.on("pointerout", () => bg.setStrokeStyle(1, 0x888888));

		this.add.existing(this.seedText);

		// Cleanup on scene shutdown
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			const existingKeyboard = document.getElementById("virtual-keyboard");
			if (existingKeyboard && document.body.contains(existingKeyboard)) {
				document.body.removeChild(existingKeyboard);
			}
		});
	}

	private createKeyboard(targetText: Phaser.GameObjects.Text) {
		if (document.getElementById("virtual-keyboard")) return;

		const keyboardContainer = document.createElement("div");
		keyboardContainer.id = "virtual-keyboard";
		keyboardContainer.style.position = "absolute";
		keyboardContainer.style.bottom = "80px";
		keyboardContainer.style.right = "20px";
		keyboardContainer.style.backgroundColor = "rgba(30, 30, 30, 0.95)";
		keyboardContainer.style.padding = "10px";
		keyboardContainer.style.borderRadius = "8px";
		keyboardContainer.style.border = "1px solid #555";
		keyboardContainer.style.display = "flex";
		keyboardContainer.style.flexDirection = "column";
		keyboardContainer.style.gap = "5px";
		keyboardContainer.style.zIndex = "1001";
		keyboardContainer.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";

		// Numpad Layout
		const rows = [["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"], ["0"]];

		// Styles
		const btnStyle =
			"width: 40px; height: 40px; background: #444; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-family: monospace; font-size: 18px;";
		const actionBtnStyle =
			"height: 30px; padding: 0 10px; background: #555; color: white; border: 1px solid #777; border-radius: 4px; cursor: pointer; font-size: 12px; font-family: sans-serif;";

		// Key rows
		rows.forEach((row) => {
			const rowDiv = document.createElement("div");
			rowDiv.style.display = "flex";
			rowDiv.style.justifyContent = "center";
			rowDiv.style.gap = "4px";

			row.forEach((char) => {
				const btn = document.createElement("button");
				btn.innerText = char;
				btn.style.cssText = btnStyle;
				if (char === "0") {
					btn.style.width = "40px"; // Keep uniform size
				}
				btn.onmousedown = (e) => {
					e.preventDefault(); // Prevent focus loss
					if (targetText.text.length < 12) {
						targetText.setText(targetText.text + char);
					}
				};
				rowDiv.appendChild(btn);
			});
			keyboardContainer.appendChild(rowDiv);
		});

		// Helper to create buttons
		const createActionBtn = (text: string, onClick: () => void, color: string = "#555") => {
			const btn = document.createElement("button");
			btn.innerText = text;
			btn.style.cssText = actionBtnStyle + `background: ${color};`;
			btn.onclick = onClick;
			return btn;
		};

		const backBtn = createActionBtn(
			"Back",
			() => {
				targetText.setText(`${getSeed()}`);
				this.isSeededRun = false;
				this.seedWarningText.setVisible(false);
				if (document.body.contains(keyboardContainer)) {
					document.body.removeChild(keyboardContainer);
				}
			},
			"#d32f2f"
		);

		const clearBtn = createActionBtn(
			"Clear",
			() => {
				targetText.setText("");
			},
			"#c62828"
		);

		const copyBtn = createActionBtn(
			"Copy",
			() => {
				navigator.clipboard.writeText(targetText.text);
			},
			"#1976d2"
		);

		const pasteBtn = createActionBtn(
			"Paste",
			async () => {
				try {
					const text = await navigator.clipboard.readText();
					const numeric = text.replace(/\D/g, "").slice(0, 12);
					targetText.setText(numeric);
				} catch (err) {
					logger.error("Paste failed", err);
				}
			},
			"#1976d2"
		);

		const backspaceBtn = createActionBtn("⌫", () => {
			const c = targetText.text;
			if (c.length > 0) {
				targetText.setText(c.slice(0, -1));
			}
		});

		const enterBtn = createActionBtn(
			"Enter",
			() => {
				if (targetText.text === "") {
					const newSeed = Date.now();
					setSeed(newSeed);
					targetText.setText(`${newSeed}`);
					this.isSeededRun = false;
					this.seedWarningText.setVisible(false);
				} else {
					const val = parseInt(targetText.text, 10);
					if (!isNaN(val)) {
						setSeed(val);
						targetText.setText(`${val}`);
						this.isSeededRun = true;
						this.seedWarningText.setVisible(true);
					} else {
						// Fallback if parsing fails for some reason (shouldn't with numberpad)
						const newSeed = Date.now();
						setSeed(newSeed);
						targetText.setText(`${newSeed}`);
						this.isSeededRun = false;
						this.seedWarningText.setVisible(false);
					}
				}

				if (document.body.contains(keyboardContainer)) {
					document.body.removeChild(keyboardContainer);
				}
			},
			"#388e3c"
		);
		enterBtn.style.flexGrow = "1";

		// Arrange actions
		const actionsContainer = document.createElement("div");
		actionsContainer.style.display = "grid";
		actionsContainer.style.gridTemplateColumns = "1fr 1fr 1fr";
		actionsContainer.style.gap = "5px";
		actionsContainer.style.marginTop = "5px";

		// Row 1
		actionsContainer.appendChild(copyBtn);
		actionsContainer.appendChild(pasteBtn);
		actionsContainer.appendChild(clearBtn);

		// Row 2
		actionsContainer.appendChild(backBtn);
		actionsContainer.appendChild(backspaceBtn);
		actionsContainer.appendChild(enterBtn);
		enterBtn.style.gridColumn = "span 1";

		keyboardContainer.appendChild(actionsContainer);

		document.body.appendChild(keyboardContainer);

		// Global click listener to close if clicking outside
		const outsideClickListener = (e: MouseEvent) => {
			if (!keyboardContainer.contains(e.target as Node)) {
				if (document.body.contains(keyboardContainer)) {
					document.body.removeChild(keyboardContainer);
				}
				const currentVal = parseInt(targetText.text, 10);
				if (isNaN(currentVal) && targetText.text !== `${getSeed()}`) {
					targetText.setText(`${getSeed()}`);
					this.isSeededRun = false;
					this.seedWarningText.setVisible(false);
				}

				document.removeEventListener("mousedown", outsideClickListener);
			}
		};

		setTimeout(() => {
			document.addEventListener("mousedown", outsideClickListener);
		}, 0);
	}
}
