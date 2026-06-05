export async function returnToTitle() {
	await io.FadeOut(300, 0x000000);

	io.clean();

	io.screens.title();

	await io.FadeIn(300);
}
