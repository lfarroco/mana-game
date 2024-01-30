import { listeners, signals } from "../../Models/Signals";
import { State, getCity } from "../../Models/State";

export function CityCaptureSystem_init(state: State) {
	listeners([
		[signals.CAPTURE_CITY, (cityId: string, forceId: string) => {

			const city = getCity(state)(cityId)

			city.force = forceId;

		}]
	])
}