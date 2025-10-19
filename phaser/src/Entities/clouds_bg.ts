import { Entity } from "@Models/Entities/Entity";
import { CloudsBackground } from "../components/cloudBackground/CloudsBackground";

const create = () => new CloudsBackground({ preset: 'nebula' });

function onDestroy(el: CloudsBackground, handler: () => void) {
	el.getShader().on("destroy", handler)
}

export default {
	key: "clouds_bg",
	create,
	onDestroy,
} as Entity<CloudsBackground> 