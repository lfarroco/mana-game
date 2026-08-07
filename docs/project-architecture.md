# Project Architecture

The game is divided into the following parts:

## core/

The game logic and models. Defined in pure functional code without side effects.
Allows simulating combat between two teams and returning a list of combat logs describing when every event happened.
Framework agnostic, can run in the server and the browser.

## framework/

Internal framework to manage "screen" and "phase" switching.
"Screen" represents a main section in the game: title screen, options screen, the main game loop screen, etc.
A Screen is composed of its event listeners, it's "create" method which creates the elements that will remain regardless of phase (ui, board, background, etc) and the screen's phases.
"Phase" represents a section within a screen. There can only be a phase active per time. When a phase ends, all the elements and listeners created by it are cleanup up.
The intention is removing manual cleanup when moving between screens and phases. PhaserJS allows defining Scenes, but their listeners remain active and the lifecycle logic of that system is not under our control.

## phaser/

The game client. Imports both core/ and framework/ and uses them to run the game (see [purity-boundary.md](purity-boundary.md)).
When playing a single player session the game runs the server logic locally, obtaining the same results as a remote server would (see [game-server.md](game-server.md)).
The game client consumes the combat logs to replay the combat sessions.
The internal framework allows declaring how each stage during gameplay should be handled (see [combat-architecture.md](combat-architecture.md)).