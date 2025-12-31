FROM postgres:15

# Copy the initialization script to the docker entrypoint directory
# Postgres container will automatically run scripts in this directory on startup
COPY schema.sql /docker-entrypoint-initdb.d/init.sql

EXPOSE 5432
