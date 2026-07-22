import * as c from "@Constants";
import * as i18n from "@i18n/i18n";
import * as UIButton from "@Components/Button/UIButton";
import * as environment from "@Utils/environment";
import { env } from "../../../Env";

const OVERLAY_ALPHA = 0.85;
const PANEL_WIDTH = 800;
const PANEL_HEIGHT = 600;

let isOpen = false;

const baseLinks = [
	// { text: "Discord", url: "https://discord.gg/h259xFPP" },
	// { text: "Reddit", url: "https://www.reddit.com/r/ManaBattleGame/" },
	{ text: "X/Twitter", url: "https://x.com/manabattle_en" },
	{ text: "YouTube", url: "https://www.youtube.com/@manabattle" },
];

export function create(): void {
	if (isOpen) return;
	isOpen = true;

	const overlay = env.scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		OVERLAY_ALPHA
	);
	overlay.setInteractive();

	const panelBg = env.borderedRoundRect(
		[c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y],
		[PANEL_WIDTH, PANEL_HEIGHT],
		20,
		0x2c3e50,
		0.95
	);

	const title = env.scene.add.text(c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y - PANEL_HEIGHT / 2 + 80, i18n.t("title.links"), c.titleTextConfig).setOrigin(0.5);

	const links = [...baseLinks];
	if (!environment.isElectron()) {
		links.push({
			text: "Steam",
			url: "https://store.steampowered.com/app/3757600/Mana_Battle",
		});
	}

	const linkTexts = links.map((link, index) => {
		const textObj = env.scene.add.text(
			c.MIDDLE_SCREEN_X,
			c.MIDDLE_SCREEN_Y - 120 + index * 60,
			link.text,
			{
				...c.titleTextConfig,
			}
		);
		textObj.setOrigin(0.5, 0.5);
		textObj.setInteractive({ useHandCursor: true });
		textObj.on("pointerdown", () => {
			const win = window as Window & { openExternalURL?: (url: string) => void };
			if (win.openExternalURL) {
				win.openExternalURL(link.url);
			} else {
				window.open(link.url, "_blank");
			}
		});
		textObj.on("pointerover", () => textObj.setColor("#f1c40f"));
		textObj.on("pointerout", () => textObj.setColor("#ecf0f1"));
		return textObj;
	});

	const closeButton = UIButton.create({
		text: i18n.t("credits.close"),
		position: [c.MIDDLE_SCREEN_X, c.MIDDLE_SCREEN_Y + PANEL_HEIGHT / 2 - 60],
		callback: () => {
			container.destroy(true);
			isOpen = false;
		},
	});

	const container = env.container([overlay, panelBg, title, ...linkTexts, closeButton.container]);

	env.scene.children.bringToTop(container);
}
