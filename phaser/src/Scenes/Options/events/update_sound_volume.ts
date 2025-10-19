import { GameEvent } from "@Models/Entities/Entity";
import { updateSoundVolume } from "@Systems/AudioManager";

export default {
	key: 'events/update_sound_volume',
	handler: updateSoundVolume
} as GameEvent<number>

