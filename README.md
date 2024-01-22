
The code is separated in three main blocks:

- logic: a collection of systems
- scene: the game graphics
- ui: a React layer that handles the user interface

Communication between these blocks is done through the use of events.

State is managed by the logic block, and the other blocks listen to the events emitted by the logic block to update their state (if any).

User interactions emit events that are listened by the logic block, which updates the state and emits events that are listened by the other blocks.
