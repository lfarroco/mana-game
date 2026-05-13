import Phaser from "phaser";
import { SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN, SCENE_KEYS } from "@Constants/constants";
import * as io from "@PhaserIO";
import { createModal, type Modal } from "@Components/Modal";
import { createUIButton, Button } from "@Components/UIButton";
import { CloudsBackground } from "@Components/cloudBackground/CloudsBackground";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import {
	checkActiveSessionByType,
	enableMultiplayer,
	logout,
	getPlayerProfile,
	getCurrentAccountState,
	getTopRankedPlayers,
} from "@Multiplayer/MultiplayerManager";

import { setCurrentScene } from "@Models/State";
import { createLogger } from "@Utils/Logger";
import { MultiplayerQueueType } from "@Multiplayer/MultiplayerTypes";

const logger = createLogger("ArenaLobbyScene");

// Layout positioning
const TITLE_Y = 100;
const LOBBY_CARD_Y = 510;
const LOBBY_CARD_WIDTH = 520;
const LOBBY_CARD_HEIGHT = 720;
const LOBBY_CARD_ACCENT_Y = 185;
const LOBBY_SECTION_LABEL_Y_OFFSET = 140;
const LOBBY_SECTION_VALUE_Y_OFFSET = 186;
const LOBBY_SECOND_SECTION_LABEL_Y_OFFSET = 250;
const LOBBY_SECOND_SECTION_VALUE_Y_OFFSET = 296;
const LOBBY_LABEL_X_PADDING = 58;
const LOBBY_VALUE_BOX_WIDTH = 404;
const LOBBY_VALUE_BOX_HEIGHT = 58;
const FIRST_BUTTON_Y = 560;
const BUTTON_Y_OFFSET = 78;
const FULL_WIDTH_BUTTON = 404;
const HALF_WIDTH_BUTTON_GAP = 16;
const HALF_WIDTH_BUTTON = (FULL_WIDTH_BUTTON - HALF_WIDTH_BUTTON_GAP) / 2;

const RANKING_PAGE_SIZE = 10;
const RANKING_PANEL_WIDTH = 1080;
const RANKING_PANEL_HEIGHT = 840;
const RANKING_SUBTITLE_Y = -300;
const RANKING_ACCENT_Y = -270;
const RANKING_TABLE_CARD_Y = -50;
const RANKING_TABLE_CARD_WIDTH = RANKING_PANEL_WIDTH - 120;
const RANKING_TABLE_CARD_HEIGHT = 470;
const RANKING_HEADER_Y = -230;
const RANKING_TABLE_WIDTH = RANKING_PANEL_WIDTH - 160;
const RANKING_ROW_WIDTH = RANKING_TABLE_WIDTH - 30;
const RANKING_ROW_HEIGHT = 36;
const RANKING_ROW_SPACING = 42;
const RANKING_FIRST_ROW_Y = -186;
const RANKING_RANK_X = -420;
const RANKING_PLAYER_X = -285;
const RANKING_RATING_X = 250;
const RANKING_MATCHES_X = 410;
const RANKING_PAGE_TEXT_Y = 214;
const RANKING_BUTTONS_Y = 282;
const RANKING_CLOSE_Y = 370;

// Title styling
const TITLE_FONT_SIZE = "64px";

// Profile/Rating styling
const PROFILE_FONT_SIZE = "32px";
const RATING_FONT_SIZE = "48px";
const FIELD_LABEL_FONT_SIZE = "18px";
const LOBBY_BACKGROUND_OVERLAY_COLOR = 0x22070a;
const LOBBY_BACKGROUND_OVERLAY_ALPHA = 0.35;
const LOBBY_CARD_COLOR = 0x1f0f16;
const LOBBY_CARD_ALPHA = 0.82;
const LOBBY_CARD_BORDER_COLOR = 0x8b3a3a;
const LOBBY_CARD_ACCENT_COLOR = 0xff7a59;
const LOBBY_VALUE_BOX_COLOR = 0x2a1016;
const LOBBY_VALUE_BOX_BORDER_COLOR = 0xa04949;
const LOBBY_LABEL_COLOR = "#fecaca";
const LOBBY_PROFILE_COLOR = "#fff7ed";
const LOBBY_RATING_COLOR = "#fde68a";

const LOBBY_BACKGROUND_COLORS = {
	color1: { x: 0.08, y: 0.03, z: 0.08 },
	color2: { x: 0.32, y: 0.06, z: 0.12 },
	color3: { x: 0.82, y: 0.24, z: 0.16 },
	color4: { x: 0.96, y: 0.48, z: 0.2 },
	color5: { x: 1.0, y: 0.86, z: 0.72 },
} as const;

type RankedPlayer = {
	id: string;
	username: string;
	rating: number;
	matches_played: number;
};

type RankingRow = {
	background: Phaser.GameObjects.Rectangle;
	rankText: Phaser.GameObjects.Text;
	usernameText: Phaser.GameObjects.Text;
	ratingText: Phaser.GameObjects.Text;
	matchesText: Phaser.GameObjects.Text;
};

export class ArenaLobbyScene extends Phaser.Scene {
	private profileText?: Phaser.GameObjects.Text;
	private ratingText?: Phaser.GameObjects.Text;
	private buttons: Button[] = [];
	private rankingButtons: Button[] = [];
	private loadingOverlay?: Phaser.GameObjects.Container;
	private rankingModal?: Modal;
	private rankingRows: RankingRow[] = [];
	private rankingEmptyStateText?: Phaser.GameObjects.Text;
	private rankingPageText?: Phaser.GameObjects.Text;
	private rankingPrevButton?: Button;
	private rankingNextButton?: Button;
	private rankingCurrentPage: number = 1;
	private accountButton?: Button;
	private accountState = { isGuest: false };

	constructor() {
		super(SCENE_KEYS.ARENA_LOBBY);
	}

	create() {
		setCurrentScene(this);
		this.buttons = [];
		this.rankingButtons = [];
		this.rankingRows = [];
		this.rankingModal = undefined;
		this.rankingEmptyStateText = undefined;
		this.rankingPageText = undefined;
		this.rankingPrevButton = undefined;
		this.rankingNextButton = undefined;
		this.rankingCurrentPage = 1;
		this.accountButton = undefined;
		this.accountState = { isGuest: false };

		new CloudsBackground({
			customColors: LOBBY_BACKGROUND_COLORS,
			timeScale: 0.9,
		});
		this.add
			.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, LOBBY_BACKGROUND_OVERLAY_COLOR, LOBBY_BACKGROUND_OVERLAY_ALPHA)
			.setOrigin(0);

		io.Text(t("title.arena"), { fontSize: TITLE_FONT_SIZE, color: "#ffffff" })
			.setPosition(MIDDLE_SCREEN.x, TITLE_Y)
			.setOrigin(0.5);

		const cardTop = LOBBY_CARD_Y - LOBBY_CARD_HEIGHT / 2;
		const cardLeft = MIDDLE_SCREEN.x - LOBBY_CARD_WIDTH / 2;
		const fieldLabelX = cardLeft + LOBBY_LABEL_X_PADDING;
		const fieldValueX = fieldLabelX + 18;
		const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			fontSize: FIELD_LABEL_FONT_SIZE,
			color: LOBBY_LABEL_COLOR,
			fontStyle: "bold",
		};

		this.add
			.rectangle(
				MIDDLE_SCREEN.x,
				LOBBY_CARD_Y,
				LOBBY_CARD_WIDTH,
				LOBBY_CARD_HEIGHT,
				LOBBY_CARD_COLOR,
				LOBBY_CARD_ALPHA
			)
			.setOrigin(0.5)
			.setStrokeStyle(2, LOBBY_CARD_BORDER_COLOR, 0.95);
		this.add
			.rectangle(MIDDLE_SCREEN.x, cardTop + LOBBY_CARD_ACCENT_Y, 220, 4, LOBBY_CARD_ACCENT_COLOR, 0.95)
			.setOrigin(0.5);

		this.add
			.text(fieldLabelX, cardTop + LOBBY_SECTION_LABEL_Y_OFFSET, "PLAYER", labelStyle)
			.setOrigin(0, 0.5);
		this.add
			.rectangle(
				MIDDLE_SCREEN.x,
				cardTop + LOBBY_SECTION_VALUE_Y_OFFSET,
				LOBBY_VALUE_BOX_WIDTH,
				LOBBY_VALUE_BOX_HEIGHT,
				LOBBY_VALUE_BOX_COLOR,
				0.95
			)
			.setOrigin(0.5)
			.setStrokeStyle(1, LOBBY_VALUE_BOX_BORDER_COLOR, 0.9);
		this.profileText = this.add
			.text(fieldValueX, cardTop + LOBBY_SECTION_VALUE_Y_OFFSET, "Loading...", {
				fontSize: PROFILE_FONT_SIZE,
				color: LOBBY_PROFILE_COLOR,
			})
			.setOrigin(0, 0.5);

		this.add
			.text(fieldLabelX, cardTop + LOBBY_SECOND_SECTION_LABEL_Y_OFFSET, "RATING", labelStyle)
			.setOrigin(0, 0.5);
		this.add
			.rectangle(
				MIDDLE_SCREEN.x,
				cardTop + LOBBY_SECOND_SECTION_VALUE_Y_OFFSET,
				LOBBY_VALUE_BOX_WIDTH,
				LOBBY_VALUE_BOX_HEIGHT,
				LOBBY_VALUE_BOX_COLOR,
				0.95
			)
			.setOrigin(0.5)
			.setStrokeStyle(1, LOBBY_VALUE_BOX_BORDER_COLOR, 0.9);
		this.ratingText = this.add
			.text(fieldValueX, cardTop + LOBBY_SECOND_SECTION_VALUE_Y_OFFSET, "", {
				fontSize: RATING_FONT_SIZE,
				color: LOBBY_RATING_COLOR,
				fontStyle: "bold",
			})
			.setOrigin(0, 0.5);

		// Buttons
		const buttonY = FIRST_BUTTON_Y;

		const casualBtn = createUIButton(
			"Casual",
			vec2(MIDDLE_SCREEN.x, buttonY),
			async () => {
				await this.startOrContinueRun("casual");
			},
			FULL_WIDTH_BUTTON
		);
		this.buttons.push(casualBtn);

		const rankedBtn = createUIButton(
			"Ranked",
			vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET),
			async () => {
				await this.startOrContinueRun("ranked");
			},
			FULL_WIDTH_BUTTON
		);
		this.buttons.push(rankedBtn);

		const leaderboardBtn = createUIButton(
			"Leaderboard",
			vec2(MIDDLE_SCREEN.x - HALF_WIDTH_BUTTON / 2 - HALF_WIDTH_BUTTON_GAP / 2, buttonY + BUTTON_Y_OFFSET * 2),
			async () => {
				await this.openRankingModal();
			},
			HALF_WIDTH_BUTTON
		);
		this.buttons.push(leaderboardBtn);

		this.accountButton = createUIButton(
			"Account",
			vec2(MIDDLE_SCREEN.x + HALF_WIDTH_BUTTON / 2 + HALF_WIDTH_BUTTON_GAP / 2, buttonY + BUTTON_Y_OFFSET * 2),
			() => {
				this.scene.start(SCENE_KEYS.ARENA_LOGIN, {
					mode: this.accountState.isGuest ? "convertGuestAccount" : "manageAccount",
					returnSceneKey: SCENE_KEYS.ARENA_LOBBY,
				});
			},
			HALF_WIDTH_BUTTON
		);
		this.buttons.push(this.accountButton);
		this.accountButton.container.setVisible(false);

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
			},
			FULL_WIDTH_BUTTON
		);
		this.buttons.push(logoutBtn);

		const backBtn = createUIButton(
			t("ui.menu.back"),
			vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET * 4),
			() => {
				this.scene.start(SCENE_KEYS.TITLE);
			},
			FULL_WIDTH_BUTTON
		);
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
		[...this.buttons, ...this.rankingButtons]
			.filter(btn => Boolean(btn.container.scene))
			.forEach(btn => isLoading ? btn.disable() : btn.enable());
		this.loadingOverlay?.setVisible(isLoading);
	}

	private setButtonVisibility(button: Button | undefined, visible: boolean) {
		if (!button) {
			return;
		}

		button.container.setVisible(visible);
	}

	private async openRankingModal() {
		if (!this.rankingModal) {
			this.createRankingModal();
		}

		await this.loadRankingPage(1);
	}

	private createRankingModal() {
		this.rankingModal = createModal({
			width: RANKING_PANEL_WIDTH,
			height: RANKING_PANEL_HEIGHT,
			title: "Leaderboard",
		});

		const createTableText = (
			x: number,
			y: number,
			text: string,
			style: Phaser.Types.GameObjects.Text.TextStyle,
			originX: number = 0
		) => this.add.text(x, y, text, style).setOrigin(originX, 0.5);

		const subtitle = this.add
			.text(0, RANKING_SUBTITLE_Y, "Top ranked players in Arena", {
				fontSize: "24px",
				color: "#cbd5e1",
			})
			.setOrigin(0.5);
		const accent = this.add
			.rectangle(0, RANKING_ACCENT_Y, 280, 4, 0x60a5fa, 0.95)
			.setOrigin(0.5);
		const tableCard = this.add
			.rectangle(
				0,
				RANKING_TABLE_CARD_Y,
				RANKING_TABLE_CARD_WIDTH,
				RANKING_TABLE_CARD_HEIGHT,
				0x0f172a,
				0.82
			)
			.setOrigin(0.5)
			.setStrokeStyle(2, 0x334155, 0.9);
		const headerBackground = this.add
			.rectangle(0, RANKING_HEADER_Y, RANKING_TABLE_WIDTH, 44, 0x1e293b, 0.95)
			.setOrigin(0.5)
			.setStrokeStyle(1, 0x475569, 0.9);

		const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			fontSize: "22px",
			color: "#93c5fd",
			fontStyle: "bold",
		};
		const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			fontSize: "24px",
			color: "#f8fafc",
		};

		const headers = [
			createTableText(RANKING_RANK_X, RANKING_HEADER_Y, "RANK", headerStyle),
			createTableText(RANKING_PLAYER_X, RANKING_HEADER_Y, "PLAYER", headerStyle),
			createTableText(RANKING_RATING_X, RANKING_HEADER_Y, "RATING", headerStyle, 1),
			createTableText(RANKING_MATCHES_X, RANKING_HEADER_Y, "MATCHES", headerStyle, 1),
		];

		this.rankingRows = Array.from({ length: RANKING_PAGE_SIZE }, (_, index) => {
			const rowY = RANKING_FIRST_ROW_Y + index * RANKING_ROW_SPACING;
			const background = this.add
				.rectangle(
					0,
					rowY,
					RANKING_ROW_WIDTH,
					RANKING_ROW_HEIGHT,
					index % 2 === 0 ? 0x172033 : 0x111827,
					0.92
				)
				.setOrigin(0.5)
				.setStrokeStyle(1, 0x243041, 0.75);

			const row: RankingRow = {
				background,
				rankText: createTableText(RANKING_RANK_X, rowY, "", rowStyle),
				usernameText: createTableText(RANKING_PLAYER_X, rowY, "", rowStyle),
				ratingText: createTableText(RANKING_RATING_X, rowY, "", rowStyle, 1),
				matchesText: createTableText(RANKING_MATCHES_X, rowY, "", rowStyle, 1),
			};

			this.setRankingRowVisible(row, false);
			return row;
		});

		this.rankingEmptyStateText = this.add
			.text(0, -10, "", {
				fontSize: "28px",
				color: "#cbd5e1",
				align: "center",
				wordWrap: { width: 600 },
			})
			.setOrigin(0.5)
			.setVisible(false);

		this.rankingPageText = this.add
			.text(0, RANKING_PAGE_TEXT_Y, "", {
				fontSize: "24px",
				color: "#cbd5e1",
			})
			.setOrigin(0.5);

		this.rankingPrevButton = createUIButton("Previous", vec2(-210, RANKING_BUTTONS_Y), async () => {
			if (this.rankingCurrentPage > 1) {
				await this.loadRankingPage(this.rankingCurrentPage - 1);
			}
		});
		this.rankingNextButton = createUIButton("Next", vec2(210, RANKING_BUTTONS_Y), async () => {
			await this.loadRankingPage(this.rankingCurrentPage + 1);
		});
		const closeButton = createUIButton("Close", vec2(0, RANKING_CLOSE_Y), () => {
			void this.closeRankingModal();
		});

		this.rankingButtons = [this.rankingPrevButton, this.rankingNextButton, closeButton];
		this.rankingModal.container.add([
			subtitle,
			accent,
			tableCard,
			headerBackground,
			...headers,
			...this.rankingRows.flatMap((row) => [
				row.background,
				row.rankText,
				row.usernameText,
				row.ratingText,
				row.matchesText,
			]),
			this.rankingEmptyStateText,
			this.rankingPageText,
			this.rankingPrevButton.container,
			this.rankingNextButton.container,
			closeButton.container,
		]);
	}

	private async closeRankingModal() {
		const modal = this.rankingModal;
		this.rankingModal = undefined;
		this.rankingRows = [];
		this.rankingEmptyStateText = undefined;
		this.rankingPageText = undefined;
		this.rankingPrevButton = undefined;
		this.rankingNextButton = undefined;
		this.rankingCurrentPage = 1;
		this.rankingButtons = [];

		if (modal) {
			await modal.close();
		}
	}

	private async loadRankingPage(page: number) {
		this.setLoading(true);
		try {
			const result = await getTopRankedPlayers(page, RANKING_PAGE_SIZE);
			this.renderRankingPage(result.page, result.hasNextPage, result.players);
		} catch (error) {
			logger.error("Failed to load ranking page", { page, error });
			this.renderRankingEmptyState("Failed to load ranking. Please try again.");
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
		players: RankedPlayer[]
	) {
		this.rankingCurrentPage = page;
		const firstRankOnPage = (page - 1) * RANKING_PAGE_SIZE + 1;
		if (players.length === 0) {
			this.renderRankingEmptyState("No ranked players found.");
		} else {
			this.rankingEmptyStateText?.setVisible(false);

			this.rankingRows.forEach((row, index) => {
				const player = players[index];
				if (!player) {
					this.setRankingRowVisible(row, false);
					return;
				}

				const rank = firstRankOnPage + index;
				const username = player.username || `Guest#${player.id.slice(0, 4)}`;
				row.background.setFillStyle(this.getRankingRowColor(rank, index), 0.92);
				row.rankText.setText(`#${rank}`).setColor(this.getRankingAccentColor(rank));
				row.usernameText.setText(this.formatRankingUsername(username)).setColor("#f8fafc");
				row.ratingText.setText(`${player.rating}`).setColor("#fde68a");
				row.matchesText.setText(`${player.matches_played}`).setColor("#bfdbfe");
				this.setRankingRowVisible(row, true);
			});
		}

		this.rankingPageText?.setText(
			hasNextPage ? `Page ${page} | More challengers ahead` : `Page ${page} | End of leaderboard`
		);
		this.setRankingButtonVisibility(this.rankingPrevButton, page > 1);
		this.setRankingButtonVisibility(this.rankingNextButton, hasNextPage);
	}

	private renderRankingEmptyState(message: string) {
		this.rankingRows.forEach((row) => this.setRankingRowVisible(row, false));
		this.rankingEmptyStateText?.setText(message).setVisible(true);
	}

	private setRankingButtonVisibility(button: Button | undefined, visible: boolean) {
		if (!button) {
			return;
		}

		button.container.setVisible(visible);
		if (visible) {
			button.enable();
			return;
		}

		button.disable();
	}

	private setRankingRowVisible(row: RankingRow, visible: boolean) {
		row.background.setVisible(visible);
		row.rankText.setVisible(visible);
		row.usernameText.setVisible(visible);
		row.ratingText.setVisible(visible);
		row.matchesText.setVisible(visible);
	}

	private getRankingAccentColor(rank: number): string {
		if (rank === 1) return "#facc15";
		if (rank === 2) return "#e2e8f0";
		if (rank === 3) return "#f59e0b";
		return "#93c5fd";
	}

	private getRankingRowColor(rank: number, index: number): number {
		if (rank === 1) return 0x3b2f0f;
		if (rank === 2) return 0x243244;
		if (rank === 3) return 0x3c2415;
		return index % 2 === 0 ? 0x172033 : 0x111827;
	}

	private formatRankingUsername(username: string): string {
		const maxLength = 24;
		if (username.length <= maxLength) {
			return username;
		}

		return `${username.slice(0, maxLength - 3)}...`;
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
				const accountState = await getCurrentAccountState();
				this.accountState = accountState;
				const displayName = accountState.username || profile.username || `Guest#${profile.id.slice(0, 4)}`;
				this.profileText?.setText(displayName);
				this.ratingText?.setText(`${profile.rating}`);
				this.setButtonVisibility(this.accountButton, true);
				this.setLoading(false);
			} catch (e) {
				logger.error("Profile Fetch Failed", e);
				// Redirect to Login if invalid
				this.scene.start(SCENE_KEYS.ARENA_LOGIN);
			}
		}
	}
}
