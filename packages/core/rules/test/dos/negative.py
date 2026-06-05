# Test cases that should NOT be detected (false positives)

# Loop with break condition
while True:
    if should_stop():
        break
    process_data()

# File reading with size check
import os
file_stats = os.stat(user_file_path)
if file_stats.st_size < MAX_FILE_SIZE:
    with open(user_file_path) as f:
        content = f.read()

# Chunked file reading
with open(user_file_path) as f:
    for line in f:
        process_line(line)
