import { GameEvent } from "@Models/Entities/Entity";
import { toggleMusicEnabled } from "@Systems/AudioManager";

export default {
	key: 'events/toggle_music_enabled',
	handler: toggleMusicEnabled
} as GameEvent<boolean>

