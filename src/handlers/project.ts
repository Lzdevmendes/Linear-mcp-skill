import { linearGraphQL } from '../api/client.js';

const STANDARD_LABELS = [
  { name: "Bug", color: "#E03E3E" },
  { name: "Feature", color: "#4B52B2" },
  { name: "Design", color: "#F2C94C" },
  { name: "Tech Debt", color: "#F2994A" },
  { name: "Urgent", color: "#B32E2E" }
];

export async function createProjectWithLabels(teamId: string, name: string, description?: string) {
  const projectMutation = `mutation CreateProject($name: String!, $description: String, $teamId: String!) {
    projectCreate(input: {name: $name, description: $description, teamIds: [$teamId]}) {
      project { id name }
    }
  }`;
  const projectData = await linearGraphQL(projectMutation, { name, description, teamId });

  const labelsQuery = `query { issueLabels(filter: {team: {id: {eq: "${teamId}"}}}) { nodes { id name } } }`;
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
