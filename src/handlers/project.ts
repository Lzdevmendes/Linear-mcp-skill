import fs from 'fs/promises';
import path from 'path';
import { linearGraphQL } from '../api/client.js';

const STANDARD_LABELS = [
  { name: "Bug", color: "#E03E3E" },
  { name: "Feature", color: "#4B52B2" },
  { name: "Design", color: "#F2C94C" },
  { name: "Tech Debt", color: "#F2994A" },
  { name: "Urgent", color: "#B32E2E" }
];

export async function createProjectWithLabels(teamId: string, name: string, description?: string, projectPath?: string) {
  let content = undefined;
  if (projectPath) {
    try {
      const readmePath = path.join(projectPath, 'README.md');
      content = await fs.readFile(readmePath, 'utf8');
    } catch (e) {
      console.warn(`Could not read README.md from ${projectPath}, leaving content empty.`);
    }
  }

  const projectMutation = `mutation CreateProject($name: String!, $description: String, $teamId: String!, $content: String) {
    projectCreate(input: {name: $name, description: $description, content: $content, teamIds: [$teamId]}) {
      project { id name }
    }
  }`;
  const projectData = await linearGraphQL(projectMutation, { name, description, teamId, content });

  const labelsQuery = `query { issueLabels(first: 250) { nodes { id name } } }`;
  const labelsData = await linearGraphQL(labelsQuery);
  const existingLabelNames = labelsData.issueLabels.nodes.map((l: any) => l.name.toLowerCase());

  const createdLabels = [];
  for (const stdLabel of STANDARD_LABELS) {
    if (!existingLabelNames.includes(stdLabel.name.toLowerCase())) {
      const labelMutation = `mutation { issueLabelCreate(input: {name: "${stdLabel.name}", color: "${stdLabel.color}", teamId: "${teamId}"}) { issueLabel { id name } } }`;
      try {
        await linearGraphQL(labelMutation);
        createdLabels.push(stdLabel.name);
      } catch (error) {
        console.error(`Skipping label ${stdLabel.name}, it might already exist globally:`, error);
      }
    }
  }

  return {
    project: projectData.projectCreate.project,
    createdLabels
  };
}
