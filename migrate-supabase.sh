#!/bin/bash

# Supabase Migration Script
# Make sure you have PostgreSQL client tools (pg_dump, psql) installed.

echo "--- Supabase Migration Preparation ---"

# Old Project (Source)
# You can find the DB password in your Supabase dashboard settings under Database
OLD_DB_URL="postgresql://postgres.[YOUR_OLD_PROJECT_ID]:[YOUR_OLD_DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# New Project (Destination)
NEW_DB_URL="postgresql://postgres.[YOUR_NEW_PROJECT_ID]:[YOUR_NEW_DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

echo "1. Dumping roles from the old database..."
pg_dumpall --clean --if-exists --no-role-passwords -h aws-0-[REGION].pooler.supabase.com -p 6543 -U postgres.[YOUR_OLD_PROJECT_ID] --roles-only > roles.sql

echo "2. Dumping schema and data from the old database..."
pg_dump --clean --if-exists --quote-all-identifiers -h aws-0-[REGION].pooler.supabase.com -p 6543 -U postgres.[YOUR_OLD_PROJECT_ID] -d postgres > dump.sql

echo "Data dumped successfully to roles.sql and dump.sql!"

echo ""
echo "To complete the migration to the new project, run:"
echo "psql \"\$NEW_DB_URL\" -f roles.sql"
echo "psql \"\$NEW_DB_URL\" -f dump.sql"
echo ""
echo "Note: Make sure to replace [YOUR_OLD_PROJECT_ID], [YOUR_NEW_PROJECT_ID], [YOUR_OLD_DB_PASSWORD], [YOUR_NEW_DB_PASSWORD], and [REGION] with your actual project details."
