
export async function startGame() {

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	io.screens.crystalSelection();

	await io.FadeIn(300);
}
