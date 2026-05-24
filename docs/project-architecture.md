# Project Architecture

This chart describes the high-level architecture of Mana Battle and how data
flows between pure game logic, Phaser runtime systems, and
platform/infrastructure layers.

```text
Player Input
    |
    v
UI Components
    |
    v
Engine/Scenes/Battleground ----------------------------------------+
            |                                                      |
            v                                                      |
  Core/GameLogic + PhaseSystem <------> Models/State + Board + Entities
            |                           ^                    ^
            |                           |                    |
            v                           |                    |
      TriggerSystem --------------------+                    |
            |                                                |
            +--> RunCombatCore + ServerCombatEffects         |
            |          |                                     |
            |          v                                     |
            |     Combat Logs                                |
            |          |                                     |
            |          v                                     |
            |     CombatPlaybackController + BrowserCombatEffects
            |          |                      |
            |          +--------------------->+--> Effects + Audio
            |
            +--> Core/GameServer --> LocalServerAdapter
            |                    |
            |                    +--> MultiplayerManager --> Supabase Backend
            |
            +--> StorageFactory --> LocalStorage / SteamCloud
            +--> i18n Translations
            +--> Electron Desktop
            +--> Capacitor Android

Data/BaseCollection -------------------------------------------------> Models
```

The runtime layer starts with player input flowing through UI components into the
main battleground scene. That scene coordinates presentation and phase changes,
while the replay-critical rules live in `Core/GameLogic`, the phase system, the
trigger system, and the board/entity state models.

Combat follows a simulate-then-playback flow. Pure combat logic runs in
`RunCombatCore` and related server-side effects code, produces combat logs, and
the client replays those logs through `CombatPlaybackController` and browser-side
effects. This keeps authoritative combat resolution separate from Phaser-driven
animation and audio.

The same core logic also talks to the `GameServer` abstraction so single-player
and multiplayer share one server-facing interface. Around that, the scene layer
integrates storage, localization, and platform targets such as Electron and
Capacitor, while multiplayer-specific backend concerns flow through Supabase.

## Notes

- Core and Models represent replay-critical pure logic (no Phaser dependency).
- Engine/Scenes coordinates game phases and presentation.
- Combat is simulated first, then played back through logged events.
- Single-player and multiplayer both use the same game server interface (`GameServer`).
