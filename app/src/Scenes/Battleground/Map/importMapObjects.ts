import Phaser from "phaser";
import { BGState } from "../BGState";
import * as uuid from "uuid";
import { Squad, addMembers } from "../../../Models/Squad";
import { randomUnit } from "../../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH } from "../constants";
import { City } from "../../../Models/City";

type TiledProp = {
	name: string;
	type: string;
	value: string;
};
type SquadSpec = {
	ai: string;
	force: string;
	x: number,
	y: number
	members: MemberSpec[];
};
type MemberSpec = {
	x: number;
	y: number;
	job: string;
};

type CitySpec = {
	cityType: string;
	force: string;
	x: number,
	y: number
};

//TODO: return new state instead of mutating
export function importMapObjects(state: BGState, map: Phaser.Tilemaps.Tilemap) {

	map
		.objects
		.filter((objectLayer) => objectLayer.name === "cities")
		.flatMap(objectLayer => {

			const cities = objectLayer.objects.map((obj) => {

				const cityType: string = obj.properties.find((prop: { name: string; }) => prop.name === "type")?.value;
				const force: string = obj.properties.find((prop: { name: string; }) => prop.name === "force")?.value;

				return {
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
				name: uuid.v4(),
				force: force.id,
				type: city.cityType,
				position: {
					x: city.x + HALF_TILE_WIDTH,
					y: city.y + HALF_TILE_HEIGHT
				}
			};

			state.cities.push(newCity);

		});



	map
		.objects
		.filter((objectLayer) => objectLayer.name === "enemies")
		.flatMap(objectLayer => {

			const squad = objectLayer.objects.map((obj) => {

				const ai: string = obj.properties.find((prop: { name: string; }) => prop.name === "ai")?.value;
				const force: string = obj.properties.find((prop: { name: string; }) => prop.name === "force")?.value;

				const members: MemberSpec[] = obj.properties
					.filter((prop: TiledProp) => prop.name.startsWith("unit_"))
					.map((prop: TiledProp) => prop.value.split(","))
					.map(([x, y, job]: [x: string, y: string, job: string]) => (
						{ x: parseInt(x), y: parseInt(y), job }
					));

				return {
					ai,
					force,
					members,
					x: obj.x,
					y: obj.y,
				} as SquadSpec;

			});

			return squad;
		}).forEach(sqd => {
			const mForce = state.forces.find(force => force.id === sqd.force);

			if (!mForce) {
				state.forces.push({
					id: sqd.force,
					name: "",
					color: "red",
					squads: []
				});
			}

			const force = state.forces.find(force => force.id === sqd.force);
			if (!force) throw new Error("force is undefined");

			const newSquad: Squad = {
				id: uuid.v4(),
				name: uuid.v4(),
				force: force.id,
				dispatched: true,
				position: {
					x: sqd.x + HALF_TILE_WIDTH,
					y: sqd.y + HALF_TILE_HEIGHT
				},
				members: {},
				path: []
			};

			const members = sqd.members.map(member => ({ ...member, id: uuid.v4() }));

			members.forEach(member => {
				const newUnit = {
					...randomUnit(),
					id: member.id,
					job: member.job,
					force: force.id,
					squad: newSquad.id
				}
				state.units.push(newUnit);
			});

			state.squads.push(addMembers(newSquad, members));
			force.squads.push(newSquad.id);

		});

}
