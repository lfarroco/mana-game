import Phaser from "phaser";
import {
	defaultTextConfig,
	MIDDLE_SCREEN,
	SCENE_KEYS,
	SCREEN_HEIGHT,
	SCREEN_WIDTH,
	titleTextConfig,
} from "@Constants/constants";
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
import {
	ARENA_BACKGROUND_OVERLAY_ALPHA,
	ARENA_BACKGROUND_OVERLAY_COLOR,
	ARENA_BACKGROUND_SHADER_COLORS,
	ARENA_OVERLAY_ALPHA,
	ARENA_OVERLAY_COLOR,
	ARENA_SURFACE_ALPHA,
	ARENA_SURFACE_BORDER_ALPHA,
	ARENA_SURFACE_BORDER_COLOR,
	ARENA_SURFACE_BORDER_WIDTH,
	ARENA_SURFACE_COLOR,
	ARENA_TABLE_BORDER_COLOR,
	ARENA_TABLE_COLOR,
	ARENA_TABLE_HEADER_COLOR,
	ARENA_TABLE_ROW_BORDER_COLOR,
	ARENA_TABLE_ROW_EVEN_COLOR,
	ARENA_TABLE_ROW_ODD_COLOR,
	ARENA_TEXT_ACCENT,
	ARENA_TEXT_INFO,
	ARENA_TEXT_LABEL,
	ARENA_TEXT_MUTED,
	ARENA_TEXT_PRIMARY,
} from "@Scenes/ArenaLobby/arenaTheme";

const logger = createLogger("ArenaLobbyScene");

// Layout positioning
const TITLE_Y = 100;
const LOBBY_CARD_Y = 530;
const LOBBY_CARD_WIDTH = 560;
const LOBBY_CARD_HEIGHT = 760;
const LOBBY_SECTION_LABEL_Y_OFFSET = 88;
const LOBBY_SECTION_VALUE_Y_OFFSET = 134;
const LOBBY_SECOND_SECTION_LABEL_Y_OFFSET = 202;
const LOBBY_SECOND_SECTION_VALUE_Y_OFFSET = 248;
const LOBBY_LABEL_X_PADDING = 58;
const FIRST_BUTTON_Y_OFFSET = 340;
const BUTTON_Y_OFFSET = 74;
const FULL_WIDTH_BUTTON = 500;
const HALF_WIDTH_BUTTON_GAP = 16;
const HALF_WIDTH_BUTTON = (FULL_WIDTH_BUTTON - HALF_WIDTH_BUTTON_GAP) / 2;

const RANKING_PAGE_SIZE = 10;
const RANKING_PANEL_WIDTH = 1080;
const RANKING_PANEL_HEIGHT = 940;
const RANKING_TABLE_CARD_Y = -90;
const RANKING_TABLE_CARD_WIDTH = RANKING_PANEL_WIDTH - 120;
const RANKING_TABLE_CARD_HEIGHT = 520;
const RANKING_HEADER_Y = -290;
const RANKING_TABLE_WIDTH = RANKING_PANEL_WIDTH - 160;
const RANKING_ROW_WIDTH = RANKING_TABLE_WIDTH - 30;
const RANKING_ROW_HEIGHT = 36;
const RANKING_ROW_SPACING = 42;
const RANKING_FIRST_ROW_Y = -246;
const RANKING_RANK_X = -420;
const RANKING_PLAYER_X = -285;
const RANKING_RATING_X = 250;
const RANKING_MATCHES_X = 410;
const RANKING_PAGE_TEXT_Y = 248;
const RANKING_BUTTONS_Y = 322;
const RANKING_CLOSE_Y = 408;

// Title styling
const TITLE_FONT_SIZE = "64px";

// Profile/Rating styling
const PROFILE_FONT_SIZE = "32px";
const RATING_FONT_SIZE = "48px";
const FIELD_LABEL_FONT_SIZE = "18px";

const createArenaText = (
	text: string,
	style: Phaser.Types.GameObjects.Text.TextStyle = {}
) => io.Text(text, { ...defaultTextConfig, ...style });

const createArenaTitleText = (
	text: string,
	style: Phaser.Types.GameObjects.Text.TextStyle = {}
) => io.Text(text, { ...titleTextConfig, ...style });

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
			customColors: ARENA_BACKGROUND_SHADER_COLORS,
			timeScale: 0.9,
		});
		this.add
			.rectangle(
				0,
				0,
				SCREEN_WIDTH,
				SCREEN_HEIGHT,
				ARENA_BACKGROUND_OVERLAY_COLOR,
				ARENA_BACKGROUND_OVERLAY_ALPHA
			)
			.setOrigin(0);

		createArenaTitleText(t("title.arena"), {
			fontSize: TITLE_FONT_SIZE,
			color: ARENA_TEXT_PRIMARY,
		})
			.setPosition(MIDDLE_SCREEN.x, TITLE_Y)
			.setOrigin(0.5);

		const cardTop = LOBBY_CARD_Y - LOBBY_CARD_HEIGHT / 2;
		const cardLeft = MIDDLE_SCREEN.x - LOBBY_CARD_WIDTH / 2;
		const fieldLabelX = cardLeft + LOBBY_LABEL_X_PADDING;
		const fieldValueX = fieldLabelX;
		const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			...defaultTextConfig,
			fontSize: FIELD_LABEL_FONT_SIZE,
			color: ARENA_TEXT_LABEL,
			fontStyle: "bold",
			align: "left",
		};
		const profileTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			...defaultTextConfig,
			fontSize: PROFILE_FONT_SIZE,
			color: ARENA_TEXT_PRIMARY,
			align: "left",
		};
		const ratingTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			...defaultTextConfig,
			fontSize: RATING_FONT_SIZE,
			color: ARENA_TEXT_ACCENT,
			fontStyle: "bold",
			align: "left",
		};

		this.add
			.rectangle(
				MIDDLE_SCREEN.x,
				LOBBY_CARD_Y,
				LOBBY_CARD_WIDTH,
				LOBBY_CARD_HEIGHT,
				ARENA_SURFACE_COLOR,
				ARENA_SURFACE_ALPHA
			)
			.setOrigin(0.5)
			.setStrokeStyle(
				ARENA_SURFACE_BORDER_WIDTH,
				ARENA_SURFACE_BORDER_COLOR,
				ARENA_SURFACE_BORDER_ALPHA
			);

		createArenaText("PLAYER", labelStyle)
			.setPosition(fieldLabelX, cardTop + LOBBY_SECTION_LABEL_Y_OFFSET)
			.setOrigin(0, 0.5);
		this.profileText = createArenaText("Loading...", profileTextStyle)
			.setPosition(fieldValueX, cardTop + LOBBY_SECTION_VALUE_Y_OFFSET)
			.setOrigin(0, 0.5);

		createArenaText("RATING", labelStyle)
			.setPosition(fieldLabelX, cardTop + LOBBY_SECOND_SECTION_LABEL_Y_OFFSET)
			.setOrigin(0, 0.5);
		this.ratingText = createArenaText("", ratingTextStyle)
			.setPosition(fieldValueX, cardTop + LOBBY_SECOND_SECTION_VALUE_Y_OFFSET)
			.setOrigin(0, 0.5);

		// Buttons
		const buttonY = cardTop + FIRST_BUTTON_Y_OFFSET;

		const casualBtn = createUIButton(
			"CASUAL",
			vec2(MIDDLE_SCREEN.x, buttonY),
			async () => {
				await this.startOrContinueRun("casual");
			},
			FULL_WIDTH_BUTTON,
			"🏖️"
		);
		this.buttons.push(casualBtn);

		const rankedBtn = createUIButton(
			"RANKED",
			vec2(MIDDLE_SCREEN.x, buttonY + BUTTON_Y_OFFSET),
			async () => {
				await this.startOrContinueRun("ranked");
			},
			FULL_WIDTH_BUTTON,
			"⚔️"
		);
		this.buttons.push(rankedBtn);

		const leaderboardBtn = createUIButton(
			"LEADERBOARD",
			vec2(MIDDLE_SCREEN.x - HALF_WIDTH_BUTTON / 2 - HALF_WIDTH_BUTTON_GAP / 2, buttonY + BUTTON_Y_OFFSET * 2),
			async () => {
				await this.openRankingModal();
			},
			HALF_WIDTH_BUTTON,
			"🏆"
		);
		this.buttons.push(leaderboardBtn);

		this.accountButton = createUIButton(
			"ACCOUNT",
			vec2(MIDDLE_SCREEN.x + HALF_WIDTH_BUTTON / 2 + HALF_WIDTH_BUTTON_GAP / 2, buttonY + BUTTON_Y_OFFSET * 2),
			() => {
				this.scene.start(SCENE_KEYS.ARENA_LOGIN, {
					mode: this.accountState.isGuest ? "convertGuestAccount" : "manageAccount",
					returnSceneKey: SCENE_KEYS.ARENA_LOBBY,
				});
			},
			HALF_WIDTH_BUTTON,
			"🔑"
		);
		this.buttons.push(this.accountButton);
		this.accountButton.container.setVisible(false);

		const logoutBtn = createUIButton(
			"LOGOUT",
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

		const loadingBg = this.add.rectangle(
			0,
			0,
			SCREEN_WIDTH,
			SCREEN_HEIGHT,
			ARENA_OVERLAY_COLOR,
			ARENA_OVERLAY_ALPHA
		).setOrigin(0);
		const loadingLabel = createArenaText("Loading...", {
				fontSize: "32px",
				color: ARENA_TEXT_PRIMARY,
			})
			.setPosition(MIDDLE_SCREEN.x, MIDDLE_SCREEN.y)
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
			panelConfig: {
				backgroundColor: ARENA_SURFACE_COLOR,
				backgroundAlpha: ARENA_SURFACE_ALPHA,
				borderColor: ARENA_SURFACE_BORDER_COLOR,
				borderAlpha: ARENA_SURFACE_BORDER_ALPHA,
				borderWidth: ARENA_SURFACE_BORDER_WIDTH,
			},
			overlayColor: ARENA_OVERLAY_COLOR,
			overlayAlpha: ARENA_OVERLAY_ALPHA,
		});

		const createTableText = (
			x: number,
			y: number,
			text: string,
			style: Phaser.Types.GameObjects.Text.TextStyle,
			originX: number = 0
		) => createArenaText(text, style).setPosition(x, y).setOrigin(originX, 0.5);

		const tableCard = this.add
			.rectangle(
				0,
				RANKING_TABLE_CARD_Y,
				RANKING_TABLE_CARD_WIDTH,
				RANKING_TABLE_CARD_HEIGHT,
				ARENA_TABLE_COLOR,
				0.82
			)
			.setOrigin(0.5)
			.setStrokeStyle(2, ARENA_TABLE_BORDER_COLOR, 0.9);
		const headerBackground = this.add
			.rectangle(0, RANKING_HEADER_Y, RANKING_TABLE_WIDTH, 44, ARENA_TABLE_HEADER_COLOR, 0.95)
			.setOrigin(0.5)
			.setStrokeStyle(1, ARENA_TABLE_BORDER_COLOR, 0.9);

		const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			...defaultTextConfig,
			fontSize: "22px",
			color: ARENA_TEXT_INFO,
			fontStyle: "bold",
		};
		const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
			...defaultTextConfig,
			fontSize: "24px",
			color: ARENA_TEXT_PRIMARY,
			align: "left",
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
					index % 2 === 0 ? ARENA_TABLE_ROW_EVEN_COLOR : ARENA_TABLE_ROW_ODD_COLOR,
					0.92
				)
				.setOrigin(0.5)
				.setStrokeStyle(1, ARENA_TABLE_ROW_BORDER_COLOR, 0.75);

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

		this.rankingEmptyStateText = createArenaText("", {
				fontSize: "28px",
				color: ARENA_TEXT_MUTED,
				align: "center",
				wordWrap: { width: 600 },
			})
			.setPosition(0, -70)
			.setOrigin(0.5)
			.setVisible(false);

		this.rankingPageText = createArenaText("", {
				fontSize: "24px",
				color: ARENA_TEXT_MUTED,
			})
			.setPosition(0, RANKING_PAGE_TEXT_Y)
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
				row.usernameText.setText(this.formatRankingUsername(username)).setColor(ARENA_TEXT_PRIMARY);
				row.ratingText.setText(`${player.rating}`).setColor("#fde68a");
				row.matchesText.setText(`${player.matches_played}`).setColor(ARENA_TEXT_INFO);
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
		return ARENA_TEXT_INFO;
	}

	private getRankingRowColor(rank: number, index: number): number {
		if (rank === 1) return 0x3b2f0f;
		if (rank === 2) return 0x243244;
		if (rank === 3) return 0x3c2415;
		return index % 2 === 0 ? ARENA_TABLE_ROW_EVEN_COLOR : ARENA_TABLE_ROW_ODD_COLOR;
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
