```mermaid
graph TD
    A[Game Initialization] --> Scene[BattlegroundScene];

    subgraph SceneContext [BattlegroundScene]
        Scene;
        PlayerBoard;
        Units["Character Units (Chara)"];
        Scene -- Manages --> PlayerBoard;
        Scene -- Manages --> Units;
        PlayerBoard -- Contains --> Units;
    end

    subgraph CoreSystems
        UIManager;
        TraitSystem;
        RelicSystem;
        ShopSystem;
        EventManager[EventManager (Global & Unit Events)];
        DataSystem[Data Management (JSON, etc.)];
    end

    %% Scene to Systems Connections
    Scene --- UIManager;
    Scene --- TraitSystem;
    Scene --- RelicSystem;
    Scene --- ShopSystem;
    Scene --- EventManager;
    Scene --- DataSystem;

    %% UIManager Details
    UIManager -- Manages --> UIComponents[Tooltip, Buttons, GoldAnimator];
    UIManager -- Renders --> ShopSystemInterface[Shop UI];
    UIManager -- Renders --> UnitDisplays[Unit Stats/Bars];
    ShopSystem --- ShopSystemInterface; %% ShopSystem provides data/logic for its UI part

    %% TraitSystem Details
    TraitSystem -- Affects --> Units;
    TraitSystem -- Interacts with --> RelicSystem; %% e.g., Relics granting traits or modifying trait effects
    TraitSystem -- Uses/Listens to --> EventManager;
    TraitSystem -- Loads definitions from --> DataSystem;
    Units -- Have/Trigger --> TraitSystem; %% Units possess traits that are processed by the TraitSystem

    %% RelicSystem Details
    RelicSystem -- Manages --> PlayerRelics;
    RelicSystem -- Interacts with --> ShopSystem; %% Relics can be acquired from the Shop
    RelicSystem -- Uses/Listens to --> EventManager;
    RelicSystem -- Loads definitions from --> DataSystem;
    Units -- Affected by --> RelicSystem; %% Relics can apply effects to units

    %% ShopSystem Details
    ShopSystem -- Provides --> PurchasableUnits[Units for Purchase];
    ShopSystem -- Provides --> PurchasableRelics[Relics for Purchase];
    ShopSystem --- UIManager; %% For rendering the shop interface
    ShopSystem -- Uses/Listens to --> EventManager; %% e.g., for gold transactions, purchase events
    ShopSystem -- Loads item data from --> DataSystem;

    %% EventManager Details
    EventManager -- Mediates Events for --> Scene;
    EventManager -- Mediates Events for --> UIManager;
    EventManager -- Mediates Events for --> TraitSystem;
    EventManager -- Mediates Events for --> RelicSystem;
    EventManager -- Mediates Events for --> ShopSystem;
    EventManager -- Mediates Events for --> Units;

    %% DataSystem Details
    DataSystem -- Provides Data to --> TraitSystem;
    DataSystem -- Provides Data to --> RelicSystem;
    DataSystem -- Provides Data to --> ShopSystem;
    DataSystem -- Provides Data to --> Units; %% Base stats, definitions, etc.
    DataSystem -- Provides Data to --> Scene; %% Level configurations, enemy waves, etc.

    %% Unit Interactions
    Units -- Interact via --> EventManager; %% Units emit and respond to events
```


## Assets credits

https://opengameart.org/content/rpg-sound-pack gold_coin ui_toggle
(metal-small1) swing

https://opengameart.org/content/punches-hits-swords-and-squishes sword1,2,3

https://www.kenney.nl/assets/interface-sounds button_click.ogg error.ogg

https://opengameart.org/content/cure-magic oga-cure-magic1.wav

https://opengameart.org/content/punch-slap-n-kick punch1.ogg

https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips
chip-lay-3.ogg

https://opengameart.org/content/weapon-slash-effect sword-slash.png

https://pixabay.com/sound-effects/shining-anime-sound-effect-240582/
shining-anime-sound-effect-240582

https://www.zapsplat.com/music/anime-noisy-laser-blip/
zapsplat_cartoon_anime_laser_blip_noisy_92477
