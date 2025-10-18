import { Entity } from "@Models/Entities/Entity";
import { getState } from "@Models/State";
import { CloudsBackground } from "../../../components/cloudBackground/CloudsBackground";


const key = "clouds_bg";

function create() {
	return new CloudsBackground({
		preset: 'nebula',
	});
}

function destroy() {

	const scene = getState().currentScene;

	const el = scene.data.get(key) as CloudsBackground;

	el.destroy();

	scene.data.remove(key);

}

export default {
	key,
	create,
	destroy,
} as Entity 