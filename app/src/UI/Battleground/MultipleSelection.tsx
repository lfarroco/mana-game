import { emit, signals } from "../../Models/Signals";
import { Unit } from "../../Models/Unit";
import { getCity, getState } from "../../Models/State";

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
    <div className="row" id="selected-entity">
      <div className="col col-6">
        {cities_.map((city) => (
          <img
            key={`squad-member-${city.id}`}
            className="img-fluid portrait"
            src={`assets/cities/${city.type}.png`}
            alt={city.name}
            onClick={() => {
              emit(signals.CITIES_SELECTED, [city.id]);
              emit(signals.UNITS_SELECTED, []);
            }}
          />
        ))}
        {squads.map((squad) => (
          <img
            key={`squad-member-${squad.id}`}
            className="img-fluid portrait"
            src={`assets/jobs/${squad.job}/portrait.png`}
            alt={squad.name}
            onClick={() => {
              emit(signals.UNITS_SELECTED, [squad.id]);
              emit(signals.CITIES_SELECTED, []);
            }}
          />
        ))}
      </div>
      <div className="col-2"></div>
      <div className="col col-4 mt-4"></div>
    </div>
  );
}

