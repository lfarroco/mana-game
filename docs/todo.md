
MVP Outstanding issues:
- TODO: review target picking in combat
- TODO: deselect destroyed units (may lead to movement issued bugs)
- TODO: issue move order during combat
- TODO: ranged attacks, and display (dotted red line?)
- TODO: have passive units have a agroo range (think wc3)
- TODO: have ai build units
- TODO: display select cursor in cities
- TODO: disable selection under the fow
- TODO: when issuing move order into cell with enemy, combat emote is still displayed when moving
- TODO: on game load, create hp bars with correct values
- TODO: stop creating listeners for every unit
- TODO: when evaluating a path, ignore units under the fow
- TODO: select cell to attack

MVP Issues: 

- OK: adjust rect select for camera scroll
- TODO: tests
- OK: if the target changed, reset move counter
- OK: two units can occupy the same tile if move order is issued during the same turn
- OK: allow unit to move into friendly-occupied cell if the unit is also moving
- TODO: show unit path when selected
- TODO: shift-pathing (hold shift to queue up pathing)  
- TODO: ping move location on order issued
- TODO: shift-click to select
- TODO: shift-click in portrait to deselect
- TODO: adjust area select to prioritize allied units
- TODO: scroll by placing cursor at the edge of the screen
- OK: main screen
- TODO: map list
- OK: save / load
- OK: options (sound, music)
- TODO: have event for "turn end", so that victory conditions can be checked after all animations are complete
- TODO: sound: if a battle is active, play combat sounds
- TODO: save local settings (sound, music)
- TODO: on game load, create combat and movement emotes
- DECISION: follow advance wars model (cities for money, recruit at specific city type (tavern))

post MVP:
- controller support
- modding support
- change zoom
- - the camera zoom currently messes with selection and drag
- new city types (fort, cavern)
- remove hardcoded player force checkes
