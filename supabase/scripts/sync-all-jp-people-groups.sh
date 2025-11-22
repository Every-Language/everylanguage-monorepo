#!/bin/bash
# Script to sync all Joshua Project people groups incrementally
# This avoids timeout issues by processing in batches

set -e

SUPABASE_URL="https://sjczwtpnjbmscxoszlyi.supabase.co"
API_KEY="sb_publishable_uDI2GK2IFbT5owUM_HPtug_M3UNksJr"
PAGES_PER_BATCH=10
MAX_ATTEMPTS=1000  # Safety limit

echo "Starting incremental sync of Joshua Project people groups..."
echo "Processing $PAGES_PER_BATCH pages per batch"

page_start=1
total_synced=0
batch_num=1

while [ $batch_num -le $MAX_ATTEMPTS ]; do
  echo ""
  echo "=== Batch $batch_num: Pages $page_start-$((page_start + PAGES_PER_BATCH - 1)) ==="
  
  response=$(curl -s -L -X POST "${SUPABASE_URL}/functions/v1/sync-jp-people-groups-cache" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "apikey: ${API_KEY}" \
    -H "Content-Type: application/json" \
    --data "{\"maxPages\": ${PAGES_PER_BATCH}, \"startPage\": ${page_start}}" \
    --max-time 180 2>&1)
  
  echo "Response: $response"
  
  # Check if response indicates success
  if echo "$response" | grep -q '"success":true'; then
    fetched=$(echo "$response" | grep -o '"total_fetched":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo "Fetched: $fetched records"
    
    if [ "$fetched" -eq "0" ]; then
      echo "No more data to fetch. Sync complete!"
      break
    fi
    
    total_synced=$((total_synced + fetched))
    page_start=$((page_start + PAGES_PER_BATCH))
    batch_num=$((batch_num + 1))
    
    # Small delay between batches
    sleep 2
  elif echo "$response" | grep -q "WORKER_LIMIT"; then
    echo "⚠️  Worker limit reached. Reducing batch size..."
    if [ $PAGES_PER_BATCH -gt 1 ]; then
      PAGES_PER_BATCH=$((PAGES_PER_BATCH / 2))
      echo "New batch size: $PAGES_PER_BATCH pages"
    else
      echo "❌ Batch size already at minimum. Cannot proceed."
      exit 1
    fi
  else
    echo "❌ Error: $response"
    exit 1
  fi
done

echo ""
echo "✅ Sync complete! Total records synced: $total_synced"

