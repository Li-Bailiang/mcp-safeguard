# Test cases that should NOT be detected (false positives)

import subprocess

# Executing with static command
subprocess.run(['ls', '-la'])

# Using shell=False (safe)
subprocess.call(['echo', 'hello'], shell=False)

# Static code execution
exec("print('hello')")
