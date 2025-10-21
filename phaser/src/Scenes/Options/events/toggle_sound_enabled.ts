import { GameEvent } from "@Models/Entities/Entity";
import { toggleSoundsEnabled } from "@Systems/AudioManager";

export default {
	key: 'events/toggle_sound_enabled',
	handler: toggleSoundsEnabled
} as GameEvent<boolean>

