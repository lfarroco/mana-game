// io is a global provided by the Phaser game bootstrap

export const createGetTimeScaleEffect = () => () => {
	return io.scene.time.timeScale;
};

export const createGetSceneEffect = () => () => {
	return io.scene;
};