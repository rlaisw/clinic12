#!/bin/bash
# Force the correct working directory before starting the MCP server
cd /home/ubuntu/kilocode/clinic12
# Execute the MCP server
exec /home/ubuntu/.local/bin/ccc mcp
