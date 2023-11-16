import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { BGState, initialState } from "./BGState";
import * as uuid from "uuid"

class BattlegroundScene extends Phaser.Scene {
  state: BGState;
  constructor() {
    super("BattlegroundScene");
    this.state = initialState
  }

  preload = preload;
  create = () => {
    const map = createMap(this);

    type TiledProp = {
      name: string,
      type: string,
      value: string,
    }
    type SquadSpec = {
      ai: string,
      force: string,
      members: MemberSpec[]
    }
    type MemberSpec = {
      x: number;
      y: number;
      job: string;
    };

    map.objects
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
            ))

          return {
            ai,
            force,
            members
          } as SquadSpec

        });

        return squad
      }).map(sqd => {
        const mForce = this.state.forces.find(force => force.id === sqd.force)

        if (!mForce) {
          const id = uuid.v4()
          this.state.forces.push({
            id,
            name: "",
            color: "red", // use unclaimed color
            squads: []
          })
        }

        const force = this.state.forces.find(force => force.id === sqd.force)
        if (!force) throw new Error("force is undefined")

        // const squad: Squad = {
        //   id: uuid.v4(),
        //   force: force.id,
        //   members: sqd.members.map(member => ({
        //     id: uuid.v4(),
        //     job: member.job,
        //     x: member.x,
        //     y: member.y,
        //     squad: ""
        //   }))

        // }


      })
  }
  update = update;
}
function update() { }

export default BattlegroundScene;

