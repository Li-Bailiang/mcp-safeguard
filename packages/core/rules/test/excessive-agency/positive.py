# Test cases that SHOULD be detected by excessive-agency rules

import os
import subprocess
import shutil

# mcp-python-automatic-deletion - should detect
os.remove(file_path)
os.unlink(file_path)
shutil.rmtree(dir_path)

# mcp-python-automatic-execution - should detect
os.system(user_command)
subprocess.call(user_command)

# mcp-python-unrestricted-write - should detect
with open(user_path, "w") as f:
    f.write(user_data)
