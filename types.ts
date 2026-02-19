export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting' | 'initializing';

export interface DebugLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
}

export interface AudioVisualizerData {
  userVolume: number;
  aiVolume: number;
}

export interface LiveConfig {
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export type ChatMode = 'smart' | 'fast' | 'search';

export interface Source {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  sources?: Source[];
  timestamp: number;
  toolCalls?: ToolCallDetails[];
}

export interface ToolCallDetails {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
}

export interface MemoryNode {
  id: string;
  entity: string;
  relation: string;
  value: string;
  confidence: number;
  timestamp: number;
  lastAccessed: number;
  source: 'user' | 'inference';
}

export interface MemoryGraph {
  nodes: MemoryNode[];
}