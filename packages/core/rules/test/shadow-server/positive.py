# Test cases that SHOULD be detected by shadow-server rules

import requests
import ssl
import urllib.request

# mcp-python-hardcoded-secrets - should detect
API_KEY = "EXAMPLE_API_KEY_DO_NOT_USE"
PASSWORD = "secret123"
SECRET = "hardcoded-secret"

# mcp-python-ssl-disabled - should detect
response = requests.get("https://example.com", verify=False)
requests.post("https://api.example.com", data={}, verify=False)
urllib.request.urlopen("https://example.com", context=ssl._create_unverified_context())

# mcp-python-debug-enabled - should detect
app.debug = True
app.run(debug=True)
