
Mission:
Build a mix of advance wars and hoi4

The code is separated in three main blocks:

- logic: a collection of systems
- scene: the game graphics
- ui: a React layer that handles the user interface

Communication between these blocks is done through the use of events.

State is managed by the logic block, and the other blocks listen to the events emitted by the logic block to update their state (if any).

User interactions emit events that are listened by the logic block, which updates the state and emits events that are listened by the other blocks.


## Guidelines

Avoid firing events that just restate the current state of the game.
Example: if a unit is selected, and the user clicks on the same unit, the UNIT_SELECTED event should not be fired.
The reasoning is that the event might provoke the creation of new objects, and the destruction of old ones, which is not necessary in this case.


## Assets credits

https://opengameart.org/content/rpg-sound-pack
gold_coin
ui_toggle (metal-small1)
swing

https://opengameart.org/content/punches-hits-swords-and-squishes
sword1,2,3

https://www.kenney.nl/assets/interface-sounds
button_click.ogg
error.ogg