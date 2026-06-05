# Test cases that should NOT be detected (false positives)

import logging

# Logging non-sensitive data
print("Application started")
logging.info("Request completed")

# Logging with redaction
redacted = redact(sensitive_data)
print(redacted)
