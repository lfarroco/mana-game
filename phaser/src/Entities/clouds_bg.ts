import { Entity } from "@Models/Entities/Entity";
import { CloudsBackground } from "../components/cloudBackground/CloudsBackground";

const create = () => new CloudsBackground({ preset: 'nebula' });

function onDestroy(el: CloudsBackground, handler: () => void) {
	el.getShader().on("destroy", handler)
}

const entity: Entity<CloudsBackground> = {
	key: "clouds_bg",
	create,
	onDestroy,
}

export default entity;