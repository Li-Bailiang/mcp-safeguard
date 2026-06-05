# Test cases that should NOT be detected (false positives)

import requests
import os

# Credentials from environment
API_KEY = os.getenv("API_KEY")
PASSWORD = os.environ.get("PASSWORD")

# SSL verification enabled (default)
response = requests.get("https://example.com", verify=True)
response2 = requests.get("https://example.com")  # verify=True is default

# Debug disabled in production
app.debug = False
if os.getenv("ENV") == "development":
    app.run(debug=True)
else:
    app.run(debug=False)
