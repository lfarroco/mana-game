export async function openOptions() {
	await io.FadeOut(300, 0x000000);

	io.scene.children.removeAll();

	io.screens.options();

	io.FadeIn(300);
}
