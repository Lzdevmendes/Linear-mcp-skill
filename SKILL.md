---
name: linear-mcp
description: Linear MCP Server to standardize task creation and project organization
tags:
  - linear
  - mcp
  - tasks
  - project-management
---

# Linear MCP Server

This is a Model Context Protocol (MCP) server that connects AI assistants (like Claude, Antigravity, Cursor) directly to your Linear workspace. It provides standardized tools for creating Projects and Tasks.

## How it works

The server exposes 3 main tools:
1. `linear_list_teams`: Fetches available teams and their IDs from your Linear workspace.
2. `linear_create_project`: Creates a new project inside a specific team. It also automatically initializes a set of standard labels for that team (Bug, Feature, Design, Tech Debt, Urgent) if they don't exist yet.
3. `linear_create_task`: Creates a task in a standardized way. You can specify a deadline (in days), priorities, and attach standard labels. It automatically calculates the `dueDate` and finds the appropriate "Todo" state.

## Installation / Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. **Provide your Linear API Key**: 
Set the `LINEAR_API_KEY` environment variable when running the server, or add it to your Claude Desktop / Antigravity configuration.

### For Antigravity / Claude Desktop:

Add this to your MCP settings configuration (`claude_desktop_config.json` or Antigravity's MCP settings):

```json
{
  "mcpServers": {
    "linear-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/www/linear-mcp/build/index.js"],
      "env": {
        "LINEAR_API_KEY": "lin_api_your_key_here"
      }
    }
  }
}
```

## Standardized Usage via LLM

When an AI assistant has access to this MCP, it should:
- Always use `linear_list_teams` first if it doesn't know the team ID.
- Use `linear_create_project` when starting a new initiative to keep things organized. This ensures standard labels are generated.
- Use `linear_create_task` to document progress, passing `daysToComplete` to enforce deadlines and `labelNames` to categorize work correctly.

Enjoy automated, standardized task management!
