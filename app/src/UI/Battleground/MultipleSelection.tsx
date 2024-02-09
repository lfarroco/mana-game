import { emit, signals } from "../../Models/Signals";
import { Unit } from "../../Models/Unit";
import { getCity, getState } from "../../Models/State";
import { Row } from "react-bootstrap";

export default function MultipleSelection({
  units,
  cities,
}: {
  units: string[];
  cities: string[];
}) {
  const state = getState();

  const squads = units
    .map((id) => state.gameData.squads.find((squad) => squad.id === id))
    .filter((squad) => !!squad) as Unit[];

  const cities_ = cities.map((id) => getCity(state)(id));

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
                  emit(signals.CITIES_SELECTED, []);
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
        backgroundColor: hpBarColor(hp, maxHp),
        position: "absolute",
        borderRadius: 2
      }}></div>
    </div>
  )
}
// goes from green (100) to yellow (50) to red (0), in a gradient
const hpBarColor = (hp: number, maxHp: number) => {
  const ratio = hp / maxHp;
  if (ratio > 0.5) {
    return `rgb(${255 - ratio * 510}, 255, 0)`;
  } else {
    return `rgb(255, ${ratio * 510}, 0)`;
  }
}
