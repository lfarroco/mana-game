export async function returnToTitle() {

	await io.FadeOut(300, 0x000);

	io.scene.children.removeAll();

	io.screens.title.create();

	await io.FadeIn(300);
}
