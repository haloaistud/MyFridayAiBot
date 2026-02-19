import { FunctionDeclaration, Type } from '@google/genai';

export const saveMemoryTool: FunctionDeclaration = {
  name: 'save_memory',
  description: 'Saves emotional patterns, personal milestones, or life goals to Friday’s long-term memory. IMPORTANT: For user profile details, always use entity: "User", relation: "name" or "age", and the user\'s input as the value.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      entity: { type: Type.STRING, description: 'The subject of the memory. Use "User" for core profile details like name or age.' },
      relation: { type: Type.STRING, description: 'The attribute or connection (e.g., "name", "age", "feels", "enjoys", "struggles with").' },
      value: { type: Type.STRING, description: 'The specific factual or emotional detail to remember.' },
    },
    required: ['entity', 'relation', 'value'],
  },
};

export const getMoodTrendTool: FunctionDeclaration = {
  name: 'get_mood_snapshot',
  description: 'Retrieves a summary of the user’s documented emotional trends to provide reflective feedback.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      period: { type: Type.STRING, description: 'Time range (e.g., "last week", "today")' }
    }
  },
};

export const appTools = [
  saveMemoryTool,
  getMoodTrendTool
];