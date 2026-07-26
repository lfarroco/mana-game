# Project Architecture

High-level view of how data flows between the pure game logic (`core/`), the
Phaser client (`phaser/src/`), and the platform/infrastructure layers.

```text
Player Input
    |
    v
Screens/*  (single Phaser scene: src/Client.ts, navigation via switchScreen)
    |
    v
Screens/Battleground/BattlegroundScreen  (phase loop + phase handlers)
    |
    +--> Phases/*  (Encounter, Shop, OrbShop, UpgradeCore, AddReactionCore,
    |               Combat, Victory, GameOver)
    |        |
    |        v
    |     ServerAdapter (src/GameServer.ts -> getServer())
    |        |-- single-player: LocalServer (in-process)
    |        '-- multiplayer:  RemoteServer (retired Supabase client,
    |                             quarantined; replacement: docs/game-server.md)
    |        |
    |        v
    |     core/  (@mana/core — pure logic, no Phaser/DOM/Node)
    |       SessionManagement + session/SessionTransitions
    |       Combat/CombatRunner + CombatSimulation -> CombatLogger (typed logs)
    |       TriggerSystem/ (action-reaction engine)
    |       Entities/ + board/ + data/BaseCollection
    |        |
    |        v
    |     CombatState with CombatLogEntry[]
    |        |
    |        v
    |     Phases/Combat/CombatPlaybackController -> logHandlers/ -> FX/ + audio
    |
    +--> Storage (StorageFactory -> LocalStorage / SteamCloud)
    +--> i18n (en, es, pt, jp, cn, ru)
    +--> Env (src/Env.ts — state, dispatch, time, audio, Phaser access)
    +--> Electron desktop / Capacitor Android
```

## Notes

- `core/` is replay-critical pure logic; it imports nothing from `phaser/`
  (see [purity-boundary.md](purity-boundary.md)).
- Combat is simulated to completion in `core/`, producing typed combat logs;
  the client only plays them back (see [combat-architecture.md](combat-architecture.md)).
- Single-player runs the same server interface in-process (`LocalServer`).
  Multiplayer will use the new `server/` Node backend — plan in
  [game-server.md](game-server.md).
