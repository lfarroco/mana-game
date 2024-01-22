import Phaser from "phaser";
import { getState } from "../../../Models/State";
import * as uuid from "uuid";
import { Unit, makeUnit } from "../../../Models/Unit";
import {
  HALF_TILE_HEIGHT,
  HALF_TILE_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../constants";
import { City } from "../../../Models/City";
import { Vec2, vec2 } from "../../../Models/Geometry";
import { makeForce } from "../../../Models/Force";

type TiledProp = {
  name: string;
  type: string;
  value: string;
};
type UnitSpec = {
  ai: string | null; // TOOD: ai should be per force
  force: string;
  job: string;
  x: number;
  y: number;
};

type CitySpec = {
  name: string;
  cityType: string;
  force: string;
  x: number;
  y: number;
};

//TODO: return new state instead of mutating
export function importMapObjects(map: Phaser.Tilemaps.Tilemap) {
  const state = getState();
  map.objects
    .filter((objectLayer) => objectLayer.name === "cities")
    .flatMap((objectLayer) => {
      const cities = objectLayer.objects.map((obj) => {
        const cityType = (obj.properties as TiledProp[]).find(
          (prop: { name: string }) => prop.name === "type"
        )?.value;
        const force = (obj.properties as TiledProp[]).find(
          (prop: { name: string }) => prop.name === "force"
        )?.value;

        if (!cityType) throw new Error("cityType is undefined");
        if (!force) throw new Error("force is undefined");

        return {
          name: obj.name,
          cityType,
          force,
          x: obj.x,
          y: obj.y,
        } as CitySpec;
      });

      return cities;
    })
    .forEach((city) => {
      const mForce = state.gameData.forces.find((force) => force.id === city.force);

      if (!mForce) {
        state.gameData.forces.push({
          ...makeForce(),
          id: city.force,
          color: "red",
        });
      }

      const force = state.gameData.forces.find((force) => force.id === city.force);
      if (!force) throw new Error("force is undefined");

      const newCity: City = {
        id: uuid.v4(),
        name: city.name,
        force: force.id,
        type: city.cityType,
        screenPosition: {
          x: city.x + HALF_TILE_WIDTH,
          y: city.y + HALF_TILE_HEIGHT,
        },
        boardPosition: vec2(
          Math.floor(city.x / TILE_WIDTH),
          Math.floor(city.y / TILE_HEIGHT)
        ),
      };

      state.gameData.cities.push(newCity);
    });

  map.objects
    .filter((objectLayer) => objectLayer.name === "enemies")
    .flatMap((objectLayer) =>
      objectLayer.objects.map((obj) => {
        const ai = obj.properties.find(
          (prop: { name: string }) => prop.name === "ai"
        )?.value;

        const job = obj.properties.find(
          (prop: { name: string }) => prop.name === "job"
        )?.value;
        const force: string = obj.properties.find(
          (prop: { name: string }) => prop.name === "force"
        )?.value;

        return {
          ai,
          force,
          job,
          x: obj.x,
          y: obj.y,
        } as UnitSpec;
      })
    )
    .forEach((sqdSpec) => {
      const mForce = state.gameData.forces.find((force) => force.id === sqdSpec.force);

      if (!mForce) {
        state.gameData.forces.push({
          ...makeForce(),
          id: sqdSpec.force,
          color: "red",
        });
      }

      const force = state.gameData.forces.find((force) => force.id === sqdSpec.force);
      if (!force) throw new Error("force is undefined");

      const unitId = uuid.v4();

      const newUnit: Unit = makeUnit(unitId, force.id, sqdSpec.job, boardToWindowVec(sqdSpec))

      if (sqdSpec.ai === "attacker") {
        state.gameData.ai.attackers.push(newUnit.id);
      } else if (sqdSpec.ai === "defender") {
        state.gameData.ai.defenders.push(newUnit.id);
      }

      state.gameData.squads.push(newUnit);
      force.squads.push(newUnit.id);
      state.gameData.map = {
        width: map.width,
        height: map.height,
      };
    });
}
function boardToWindowVec(sqdSpec: UnitSpec): Vec2 {
  return vec2(
    Math.floor(sqdSpec.x / TILE_WIDTH),
    Math.floor(sqdSpec.y / TILE_HEIGHT)
  );
}
