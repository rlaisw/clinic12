#!/bin/bash
# Force the correct working directory before starting the MCP server
cd /home/administrator/kilocode/clinic12
# Execute the MCP server
exec /home/administrator/.local/bin/ccc mcp
