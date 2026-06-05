# Test cases that SHOULD be detected by indirect-injection rules

import requests
import os

# mcp-python-unsanitized-fetch - should detect
response = requests.get(user_url)

# mcp-python-path-traversal - should detect
with open(user_path, 'r') as f:
    content = f.read()

# mcp-python-sql-injection - should detect
query = "SELECT * FROM users WHERE id = " + user_id
cursor.execute(query)

# Also should detect f-string
cursor.execute(f"SELECT * FROM users WHERE name = '{username}'")
