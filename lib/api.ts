
// Basic API utility to interact with n8n webhooks

const N8N_BASE_URL = "https://flow.supralawyer.com/webhook"; // Update this with your actual n8n base URL if different

export async function triggerWorkflow(endpoint: string, data: any) {
  try {
    const response = await fetch(`${N8N_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error triggering workflow: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Workflow trigger failed:", error);
    throw error;
  }
}

export async function fetchProjectStatus(projectId: string) {
  // Mock implementation for now - replace with actual GET request to n8n or Notion proxy
  return {
    id: projectId,
    status: "in-progress",
    step: "writing",
  };
}
