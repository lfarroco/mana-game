import { Entity } from "@Models/Entities/Entity";
import { getState } from "@Models/State";
import { CloudsBackground } from "../../../components/cloudBackground/CloudsBackground";

function create() {
	const scene = getState().currentScene;
	const el = new CloudsBackground({
		preset: 'nebula',
	});

	scene.data.set("clouds_bg", el);
}

function destroy() {

	const scene = getState().currentScene;

	const el = scene.data.get("clouds_bg") as CloudsBackground;

	el.destroy();

	scene.data.remove("clouds_bg");

}

export default {
	create,
	destroy,
} as Entity 