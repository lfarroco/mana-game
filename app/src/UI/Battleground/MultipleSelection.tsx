import { emit_, events } from "../../Models/Signals";
import { Squad } from "../../Models/Squad";
import { getState } from "../../Models/State";

export default function MultipleSelection({
  units,
  cities,
}: {
  units: string[];
  cities: string[];
}) {
  const state = getState();

  const squads = units
    .map((id) => state.squads.find((squad) => squad.id === id))
    .filter((squad) => !!squad) as Squad[];

  const cities_ = cities.map((id) => {
    const c = state.cities.find((city) => city.id === id);
    if (!c) throw new Error("City not found");
    return c;
  });

  return (
    <div className="row" id="selected-entity">
      <div className="col col-6">
        {cities_.map((city) => (
          <img
            key={`squad-member-${city.id}`}
            className="img-fluid portrait-sm"
            src={`assets/cities/${city.type}.png`}
            alt={city.name}
            onClick={emit_(events.CITIES_SELECTED, [city.id])}
          />
        ))}
        {squads.map((squad) => (
          <img
            key={`squad-member-${squad.id}`}
            className="img-fluid portrait-sm"
            src={`assets/jobs/${squad.job}/portrait.png`}
            alt={squad.name}
            onClick={emit_(events.UNITS_SELECTED, squad.id)}
          />
        ))}
      </div>
      <div className="col-2"></div>
      <div className="col col-4 mt-4"></div>
    </div>
  );
}

