import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createUIButton, Button } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import {
	checkActiveSessionByType,
	enableMultiplayer,
	logout,
	getPlayerProfile,
	getTopRankedPlayers,
} from "@Multiplayer/MultiplayerManager";

import { setCurrentScene } from "@Models/State";
import { createLogger } from "@Utils/Logger";
import { MultiplayerQueueType } from "@Multiplayer/MultiplayerTypes";

const logger = createLogger("ArenaLobbyScene");

// Layout positioning
const BACKGROUND_COLOR = 0x1a1a2e;
const TITLE_Y = 100;
const PROFILE_TEXT_Y = 200;
const RATING_TEXT_Y = 260;
const FIRST_BUTTON_Y = 500;
const BUTTON_Y_OFFSET = 70;

const RANKING_PAGE_SIZE = 10;
const RANKING_PANEL_WIDTH = 1000;
const RANKING_PANEL_HEIGHT = 700;
const RANKING_OVERLAY_DEPTH = 90;
const RANKING_BUTTONS_DEPTH = 91;

// Title styling
const TITLE_FONT_SIZE = "64px";

// Profile/Rating styling
const PROFILE_FONT_SIZE = "32px";
const RATING_FONT_SIZE = "48px";

export class ArenaLobbyScene extends Phaser.Scene {
	private profileText?: Phaser.GameObjects.Text;
	private ratingText?: Phaser.GameObjects.Text;
	private buttons: Button[] = [];
	private rankingButtons: Button[] = [];
	private loadingOverlay?: Phaser.GameObjects.Container;
	private rankingOverlay?: Phaser.GameObjects.Container;
	private rankingEntriesText?: Phaser.GameObjects.Text;
	private rankingPageText?: Phaser.GameObjects.Text;
	private rankingPrevButton?: Button;
	private rankingNextButton?: Button;
	private rankingCurrentPage: number = 1;

	constructor() {
		super(SCENE_KEYS.ARENA_LOBBY);
	}

	create() {
		setCurrentScene(this);
		this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BACKGROUND_COLOR).setOrigin(0);

		io.Text(t("title.arena"), { fontSize: TITLE_FONT_SIZE, color: "#ffffff" })
			.setPosition(MIDDLE_SCREEN.x, TITLE_Y)
			.setOrigin(0.5);

		this.profileText = io
			.Text("Loading...", { fontSize: PROFILE_FONT_SIZE, color: "#aaaaaa" })
			.setPosition(MIDDLE_SCREEN.x, PROFILE_TEXT_Y)
			.setOrigin(0.5);

		this.ratingText = io
			.Text("", { fontSize: RATING_FONT_SIZE, color: "#ffd700", fontStyle: "bold" })
			.setPosition(MIDDLE_SCREEN.x, RATING_TEXT_Y)
			.setOrigin(0.5);

		// Buttons
		const buttonY = FIRST_BUTTON_Y;

		const casualBtn = createUIButton("Casual", vec2(MIDDLE_SCREEN.x, buttonY), async () => {
			await this.startOrContinueRun("casual");
		});
		this.buttons.push(casualBtn);

		const rankedBtn = createUIButton("Ranked", vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET), async () => {
			await this.startOrContinueRun("ranked");
		});
		this.buttons.push(rankedBtn);

		const leaderboardBtn = createUIButton(
			"Leaderboard",
			vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET * 2),
			async () => {
				await this.openRankingModal();
			}
		);
		this.buttons.push(leaderboardBtn);

		const logoutBtn = createUIButton(
			"Logout",
			vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET * 3),
			async () => {
				this.setLoading(true);
				try {
					await logout();
				} finally {
					this.setLoading(false);
				}
				this.scene.start(SCENE_KEYS.ARENA_LOGIN);
			}
		);
		this.buttons.push(logoutBtn);

		const backBtn = createUIButton(t("ui.menu.back"), vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET * 4), () => {
			this.scene.start(SCENE_KEYS.TITLE);
		});
		this.buttons.push(backBtn);

		const loadingBg = this.add
			.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.5)
			.setOrigin(0);
		const loadingLabel = this.add
			.text(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y, "Loading...", { fontSize: "32px", color: "#ffffff" })
			.setOrigin(0.5);
		this.loadingOverlay = this.add.container(0, 0, [loadingBg, loadingLabel]);
		this.loadingOverlay.setVisible(false).setDepth(100);

		this.setLoading(true);
		this.refreshProfile();
	}

	private setLoading(isLoading: boolean) {
		[...this.buttons, ...this.rankingButtons].forEach(btn => isLoading ? btn.disable() : btn.enable());
		this.loadingOverlay?.setVisible(isLoading);
	}

	private async openRankingModal() {
		if (!this.rankingOverlay) {
			this.createRankingModal();
		}

		this.rankingOverlay?.setVisible(true);
		await this.loadRankingPage(1);
	}

	private createRankingModal() {
		const overlayBg = this.add
			.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.6)
			.setOrigin(0);
		const panel = this.add
			.rectangle(
				MIDDLE_SCREEN.x,
				MIDDLE_SCREEN.y,
				RANKING_PANEL_WIDTH,
				RANKING_PANEL_HEIGHT,
				0x111827,
				0.98
			)
			.setOrigin(0.5);

		const title = this.add
			.text(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y - 280, "Top Ranked Players", {
				fontSize: "42px",
				color: "#ffffff",
				fontStyle: "bold",
			})
			.setOrigin(0.5);

		this.rankingEntriesText = this.add
			.text(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y - 210, "", {
				fontSize: "30px",
				color: "#e5e7eb",
				align: "left",
				lineSpacing: 10,
			})
			.setOrigin(0.5, 0);

		this.rankingPageText = this.add
			.text(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y + 260, "", {
				fontSize: "28px",
				color: "#d1d5db",
			})
			.setOrigin(0.5);

		this.rankingOverlay = this.add.container(0, 0, [overlayBg, panel, title, this.rankingEntriesText, this.rankingPageText]);
		this.rankingOverlay.setDepth(RANKING_OVERLAY_DEPTH);

		this.rankingPrevButton = createUIButton("Previous", vec2(MIDDLE_SCREEN.x - 240, MIDDLE_SCREEN.y + 320), async () => {
			const targetPage = Math.max(1, this.rankingCurrentPage - 1);
			if (targetPage !== this.rankingCurrentPage) {
				await this.loadRankingPage(targetPage);
			}
		});
		this.rankingPrevButton.container.setDepth(RANKING_BUTTONS_DEPTH);

		this.rankingNextButton = createUIButton("Next", vec2(MIDDLE_SCREEN.x + 240, MIDDLE_SCREEN.y + 320), async () => {
			await this.loadRankingPage(this.rankingCurrentPage + 1);
		});
		this.rankingNextButton.container.setDepth(RANKING_BUTTONS_DEPTH);

		const closeButton = createUIButton("Close", vec2(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y + 410), () => {
			this.closeRankingModal();
		});
		closeButton.container.setDepth(RANKING_BUTTONS_DEPTH);

		this.rankingButtons.push(this.rankingPrevButton, this.rankingNextButton, closeButton);
	}

	private closeRankingModal() {
		this.rankingOverlay?.destroy(true);
		this.rankingOverlay = undefined;
		this.rankingEntriesText = undefined;
		this.rankingPageText = undefined;
		this.rankingPrevButton = undefined;
		this.rankingNextButton = undefined;
		this.rankingCurrentPage = 1;

		this.rankingButtons.forEach((button) => button.container.destroy());
		this.rankingButtons = [];
	}

	private async loadRankingPage(page: number) {
		this.setLoading(true);
		try {
			const result = await getTopRankedPlayers(page, RANKING_PAGE_SIZE);
			this.renderRankingPage(result.page, result.hasNextPage, result.players);
		} catch (error) {
			logger.error("Failed to load ranking page", { page, error });
			this.rankingEntriesText?.setText("Failed to load ranking. Please try again.");
			this.rankingPageText?.setText(`Page ${page}`);
			this.rankingPrevButton?.disable();
			this.rankingNextButton?.disable();
		} finally {
			this.setLoading(false);
		}
	}

	private renderRankingPage(
		page: number,
		hasNextPage: boolean,
		players: Array<{ id: string; username: string; rating: number; matches_played: number }>
	) {
		this.rankingCurrentPage = page;
		const firstRankOnPage = (page - 1) * RANKING_PAGE_SIZE + 1;
		if (players.length === 0) {
			this.rankingEntriesText?.setText("No ranked players found.");
		} else {
			const lines = players.map((player, index) => {
				const rank = firstRankOnPage + index;
				const username = player.username || `Guest#${player.id.slice(0, 4)}`;
				return `${String(rank).padStart(2, "0")}. ${username}  Rating ${player.rating}  Matches ${player.matches_played}`;
			});
			this.rankingEntriesText?.setText(lines.join("\n"));
		}

		this.rankingPageText?.setText(`Page ${page}`);
		if (page <= 1) {
			this.rankingPrevButton?.disable();
			this.rankingPrevButton?.container.setVisible(false);
		} else {
			this.rankingPrevButton?.enable();
			this.rankingPrevButton?.container.setVisible(true);
		}

		if (hasNextPage) {
			this.rankingNextButton?.enable();
			this.rankingNextButton?.container.setVisible(true);
		} else {
			this.rankingNextButton?.disable();
			this.rankingNextButton?.container.setVisible(false);
		}
	}

	private async startOrContinueRun(queueType: MultiplayerQueueType) {
		this.setLoading(true);
		try {
			const hasActiveSession = await checkActiveSessionByType(queueType);
			if (hasActiveSession) {
				await enableMultiplayer(undefined, queueType);
				this.scene.start(SCENE_KEYS.BATTLEGROUND, {
					isMultiplayer: true,
					multiplayerQueueType: queueType,
				});
				return;
			}

			this.scene.start(SCENE_KEYS.CRYSTAL_SELECTION, {
				isMultiplayer: true,
				multiplayerQueueType: queueType,
			});
		} catch (e) {
			logger.error('Failed to start run', e);
			this.setLoading(false);
		}
	}

	async refreshProfile() {
		const playerId = localStorage.getItem("mana_player_id");
		if (!playerId) {
			this.scene.start(SCENE_KEYS.ARENA_LOGIN);
		} else {
			try {
				const profile = await getPlayerProfile(playerId);
				this.profileText?.setText(profile.username || `Guest#${profile.id.substr(0, 4)}`);
				this.ratingText?.setText(`Rating: ${profile.rating}`);
				this.setLoading(false);
			} catch (e) {
				logger.error("Profile Fetch Failed", e);
				// Redirect to Login if invalid
				this.scene.start(SCENE_KEYS.ARENA_LOGIN);
			}
		}
	}
}
