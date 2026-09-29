export const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error("LINEAR_API_KEY environment variable is required");
  process.exit(1);
}

export async function linearGraphQL(query: string, variables: any = {}) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": LINEAR_API_KEY as string,
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
