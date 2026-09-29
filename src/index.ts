#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

import { linearGraphQL } from "./api/client.js";
import { createProjectWithLabels } from "./handlers/project.js";
import { createStandardTask } from "./handlers/task.js";

const server = new Server(
  { name: "linear-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "linear_list_teams",
        description: "List all teams available in the Linear workspace.",
        inputSchema: { type: "object", properties: {}, required: [] }
      },
      {
        name: "linear_create_project",
        description: "Create a new standardized project in Linear, and automatically create standard labels for the team.",
        inputSchema: {
          type: "object",
          properties: {
            teamId: { type: "string", description: "The ID of the team" },
            name: { type: "string", description: "Project name" },
            description: { type: "string", description: "Project description" }
          },
          required: ["teamId", "name"]
        }
      },
      {
        name: "linear_create_task",
        description: "Create a standardized task in Linear. Handles assigning standard labels and calculating due date.",
        inputSchema: {
          type: "object",
          properties: {
            teamId: { type: "string", description: "The ID of the team" },
            projectId: { type: "string", description: "Optional project ID" },
            title: { type: "string", description: "Task title" },
            description: { type: "string", description: "Task description in markdown" },
            daysToComplete: { type: "number", description: "Number of days from today this task should be completed by." },
            labelNames: { type: "array", items: { type: "string" }, description: "List of label names to attach" },
            priority: { type: "number", description: "0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low" }
          },
          required: ["teamId", "title"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "linear_list_teams") {
      const data = await linearGraphQL(`query { teams { nodes { id name key } } }`);
      return { content: [{ type: "text", text: JSON.stringify(data.teams.nodes, null, 2) }] };
    }

    if (request.params.name === "linear_create_project") {
      const { teamId, name, description } = request.params.arguments as any;
      const result = await createProjectWithLabels(teamId, name, description);
      return {
        content: [{ 
          type: "text", 
          text: `Project created successfully: ${JSON.stringify(result.project)}\nLabels initialized: ${result.createdLabels.length > 0 ? result.createdLabels.join(', ') : 'Already existed'}` 
        }]
      };
    }

    if (request.params.name === "linear_create_task") {
      const issue = await createStandardTask(request.params.arguments as any);
      return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
    }

    throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linear MCP server running on stdio");
}

run().catch(console.error);
