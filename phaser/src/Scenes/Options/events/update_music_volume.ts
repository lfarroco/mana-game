import { GameEvent } from "@Models/Entities/Entity";
import { updateMusicVolume } from "@Systems/AudioManager";

export default {
	key: 'events/update_sound_volume',
	handler: updateMusicVolume
} as GameEvent<number>

