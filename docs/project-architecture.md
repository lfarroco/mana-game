# Project Architecture

The game is divided into the following parts:

## core/

The game logic and models. Defined in pure functional code without side effects.
Allows simulating combat between two teams and returning a list of combat logs describing when every event happened.
Framework agnostic, can run in the server and the browser.

## phaser/

The game client. Imports `core/` and uses it to run the game (see [purity-boundary.md](purity-boundary.md)).
When playing a single player session the game runs the server logic locally, obtaining the same results as a remote server would (see [game-server.md](game-server.md)).
The game client consumes the combat logs to replay the combat sessions.

Screens are raw Phaser scenes: one scene per screen, navigated with `go(route, params)` from `Scenes/AppRouter.ts`, built on the `ScreenScene` base class. Phaser owns teardown — `scene.start()` destroys the outgoing scene's game objects, tweens, timers and scene listeners — so there is no screen/navigation framework to maintain. Screens with mutually exclusive view states (the battleground) drive them with `Scenes/PhaseController.ts`, which scopes each phase's resources and serialises phase transitions; the phase declarations themselves live in `Screens/Battleground/BattlegroundScene.ts` (see [combat-architecture.md](combat-architecture.md) and [scene-migration.md](scene-migration.md)).

## server/

The authoritative Node game server: sessions, Steam/Google/itch.io auth, matchmaking & rating, and SQLite persistence (see [game-server.md](game-server.md)).
