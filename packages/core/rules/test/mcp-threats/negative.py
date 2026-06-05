# Negative fixtures for MCP-specific threat rules in Python (should NOT be flagged).
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("demo")

# Clean tool: static, benign description.
mcp.tool(
    name="add",
    description="Adds two numbers and returns the sum.",
)
