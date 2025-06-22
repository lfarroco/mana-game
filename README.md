relics were removed (focusing on unit balance for now)

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
        EventManager["EventManager (Global & Unit Events)"];
        DataSystem["Data Management (JSON, etc.)"];
    end

    %% Scene to Systems Connections
    Scene --- UIManager;
    Scene --- TraitSystem;
    Scene --- RelicSystem;
    Scene --- ShopSystem;
    Scene --- EventManager;
    Scene --- DataSystem;

    %% UIManager Details
    %% UIManager manages basic UI components
    UIManager -- Manages --> UIComponents["Tooltip, Buttons, GoldAnimator"];
    %% ShopSystem provides data/logic for its UI part
    UIManager -- Renders --> ShopSystemInterface["Shop UI"];
    UIManager -- Renders --> UnitDisplays["Unit Stats/Bars"];
    ShopSystem --- ShopSystemInterface;

    %% TraitSystem Details
    TraitSystem -- Affects --> Units;
    %% e.g., Relics granting traits or modifying trait effects
    TraitSystem -- Interacts with --> RelicSystem;
    TraitSystem -- Uses/Listens to --> EventManager;
    TraitSystem -- Loads definitions from --> DataSystem;
    %% Units possess traits that are processed by the TraitSystem
    Units -- Have/Trigger --> TraitSystem;

    %% RelicSystem Details
    RelicSystem -- Manages --> PlayerRelics;
    %% Relics can be acquired from the Shop
    RelicSystem -- Interacts with --> ShopSystem;
    RelicSystem -- Uses/Listens to --> EventManager;
    RelicSystem -- Loads definitions from --> DataSystem;
    %% Relics can apply effects to units
    Units -- Affected by --> RelicSystem;

    %% ShopSystem Details
    ShopSystem -- Provides --> PurchasableUnits["Units for Purchase"];
    ShopSystem -- Provides --> PurchasableRelics["Relics for Purchase"];
    %% For rendering the shop interface
    ShopSystem --- UIManager;
    %% e.g., for gold transactions, purchase events
    ShopSystem -- Uses/Listens to --> EventManager;
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
    %% Base stats, definitions, etc.
    DataSystem -- Provides Data to --> Units;
    %% Level configurations, enemy waves, etc.
    DataSystem -- Provides Data to --> Scene;

    %% Unit Interactions
    %% Units emit and respond to events
    Units -- Interact via --> EventManager;
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
