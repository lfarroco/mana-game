import { emit, signals } from "../../Models/Signals";
import { Unit } from "../../Models/Unit";
import { getState } from "../../Models/State";
import { Row } from "react-bootstrap";
import { hpColorRgba } from "../../Utils/hpColor";

export default function MultipleSelection({
  units,
}: {
  units: string[];
}) {
  const state = getState();

  const squads = units
    .map((id) => state.gameData.squads.find((squad) => squad.id === id))
    .filter((squad) => !!squad) as Unit[];

  return (
    <div id="selected-entity"

      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "5px",
        width: "300px",
        fontSize: 10,

      }}
    >
      <Row>
        <div className="col">
          {squads.map((squad) => (
            <div style={{ display: "inline-block" }}>
              <div><img
                key={`squad-member-${squad.id}`}
                className="img-fluid portrait"
                src={`assets/jobs/${squad.job}/portrait.png`}
                alt={squad.name}
                style={{ width: 50, height: 50 }}
                onClick={() => {
                  emit(signals.UNITS_SELECTED, [squad.id]);
                }}
              /></div>
              <HpBar hp={squad.hp} maxHp={squad.maxHp} />

            </div>
          ))}
        </div>
      </Row>
    </div>
  );
}

const HpBar = ({ hp, maxHp }: { hp: number, maxHp: number }) => {
  return (
    <div style={{
      width: 50,
      height: 5,
      backgroundColor: "black",
      position: "relative",
      borderRadius: 2,
      marginTop: 5
    }}>
      <div style={{
        width: `${(hp / maxHp) * 100}%`,
        height: "100%",
        backgroundColor: hpColorRgba(hp, maxHp),
        position: "absolute",
        borderRadius: 2
      }}></div>
    </div>
  )
}

