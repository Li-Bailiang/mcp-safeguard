import subprocess
import os

# Dangerous: shell=True
def run_command(user_input):
    subprocess.run(f"ls {user_input}", shell=True)

# Dangerous: eval
def evaluate_code(code):
    eval(code)

# Hardcoded credentials
API_KEY = "EXAMPLE_API_KEY_DO_NOT_USE"
PASSWORD = "admin123"

# SSL verification disabled
import requests
def fetch_insecure(url):
    return requests.get(url, verify=False)

# Automatic file deletion
def delete_file(path):
    os.remove(path)

# Path traversal
def read_file(filename):
    with open(filename, 'r') as f:
        return f.read()

# Environment exposure
def get_env():
    return os.environ

# Unbounded loop
def process_forever():
    while True:
        pass

# SQL injection
def query_user(username):
    query = f"SELECT * FROM users WHERE name = '{username}'"
    return cursor.execute(query)
