#!/bin/bash

# Update all confidence fields from uppercase to lowercase
find /c/Users/admin/mcp-safeguard/packages/core/rules -name "*.yaml" -type f | while read file; do
  sed -i 's/confidence: MEDIUM/confidence: medium/g' "$file"
  sed -i 's/confidence: LOW/confidence: low/g' "$file"
  sed -i 's/confidence: HIGH/confidence: high/g' "$file"
done

echo "Updated all confidence fields to lowercase"
