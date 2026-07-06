import OpenAI from 'openai';
import { PROVIDERS } from './config/models';

export async function detectLocalModel(providerId: string): Promise<string> {
  const info = PROVIDERS[providerId];
  if (!info) throw new Error(`Unknown local provider: "${providerId}"`);

  try {
    const tempClient = new OpenAI({ baseURL: info.baseURL, apiKey: 'local' });
    const models = await tempClient.models.list();
    if (!models.data || models.data.length === 0) {
      throw new Error(`No models found on ${info.name}`);
    }
    const modelId = models.data[0].id;
    if (!modelId) throw new Error(`Could not parse model list response`);
    console.log(`  ✅ Auto-detected model: ${modelId}`);
    return String(modelId);
  } catch (err: any) {
    throw new Error(
      `Cannot connect to ${info.name} at ${info.baseURL}. Is the server running? ${err.message}`
    );
  }
}
