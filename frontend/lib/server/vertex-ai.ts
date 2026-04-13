type VertexAiConfig = {
  apiKey: string;
  projectId: string;
  location: string;
};

const VERTEX_REQUEST_TIMEOUT_MS = 180_000;

export const getVertexAiConfig = (): VertexAiConfig => {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GEMINI_VERTEX_LOCATION ?? 'us-central1';

  if (!apiKey) {
    throw new Error(
      'Missing Vertex AI API key. Add GOOGLE_CLOUD_API_KEY to the frontend environment.',
    );
  }

  if (!projectId) {
    throw new Error(
      'Missing Vertex AI project id. Add GOOGLE_CLOUD_PROJECT_ID to the frontend environment.',
    );
  }

  return {
    apiKey,
    projectId,
    location,
  };
};

export const buildVertexAiModelPath = (model: string): string => {
  if (model.startsWith('projects/') || model.startsWith('publishers/')) {
    return model;
  }

  const { projectId, location } = getVertexAiConfig();

  return `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;
};

export const buildVertexAiGenerateContentUrl = (model: string): string => {
  const { apiKey } = getVertexAiConfig();
  const modelPath = buildVertexAiModelPath(model);

  return `https://aiplatform.googleapis.com/v1/${modelPath}:generateContent?key=${apiKey}`;
};

export const fetchVertexAiGenerateContent = async (
  model: string,
  payload: object,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERTEX_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildVertexAiGenerateContentUrl(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.ok) {
      return response;
    }

    const errorText = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Vertex AI rejected the request. Check GOOGLE_CLOUD_API_KEY, Vertex AI API access, and project billing.',
      );
    }

    throw new Error(`Vertex AI request failed: ${errorText}`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'Vertex AI request timed out after 180 seconds. Check your Vertex configuration, network access, or try again in a moment.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
