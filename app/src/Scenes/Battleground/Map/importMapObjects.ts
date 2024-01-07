import Phaser from "phaser";
import { State } from "../../../Models/State";
import * as uuid from "uuid";
import { SQUAD_STATUS, Squad, makeSquad } from "../../../Models/Squad";
import { randomUnit } from "../../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../constants";
import { City } from "../../../Models/City";
import { boardVec } from "../../../Models/Misc";

type TiledProp = {
	name: string;
	type: string;
	value: string;
};
type SquadSpec = {
	ai: string | null;
	force: string;
	x: number,
	y: number
	members: { id: string, job: string }[];
};

type CitySpec = {
	name: string,
	cityType: string;
	force: string;
	x: number,
	y: number
};

//TODO: return new state instead of mutating
export function importMapObjects(state: State, map: Phaser.Tilemaps.Tilemap) {

	map
		.objects
		.filter((objectLayer) => objectLayer.name === "cities")
		.flatMap(objectLayer => {

			const cities = objectLayer.objects.map((obj) => {

				const cityType: string = obj.properties.find((prop: { name: string; }) => prop.name === "type")?.value;
				const force: string = obj.properties.find((prop: { name: string; }) => prop.name === "force")?.value;

				return {
					name: obj.name,
					cityType,
					force,
					x: obj.x,
					y: obj.y,
				} as CitySpec;

			});

			return cities;
		}).forEach(city => {
			const mForce = state.forces.find(force => force.id === city.force);

			if (!mForce) {
				state.forces.push({
					id: city.force,
					name: "",
					color: "red",
					squads: []
				});
			}

			const force = state.forces.find(force => force.id === city.force);
			if (!force) throw new Error("force is undefined");

			const newCity: City = {
				id: uuid.v4(),
				name: city.name,
				force: force.id,
				type: city.cityType,
				screenPosition: {
					x: city.x + HALF_TILE_WIDTH,
					y: city.y + HALF_TILE_HEIGHT
				},
				boardPosition: boardVec(
					Math.floor(city.x / TILE_WIDTH),
					Math.floor(city.y / TILE_HEIGHT)
				)

			};

			state.cities.push(newCity);

		});



	map
		.objects
		.filter((objectLayer) => objectLayer.name === "enemies")
		.flatMap(objectLayer =>
			objectLayer.objects.map((obj) => {

				const ai = obj.properties.find((prop: { name: string; }) => prop.name === "ai")?.value;
				const force: string = obj.properties.find((prop: { name: string; }) => prop.name === "force")?.value;
				const members = obj.properties
					.filter((prop: TiledProp) => prop.name.startsWith("unit_"))
					.map((prop: TiledProp) => prop.value)
					.map((job: string) => ({ id: uuid.v4(), job }))

				return {
					ai,
					force,
					members,
					x: obj.x,
					y: obj.y,
				} as SquadSpec;

			})
		).forEach(sqdSpec => {
			const mForce = state.forces.find(force => force.id === sqdSpec.force);

			if (!mForce) {
				state.forces.push({
					id: sqdSpec.force,
					name: "",
					color: "red",
					squads: []
				});
			}

			const force = state.forces.find(force => force.id === sqdSpec.force);
			if (!force) throw new Error("force is undefined");

			const squadId = uuid.v4();

			const units = sqdSpec.members.map(spec => (
				{
					...randomUnit(),
					id: spec.id,
					job: spec.job,
					force: force.id,
					squad: squadId
				}
			))

			const newSquad: Squad = {
				...makeSquad(squadId, force.id),
				name: uuid.v4().slice(0, 12),
				leader: units[0].id,
				position: boardVec(
					Math.floor(sqdSpec.x / TILE_WIDTH),
					Math.floor(sqdSpec.y / TILE_HEIGHT)
				),
				members: sqdSpec.members.map(spec => spec.id),
				status: SQUAD_STATUS.IDLE
			};

			if (sqdSpec.ai === "attacker") {
				state.ai.attackers.push(newSquad.id)
			} else if (sqdSpec.ai === "defender") {
				state.ai.defenders.push(newSquad.id)
			}

			state.squads.push(newSquad);
			force.squads.push(newSquad.id);
			state.units.push(...units);
			state.map = {
				width: map.width,
				height: map.height
			}

		});

}
