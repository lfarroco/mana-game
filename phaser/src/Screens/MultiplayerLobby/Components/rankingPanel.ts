import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as UIButton from "@Components/Button/UIButton";
import * as theme from "@Screens/Battleground/Components/UI/theme";
import { env } from "@Env";
import {
	remoteServer,
	RemoteServerError,
	RANKING_PAGE_SIZE,
	type MultiplayerProfile,
	type RankingPage,
} from "../../../RemoteServer";

const HEADER_Y = 250;
const LIST_TOP_Y = 320;
const ROW_GAP = 36;
const ROWS_PER_COLUMN = 10;
const COLUMN_OFFSET_X = 300;
const NAV_Y = 730;

// Panel backdrop (same bordered style as the lobby panels): spans both
// columns, from just below the tab row down past the page nav.
const PANEL_WIDTH = 1120;
const PANEL_CENTER_Y = 495;
const PANEL_HEIGHT = 560;

const GOLD = "#FFD700";
const NAME_COLOR = "#ecf0f1";
const MUTED_COLOR = theme.UI_TEXT_MUTED;

/**
 * Ranking tab content for the multiplayer lobby — the viewer's own rank in
 * gold above a paginated leaderboard (20 rows per page in two columns of
 * ten, `GET /api/v1/players/ranking`). Pages load lazily: the first fetch
 * fires on the first `show()`, and PREV/NEXT refetch. Stale responses (a
 * page turned twice quickly, or the screen destroyed mid-flight) are dropped
 * via a generation counter + a destroyed flag.
 */
export type RankingPanelElement = {
	container: Phaser.GameObjects.Container;
	/** Show the tab (lazy-loads the first page) — hides the lobby content. */
	show: () => void;
	/** Hide the tab. */
	hide: () => void;
	/** Mark stale so late fetches never touch destroyed objects. */
	destroy: () => void;
};

export function create(
	profile: MultiplayerProfile,
	hooks: {
		/** The persisted Bearer token expired — send the player to re-login. */
		onAuthError: () => void;
	}
): RankingPanelElement {
	const cx = constants.MIDDLE_SCREEN_X;
	let destroyed = false;
	let generation = 0;
	let currentPage = 1;
	let totalPages = 1;
	let loadedOnce = false;

	const bg = env.borderedRoundRect(
		[cx, PANEL_CENTER_Y],
		[PANEL_WIDTH, PANEL_HEIGHT],
		20,
		theme.UI_SURFACE_COLOR,
		theme.UI_SURFACE_ALPHA
	);

	const header = env.scene.add
		.text(cx, HEADER_Y, i18n.t("lobby.rankingLoading"), {
			...constants.titleTextConfig,
			fontSize: "34px",
			color: GOLD,
		})
		.setOrigin(0.5);

	const status = env.scene.add
		.text(cx, LIST_TOP_Y + 150, "", {
			...constants.defaultTextConfig,
			fontSize: "22px",
			color: NAME_COLOR,
			align: "center",
		})
		.setOrigin(0.5);

	const rowsLayer = env.scene.add.container();
	const navLayer = env.scene.add.container();

	const prevBtn = UIButton.create({
		text: i18n.t("lobby.rankingPrev"),
		position: [cx - 300, NAV_Y],
		width: 200,
		callback: () => {
			if (currentPage > 1) void loadPage(currentPage - 1);
		},
	});
	const nextBtn = UIButton.create({
		text: i18n.t("lobby.rankingNext"),
		position: [cx + 300, NAV_Y],
		width: 200,
		callback: () => {
			if (currentPage < totalPages) void loadPage(currentPage + 1);
		},
	});
	const pageLabel = env.scene.add
		.text(cx, NAV_Y, "", {
			...constants.defaultTextConfig,
			fontSize: "22px",
			color: MUTED_COLOR,
		})
		.setOrigin(0.5);
	navLayer.add([prevBtn.container, nextBtn.container, pageLabel]);
	navLayer.setVisible(false);

	const container = env.container([bg, header, status, rowsLayer, navLayer]);
	container.setVisible(false);

	function clearRows(): void {
		rowsLayer.removeAll(true);
	}

	function renderRows(page: RankingPage, viewerId: string): void {
		clearRows();
		const objects: Phaser.GameObjects.GameObject[] = [];
		page.entries.forEach((entry, index) => {
			const column = index < ROWS_PER_COLUMN ? 0 : 1;
			const row = index % ROWS_PER_COLUMN;
			const colX = cx + (column === 0 ? -COLUMN_OFFSET_X : COLUMN_OFFSET_X);
			const y = LIST_TOP_Y + row * ROW_GAP;
			const isViewer = entry.playerId === viewerId;
			const color = isViewer ? GOLD : NAME_COLOR;

			const rank = env.scene.add
				.text(colX - 210, y, `#${entry.rank}`, {
					...constants.defaultTextConfig,
					fontSize: "22px",
					color: isViewer ? GOLD : MUTED_COLOR,
				})
				.setOrigin(1, 0.5);
			const name = env.scene.add
				.text(colX - 190, y, truncateName(entry.displayName), {
					...constants.defaultTextConfig,
					fontSize: "22px",
					color,
					fontStyle: isViewer ? "bold" : "normal",
				})
				.setOrigin(0, 0.5);
			const rating = env.scene.add
				.text(colX + 210, y, entry.rating.toString(), {
					...constants.defaultTextConfig,
					fontSize: "22px",
					color,
				})
				.setOrigin(1, 0.5);
			objects.push(rank, name, rating);
		});
		rowsLayer.add(objects);
	}

	async function loadPage(page: number): Promise<void> {
		const ticket = ++generation;
		currentPage = page;
		status.setText(i18n.t("lobby.rankingLoading"));
		status.setVisible(true);
		clearRows();
		navLayer.setVisible(false);
		try {
			const result = await remoteServer.getRanking(page, RANKING_PAGE_SIZE);
			if (destroyed || ticket !== generation) return;
			totalPages = result.totalPages;
			currentPage = result.page;
			header.setText(i18n.t("lobby.yourRanking", { rank: String(result.yourRank) }));
			status.setVisible(false);
			if (result.entries.length === 0) {
				status.setText(i18n.t("lobby.rankingEmpty"));
				status.setVisible(true);
			} else {
				renderRows(result, profile.player.playerId);
			}
			pageLabel.setText(
				i18n.t("lobby.rankingPage", {
					page: String(result.page),
					total: String(result.totalPages),
				})
			);
			navLayer.setVisible(true);
			if (result.page <= 1) prevBtn.disable();
			else prevBtn.enable();
			if (result.page >= result.totalPages) nextBtn.disable();
			else nextBtn.enable();
		} catch (err) {
			if (destroyed || ticket !== generation) return;
			if (err instanceof RemoteServerError && err.status === 401) {
				hooks.onAuthError();
				return;
			}
			loadedOnce = false;
			header.setText(i18n.t("lobby.ranking"));
			status.setText(i18n.t("lobby.rankingFailed"));
			status.setVisible(true);
		}
	}

	return {
		container,
		show: () => {
			container.setVisible(true);
			if (!loadedOnce) {
				loadedOnce = true;
				void loadPage(1);
			}
		},
		hide: () => {
			container.setVisible(false);
		},
		destroy: () => {
			destroyed = true;
			generation++;
		},
	};
}

/** Leaderboard names are at most 24 chars server-side — trim defensively. */
function truncateName(name: string): string {
	const trimmed = name.trim() === "" ? "?" : name;
	return trimmed.length > 26 ? `${trimmed.slice(0, 25)}…` : trimmed;
}
