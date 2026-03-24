# Project Architecture

This chart describes the high-level architecture of Mana Battle and how data flows between pure game logic, Phaser runtime systems, and platform/infrastructure layers.

```mermaid
flowchart TB
    Player[Player Input]

    subgraph Runtime["Runtime Layer - Phaser Client"]
        Scene[Engine/Scenes/Battleground]
        UI[UI Components]
        FX[Effects + Audio]
    end

    subgraph Domain["Domain Layer - Pure Logic"]
        Core[Core/GameLogic + PhaseSystem]
        Trigger[TriggerSystem]
        Models[Models/State + Board + Entities]
        Data[Data/BaseCollection]
    end

    subgraph Server[Server Abstraction]
        IGS[Core/IGameServer]
        Local[Core/LocalServerAdapter]
        Multi[Multiplayer/MultiplayerManager]
    end

    subgraph Combat[Combat Architecture]
        Sim[RunCombatCore + ServerCombatEffects]
        Logs[Combat Logs]
        Playback[CombatPlaybackController + BrowserCombatEffects]
    end

    subgraph Platform["Platform + Persistence"]
        Storage[StorageFactory to LocalStorage/SteamCloud]
        I18N[i18n Translations]
        Electron[Electron Desktop]
        Capacitor[Capacitor Android]
        Supabase[Supabase Backend - multiplayer/auth]
    end

    Player --> UI
    UI --> Scene
    Scene --> Core

    Core <--> Models
    Core --> Trigger
    Trigger --> Models
    Data --> Models

    Core --> IGS
    IGS --> Local
    IGS --> Multi

    Core --> Sim
    Sim --> Logs
    Logs --> Playback
    Playback --> FX
    Playback --> Scene

    Scene --> Storage
    Scene --> I18N
    Multi --> Supabase

    Scene --> Electron
    Scene --> Capacitor
```

## Notes

- Core and Models represent replay-critical pure logic (no Phaser dependency).
- Engine/Scenes coordinates game phases and presentation.
- Combat is simulated first, then played back through logged events.
- Single-player and multiplayer both use the same game server interface (`IGameServer`).
