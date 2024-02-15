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
    .map((id) => state.gameData.units.find((unit) => unit.id === id))
    .filter((unit) => !!unit) as Unit[];

  return (
    <div
      id="multiple-selection"
    >
      <Row>
        <div className="col">
          {squads.map((unit) => (
            <div style={{ display: "inline-block" }}>
              <div><img
                key={`unit-member-${unit.id}`}
                className="img-fluid portrait"
                src={`assets/jobs/${unit.job}/portrait.png`}
                alt={unit.name}
                style={{ width: 50, height: 50 }}
                onClick={() => {
                  emit(signals.UNITS_SELECTED, [unit.id]);
                }}
              /></div>
              <HpBar hp={unit.hp} maxHp={unit.maxHp} />

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

