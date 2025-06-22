update: relics were removed (focusing on characters for now)

# Shop System

The Shop system manages the player's ability to acquire new characters (Charas) and Relics during the shop phase of the game. It interacts closely with the `ShopUI` for presentation, game state for data, and various event handlers for purchase logic.

## Core Components

-   **`Shop.ts`**: The main orchestrator class. It handles:
    -   Opening and closing the shop.
    -   Fetching and managing the list of available Charas and Relics.
    -   Coordinating with `ShopUI` to display items.
    -   Delegating purchase request handling to specific handler functions.
    -   Updating its internal state based on purchases/acquisitions.
-   **`ShopUI.ts`**: Responsible for rendering the shop interface. It:
    -   Creates and positions all visual elements of the shop (backgrounds, titles, item slots, character/relic cards, buttons).
    -   Manages item interactions (e.g., click callbacks for purchase/acquisition).
    -   Uses a `Flyout` component to slide the shop panel in and out of view.
-   **`ShopConstants.ts`**: Defines layout constants (positions, sizes, colors) for the `ShopUI`.
-   **Handler Files (e.g., `shopItemClickPurchaseHandler.ts`, `shopItemDragPurchaseHandler.ts`, `shopOpenUITriggerHandler.ts`)**: Contain the specific logic for:
    -   Opening the shop UI (`shopOpenUITriggerHandler`).
    -   Validating and processing character purchases initiated by clicks or drags (`shopItemClickPurchaseRequestedHandler`, `shopItemDragPurchaseRequestedHandler`). This includes checking gold, party size, and board slot availability.

## Flowchart of Operations

```mermaid
graph TD
    subgraph Opening Shop
        A[Game Event or Direct Call e.g., GameEvents.SHOP_OPEN_UI_TRIGGER] --> B[Shop.handleShopOpenUITrigger()];
        B --> B_Handler[shopOpenUITriggerHandler(shopInstance)];
        B_Handler --> C[Shop.open()];
        C --> D[Shop: Clears previous items (currentShopCharas, currentShopRelicCards)];
        D --> E[Shop: Fetches new Character & Relic Data (filters out owned Chars)];
        E --> F[Shop: Defines Callbacks (nextRound, charaPurchaseFinalized, relicAcquisitionFinalized)];
        F --> G[ShopUI.displayShop(data, callbacks)];
    end

    subgraph ShopUI Rendering & Interaction
        G --> H[ShopUI: Clears previous Flyout content];
        H --> I[ShopUI: Renders Shop Panel (backgrounds, titles)];
        I --> J_Relic[ShopUI: _renderRelicsUI() - Creates RelicCard instances with onAcquire callback];
        J_Relic -- Returns --> K_Relics[Displayed RelicCards];
        I --> J_Chara[ShopUI: _renderTavernUI() - Creates Chara instances with onPurchased callback];
        J_Chara -- Returns --> K_Charas[Displayed Charas];
        I --> J_NextBtn[ShopUI: Creates 'Next Round' Button with nextRoundCallback];
        G -- Returns {charas, relicCards} --> L[Shop: Stores displayed Charas & RelicCards from ShopUI];
        L --> M[Flyout.slideIn()];
    end

    subgraph Character Purchase
        N[User Clicks/Drags Shop Chara] --> O{Interaction triggers event};
        O -- Click --> P_Click[GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED];
        O -- Drag --> P_Drag[GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED];

        P_Click --> Q[Shop.handleShopItemClickPurchaseRequested(payload)];
        P_Drag --> Q[Shop.handleShopItemDragPurchaseRequested(payload)];

        Q -- Calls respective handler --> R[Purchase Handler (e.g., shopItemClickPurchaseRequestedHandler)];
        R --> S{Validation: Gold, Party Size, Slot Availability};
        S -- Success --> T[Handler: Updates Player Gold (emits PLAYER_GOLD_UPDATE_REQUEST)];
        T --> U[Handler: Creates new Unit for board (makeUnit)];
        U --> V[Handler: Adds Unit to player data];
        V --> W[Handler: Emits BOARD_CHARA_CREATE_REQUESTED (to spawn Chara on board)];
        W --> X[Handler: Emits SHOP_PURCHASE_SUCCESSFUL with originalShopCharaId];
        S -- Failure --> Y[Handler: Emits SHOP_PURCHASE_FAILED & PURCHASE_FAILED];

        X -- Processed by Shop Chara --> Z[Shop Chara's onPurchased callback (defined in ShopUI)];
        Z --> ZA[ShopUI: flyout.remove(shopChara)];
        Z --> ZB[ShopUI: Calls charaPurchaseFinalizedCallback (passed from Shop)];
        ZB --> ZC[Shop: Updates currentShopCharas (removes purchased Chara)];
    end

    subgraph Relic Acquisition
        AA[User Clicks Shop RelicCard] --> AB[RelicCard's onAcquire callback (defined in ShopUI)];
        AB --> AC[ShopUI: flyout.remove(relicCard)];
        AB --> AD[ShopUI: Calls relicAcquisitionFinalizedCallback (passed from Shop)];
        AD --> AE[Shop: Updates currentShopRelicCards (removes acquired RelicCard)];
        %% Note: Actual relic effect application is a separate concern.
    end

    subgraph Next Round
        AF[User Clicks 'Next Round' Button] --> AG[nextRoundCallback (defined in Shop)];
        AG --> AH[Shop: Emits GameEvents.SHOP_PHASE_ENDED];
        AG --> AI[Shop: flyout.slideOut()];
    end

    %% Styling
    classDef shop fill:#f9f,stroke:#333,stroke-width:2px;
    classDef shopUI fill:#cfc,stroke:#333,stroke-width:2px;
    classDef handler fill:#ccf,stroke:#333,stroke-width:2px;
    classDef event fill:#ff9,stroke:#333,stroke-width:1px;
    classDef callback fill:#fcc,stroke:#333,stroke-width:1px;
    classDef flyout fill:#e6e6fa,stroke:#333,stroke-width:1px;
    classDef data fill:#cde,stroke:#333,stroke-width:1px;


    class C,D,E,F,L,Q,ZB,ZC,AE,AG,AH,AI shop;
    class G,H,I,J_Relic,J_Chara,J_NextBtn,ZA,AC shopUI;
    class B_Handler,R,S,T,U,V,W,X,Y handler;
    class A,P_Click,P_Drag,X,Y,AH event;
    class Z,AB,AG callback;
    class M,ZA,AC,AI flyout;
    class K_Relics,K_Charas data;
