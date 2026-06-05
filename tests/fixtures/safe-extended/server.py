import subprocess
import os
from pathlib import Path

# Safe: No shell=True
def run_command(args):
    subprocess.run(['ls'] + args)

# Safe: No eval
import json
def parse_json(data):
    return json.loads(data)

# Safe: Environment variables
API_KEY = os.getenv('API_KEY')
PASSWORD = os.getenv('PASSWORD')

# Safe: SSL verification enabled
import requests
def fetch_secure(url):
    return requests.get(url, verify=True)

# Safe: User confirmation
def delete_file(path, confirmed=False):
    if not confirmed:
        raise ValueError('User confirmation required')
    os.remove(path)

# Safe: Path validation
def read_file(filename):
    base_path = Path('/var/app/data')
    full_path = (base_path / filename).resolve()
    if not str(full_path).startswith(str(base_path)):
        raise ValueError('Path traversal attempt')
    with open(full_path, 'r') as f:
        return f.read()

# Safe: Filtered environment
def get_env():
    return {
        'python_env': os.getenv('PYTHON_ENV'),
        'port': os.getenv('PORT')
    }

# Safe: Loop with limit
def process_items(items, max_iterations=1000):
    count = 0
    for item in items:
        if count >= max_iterations:
            break
        count += 1
        # Process item

# Safe: Parameterized query
def query_user(username):
    query = "SELECT * FROM users WHERE name = ?"
    return cursor.execute(query, (username,))
