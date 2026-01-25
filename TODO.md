
## next steps
- have the multiplayer handler be used locally when in single player


## organize project files

- assets (graphics, sound)
- data (unit, encounter data)
- platforms (build logic and scripts)
  - web
  - steam
  - android
- dist (output for build artifacts)
- src (app code)
  - core (game logic, no dependant on renderer)
    - models
    - combat logic
    - encounters
    - events
    - session creation and transition
  - client (rendering)
    - scenes
    - fx
  - server
    - supabase
    - local
  

