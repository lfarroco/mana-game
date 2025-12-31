
#!/bin/bash
PID="debug_player_$(date +%s)"
HOST="http://localhost:3000"

echo "Connecting $PID..."
curl -s -X POST "$HOST/multiplayer/connect" -H "Content-Type: application/json" -d "{\"playerId\":\"$PID\"}"
echo ""

# Update team explicitly first
# Sending 'team' directly in body so it becomes part of 'payload' rest param in server
TEAM='{"units":[{"id":"u1","cardId":"mana_crystal","position":{"x":1,"y":1},"isCore":true, "force":"PLAYER"}]}'
echo "Updating team..."
curl -s -X POST "$HOST/multiplayer/action" -H "Content-Type: application/json" -d "{\"playerId\":\"$PID\", \"actionId\":\"update_team\", \"team\":$TEAM}"
echo ""

# Generate Options for Step 1
echo "Generating Options (Step 1)..."
curl -s -X GET "$HOST/multiplayer/state?playerId=$PID" > /dev/null
echo " Done"

# Step 1: Encounter
echo "Step 1 Action (Encounter)..."
curl -s -X POST "$HOST/multiplayer/action" -H "Content-Type: application/json" -d "{\"playerId\":\"$PID\", \"actionId\":\"upgrade_unit\"}"
echo ""

# Generate Options for Step 2
echo "Generating Options (Step 2)..."
curl -s -X GET "$HOST/multiplayer/state?playerId=$PID" > /dev/null
echo " Done"

# Step 2: Shop
echo "Step 2 Action (Shop)..."
# Selecting first option usually available (randomly generated, but we can try 'upgrade_unit' if available or just fail if strict
# Wait, shop options are random cards. I need to know the IDs.
# For simulation, I can just grab the ID from the previous state call if I parsed it.
# Simplification: I'll disable validation in my mind, but server enforces it.
# To make this script robust, I should parse the output. But for now let's hope 'upgrade_unit' isn't in shop.
# Actually, typically shop has cards.
# I'll just skip detailed simulation of steps 2-3 if I can...
# But I need to reach Step 4.
# I will use grep/sed to extract an option ID from the state response.

STATE=$(curl -s -X GET "$HOST/multiplayer/state?playerId=$PID")
OPT=$(echo $STATE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Step 2 Action with option $OPT..."
curl -s -X POST "$HOST/multiplayer/action" -H "Content-Type: application/json" -d "{\"playerId\":\"$PID\", \"actionId\":\"$OPT\"}"
echo ""


echo "Generating Options (Step 3)..."
STATE=$(curl -s -X GET "$HOST/multiplayer/state?playerId=$PID")
OPT=$(echo $STATE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Done"

# Step 3: Encounter
echo "Step 3 Action with option $OPT..."
curl -s -X POST "$HOST/multiplayer/action" -H "Content-Type: application/json" -d "{\"playerId\":\"$PID\", \"actionId\":\"$OPT\"}"
echo ""

echo "Generating Options (Step 4)..."
STATE=$(curl -s -X GET "$HOST/multiplayer/state?playerId=$PID")
OPT=$(echo $STATE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Done"

# Step 4: Shop (Transition to Combat)
# Important: Send Team here too to mimic client behavior (client sends phantom team updates)
# But even if not, previous update_team should have saved it.
echo "Step 4 Action with option $OPT..."
curl -s -X POST "$HOST/multiplayer/action" -H "Content-Type: application/json" -d "{\"playerId\":\"$PID\", \"actionId\":\"$OPT\"}"
echo ""

# Get Combat State
echo "Getting Combat Options..."
curl -s -X GET "$HOST/multiplayer/state?playerId=$PID"
echo ""
