# Test cases that SHOULD be detected by DOS rules

# mcp-python-unbounded-loop - should detect
while True:
    process_data()

# mcp-python-large-file - should detect
with open(user_file_path) as f:
    content = f.read()
