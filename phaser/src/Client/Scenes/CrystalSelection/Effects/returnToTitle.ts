import * as io from "@PhaserIO";

export async function returnToTitle() {
	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	io.screens.title();

	await io.FadeIn(300);
}
