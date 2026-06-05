# Test cases that should NOT be detected (false positives)

import requests
import os

# URL is validated
if validators.url(user_url):
    response = requests.get(user_url)

# URL is sanitized
clean_url = sanitize(user_url)
response = requests.get(clean_url)

# Path is validated
if is_safe_path(user_path):
    with open(user_path, 'r') as f:
        content = f.read()

# Using safe path resolution
safe_path = os.path.abspath(user_path)
with open(safe_path, 'r') as f:
    content = f.read()

# Using parameterized query (safe)
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))

# SQL with escaped input
escaped_id = escape(user_id)
query = "SELECT * FROM users WHERE id = " + escaped_id
cursor.execute(query)
