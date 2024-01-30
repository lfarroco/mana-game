
The code is separated in three main blocks:

- logic: a collection of systems
- scene: the game graphics
- ui: a React layer that handles the user interface

Communication between these blocks is done through the use of events.

State is managed by the logic block, and the other blocks listen to the events emitted by the logic block to update their state (if any).

User interactions emit events that are listened by the logic block, which updates the state and emits events that are listened by the other blocks.

Events should be created only for things that are relevant to the other blocks. For example, the scene block should not emit an event when a ping is displayed, because the logic block doesn't need to know that. Instead, the scene block should emit an event when the player right clicks to move, because the scene block needs to know that a move order was issued.