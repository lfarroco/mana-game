import Phaser from "phaser";
import { getState } from "../../../Models/State";
import * as uuid from "uuid";
import { Unit, makeUnit } from "../../../Models/Unit";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../constants";
import { Vec2, vec2 } from "../../../Models/Geometry";
import { makeForce } from "../../../Models/Force";

type UnitSpec = {
  ai: string | null; // TOOD: ai should be per force
  force: string;
  job: string;
  x: number;
  y: number;
};



//TODO: return new state instead of mutating
export function importMapObjects(map: Phaser.Tilemaps.Tilemap) {
  const state = getState();

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
    .forEach((unitSpec) => {
      const mForce = state.gameData.forces.find((force) => force.id === unitSpec.force);

      if (!mForce) {
        state.gameData.forces.push({
          ...makeForce(),
          id: unitSpec.force,
          color: "red",
        });
      }

      const force = state.gameData.forces.find((force) => force.id === unitSpec.force);
      if (!force) throw new Error("force is undefined");

      const unitId = uuid.v4();

      const newUnit: Unit = makeUnit(unitId, force.id, unitSpec.job, boardToWindowVec(unitSpec))

      newUnit.id = newUnit.name + "-" + uuid.v4().slice(0, 5);

      if (unitSpec.ai === "attacker") {
        state.gameData.ai.attackers.push(newUnit.id);
      } else if (unitSpec.ai === "defender") {
        state.gameData.ai.defenders.push(newUnit.id);
      }

      state.gameData.units.push(newUnit);
      force.units.push(newUnit.id);
      state.gameData.map = {
        width: map.width,
        height: map.height,
      };
    });
}
function boardToWindowVec(unitSpec: UnitSpec): Vec2 {
  return vec2(
    Math.floor(unitSpec.x / TILE_WIDTH),
    Math.floor(unitSpec.y / TILE_HEIGHT)
  );
}
