
export async function startGame(
	{ isMultiplayer }: { isMultiplayer: boolean; }
) {

	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	io.screens.crystalSelection(isMultiplayer);

	await io.FadeIn(300);
}
