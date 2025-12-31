#!/bin/bash
set -e

# Define paths
DB_DIR="server/db"

echo "Setting up clean database environment..."
cd $DB_DIR

# Tear down any existing containers and volumes to ensure empty DB
docker-compose down -v

# Start the database in background
docker-compose up -d --build

# Wait for DB to be ready
echo "Waiting for database to be ready..."
# Simple wait loop for Postgres
# We loop until pg_isready returns 0 inside the container, or just sleep a bit + robust retry in test
# For simplicity in this script, we'll sleep 5 seconds which is usually enough for the official image
sleep 5

# Or robustly:
# until docker-compose exec -T db pg_isready -U postgres; do
#   echo "Waiting for postgres..."
#   sleep 1
# done

cd ../../

echo "Running Integration Tests..."
# Run the integration test
# We use 'npx jest' directly or via npm run
npx jest server/db_integration.test.ts

TEST_EXIT_CODE=$?

echo "Tearing down database..."
cd $DB_DIR
docker-compose down -v

exit $TEST_EXIT_CODE
