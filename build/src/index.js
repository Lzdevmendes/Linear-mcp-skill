#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY) {
    console.error("LINEAR_API_KEY environment variable is required");
    process.exit(1);
}
const server = new index_js_1.Server({
    name: "linear-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
async function linearGraphQL(query, variables = {}) {
    const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": LINEAR_API_KEY,
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
        throw new Error(`Linear API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
    }
    return data.data;
}
const STANDARD_LABELS = [
    { name: "Bug", color: "#E03E3E" },
    { name: "Feature", color: "#4B52B2" },
    { name: "Design", color: "#F2C94C" },
    { name: "Tech Debt", color: "#F2994A" },
    { name: "Urgent", color: "#B32E2E" }
];
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "linear_list_teams",
                description: "List all teams available in the Linear workspace.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: []
                }
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
                        daysToComplete: { type: "number", description: "Number of days from today this task should be completed by. E.g. 7 for a week." },
                        labelNames: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of label names to attach (e.g. ['Bug', 'Urgent'])"
                        },
                        priority: { type: "number", description: "0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low" }
                    },
                    required: ["teamId", "title"]
                }
            }
        ]
    };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === "linear_list_teams") {
            const data = await linearGraphQL(`query { teams { nodes { id name key } } }`);
            return {
                content: [{ type: "text", text: JSON.stringify(data.teams.nodes, null, 2) }]
            };
        }
        if (request.params.name === "linear_create_project") {
            const { teamId, name, description } = request.params.arguments;
            // 1. Create Project
            const projectMutation = `mutation CreateProject($name: String!, $description: String, $teamId: String!) {
        projectCreate(input: {name: $name, description: $description, teamIds: [$teamId]}) {
          project { id name }
        }
      }`;
            const projectData = await linearGraphQL(projectMutation, { name, description, teamId });
            // 2. Setup Standard Labels
            const labelsQuery = `query { issueLabels(filter: {team: {id: {eq: "${teamId}"}}}) { nodes { id name } } }`;
            const labelsData = await linearGraphQL(labelsQuery);
            const existingLabelNames = labelsData.issueLabels.nodes.map((l) => l.name.toLowerCase());
            const createdLabels = [];
            for (const stdLabel of STANDARD_LABELS) {
                if (!existingLabelNames.includes(stdLabel.name.toLowerCase())) {
                    const labelMutation = `mutation { issueLabelCreate(input: {name: "${stdLabel.name}", color: "${stdLabel.color}", teamId: "${teamId}"}) { issueLabel { id name } } }`;
                    await linearGraphQL(labelMutation);
                    createdLabels.push(stdLabel.name);
                }
            }
            return {
                content: [{
                        type: "text",
                        text: `Project created successfully: ${JSON.stringify(projectData.projectCreate.project)}\nLabels initialized: ${createdLabels.length > 0 ? createdLabels.join(', ') : 'Already existed'}`
                    }]
            };
        }
        if (request.params.name === "linear_create_task") {
            const { teamId, projectId, title, description, daysToComplete, labelNames, priority } = request.params.arguments;
            // Calculate Due Date
            let dueDate;
            if (daysToComplete) {
                const date = new Date();
                date.setDate(date.getDate() + daysToComplete);
                dueDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
            }
            // Fetch state ID (Todo state)
            const statesQuery = `query { workflowStates(filter: {team: {id: {eq: "${teamId}"}}}) { nodes { id name type } } }`;
            const statesData = await linearGraphQL(statesQuery);
            const todoState = statesData.workflowStates.nodes.find((s) => s.type === 'unstarted') || statesData.workflowStates.nodes[0];
            // Fetch Label IDs by name
            const labelIds = [];
            if (labelNames && labelNames.length > 0) {
                const labelsQuery = `query { issueLabels(filter: {team: {id: {eq: "${teamId}"}}}) { nodes { id name } } }`;
                const labelsData = await linearGraphQL(labelsQuery);
                for (const labelName of labelNames) {
                    const found = labelsData.issueLabels.nodes.find((l) => l.name.toLowerCase() === labelName.toLowerCase());
                    if (found) {
                        labelIds.push(found.id);
                    }
                }
            }
            // Create Task
            const issueMutation = `
        mutation CreateIssue($title: String!, $description: String, $teamId: String!, $projectId: String, $dueDate: TimelessDate, $labelIds: [String!], $stateId: String, $priority: Int) {
          issueCreate(input: {
            title: $title,
            description: $description,
            teamId: $teamId,
            projectId: $projectId,
            dueDate: $dueDate,
            labelIds: $labelIds,
            stateId: $stateId,
            priority: $priority
          }) {
            issue { id title url }
          }
        }
      `;
            const issueData = await linearGraphQL(issueMutation, {
                title, description, teamId, projectId, dueDate, labelIds, stateId: todoState?.id, priority
            });
            return {
                content: [{ type: "text", text: JSON.stringify(issueData.issueCreate.issue, null, 2) }]
            };
        }
        throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, "Unknown tool");
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
async function run() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Linear MCP server running on stdio");
}
run().catch(console.error);
