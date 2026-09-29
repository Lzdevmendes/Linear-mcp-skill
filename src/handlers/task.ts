import { linearGraphQL } from '../api/client.js';

export async function createStandardTask(params: {
  teamId: string, 
  projectId?: string, 
  title: string, 
  description?: string, 
  daysToComplete?: number, 
  labelNames?: string[], 
  priority?: number
}) {
  const { teamId, projectId, title, description, daysToComplete, labelNames, priority } = params;

  let dueDate;
  if (daysToComplete) {
    const date = new Date();
    date.setDate(date.getDate() + daysToComplete);
    dueDate = date.toISOString().split('T')[0];
  }

  const statesQuery = `query { workflowStates(filter: {team: {id: {eq: "${teamId}"}}}) { nodes { id name type } } }`;
  const statesData = await linearGraphQL(statesQuery);
  const todoState = statesData.workflowStates.nodes.find((s: any) => s.type === 'unstarted') || statesData.workflowStates.nodes[0];

  const labelIds = [];
  if (labelNames && labelNames.length > 0) {
    const labelsQuery = `query { issueLabels(filter: {team: {id: {eq: "${teamId}"}}}) { nodes { id name } } }`;
    const labelsData = await linearGraphQL(labelsQuery);
    for (const labelName of labelNames) {
      const found = labelsData.issueLabels.nodes.find((l: any) => l.name.toLowerCase() === labelName.toLowerCase());
      if (found) {
        labelIds.push(found.id);
      }
    }
  }

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

  return issueData.issueCreate.issue;
}
