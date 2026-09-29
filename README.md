# Linear MCP Server

A Model Context Protocol (MCP) server that seamlessly integrates AI assistants (like Antigravity, Claude, or Cursor) directly into your Linear workspace. It enables automated workspace management, standard project creation, and robust issue tracking.

## Features

- **Standardized Projects**: Create projects effortlessly. The server automatically ensures standard labels (Bug, Feature, Design, Tech Debt, Urgent) are present in the workspace, bypassing errors if global labels already exist.
- **Smart Tasks**: Create tasks and assign standard labels, priorities, and deadlines (calculated via `daysToComplete`). The tool automatically places new tasks into the appropriate "Todo" state.
- **Team Discovery**: Fetch all available teams and their IDs in your Linear workspace to ensure accurate routing.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lzdevmendes/Linear-mcp-skill.git
   cd Linear-mcp-skill
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration

To use this server with an MCP-compatible agent, you need a **Linear API Key**. 
You can obtain one from your Linear settings under API -> Personal API keys.

Add the configuration to your agent's MCP settings file:

```json
{
  "mcpServers": {
    "linear-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/Linear-mcp-skill/build/index.js"],
      "env": {
        "LINEAR_API_KEY": "lin_api_your_linear_api_key_here"
      }
    }
  }
}
```
*(Remember to replace `/absolute/path/to/` with the actual path to your repository).*

## Available Tools

- `linear_list_teams`: List all teams available in the Linear workspace.
- `linear_create_project`: Create a new project in a specified team.
- `linear_create_task`: Create a task in a standardized way.

## Development

The code is modularized into:
- `src/api/client.ts` - GraphQL client wrapper handling authentication.
- `src/handlers/project.ts` - Logic for project creation and label syncing.
- `src/handlers/task.ts` - Logic for task creation, state fetching, and label attachment.
- `src/index.ts` - MCP Server initialization and tool routing.

After making changes, run `npm run build` to compile the TypeScript code.
