# Test cases that SHOULD be detected by supply-chain rules

import subprocess

# mcp-python-subprocess-shell - should detect
subprocess.call(user_command, shell=True)
subprocess.run(user_input, shell=True)
subprocess.Popen(cmd, shell=True)

# mcp-python-exec-eval - should detect
exec(user_code)
eval(user_expression)
