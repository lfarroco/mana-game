
export const returnToTitle = async () => {
	await io.FadeOut(300, 0x000000);

	io.clean();

	io.screens.title.create();

	await io.FadeIn(300);
}
