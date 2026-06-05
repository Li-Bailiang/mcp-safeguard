# Test cases that SHOULD be detected by context-overshare rules

import os
import logging

# mcp-python-env-exposure - should detect
env_vars = os.environ

# mcp-python-excessive-logging - should detect
print(sensitive_data)
logging.info(user_data)
