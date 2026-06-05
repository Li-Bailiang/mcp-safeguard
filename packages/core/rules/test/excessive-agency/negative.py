# Test cases that should NOT be detected (false positives)

import os
import subprocess
import shutil

# File deletion with approval
if confirm("Delete this file?"):
    os.remove(file_path)

# File deletion with user approval
user_approval("delete-file")
shutil.rmtree(dir_path)

# Code execution with approval
approved = ask_user("Execute command?")
if approved:
    os.system(user_command)

# File write with path restriction
if user_path.startswith(ALLOWED_DIR):
    with open(user_path, "w") as f:
        f.write(user_data)

# File write with validation
if is_allowed_path(user_path):
    with open(user_path, "w") as f:
        f.write(user_data)
