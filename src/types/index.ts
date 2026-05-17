export enum AgentRole {
  STORYTELLER = 'storyteller',
  DIRECTOR = 'director'
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  personality: string;
  style: string;
  color: string;
  temperature: number;
  avatar: string;
  model?: string;
  provider?: ProviderType;
}

export type ProviderType = 'openai' | 'gemini' | 'featherless' | 'lmstudio' | 'ollama';

export interface ProviderConfig {
  provider: ProviderType;
  model: string;
}

export interface StoryParams {
  chaosLevel: number;
}

export interface StoryboardItem {
  id: string;
  round: number;
  description: string;
  imageUrl: string;
}

export interface ChatMessage {
  id: string; // Used to identify stream chunks to the same message
  agentId?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string; // name of the agent
}
