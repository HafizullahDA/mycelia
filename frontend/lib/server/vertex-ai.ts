type VertexAiConfig = {
  apiKey: string;
  projectId: string | null;
  location: string;
};

export const getVertexAiConfig = (): VertexAiConfig => {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY ?? process.env.GEMINI_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? null;
  const location = process.env.GEMINI_VERTEX_LOCATION ?? 'us-central1';

  if (!apiKey) {
    throw new Error('Missing Vertex AI API key. Add GOOGLE_CLOUD_API_KEY to the frontend environment.');
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

  if (projectId) {
    return `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;
  }

  return `publishers/google/models/${model}`;
};

export const buildVertexAiGenerateContentUrl = (model: string): string => {
  const { apiKey } = getVertexAiConfig();
  const modelPath = buildVertexAiModelPath(model);

  return `https://aiplatform.googleapis.com/v1/${modelPath}:generateContent?key=${apiKey}`;
};
