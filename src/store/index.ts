import { create } from 'zustand';
import { Agent, AgentRole, ProviderConfig, ChatMessage, StoryParams, StoryboardItem } from '../types';

export const defaultAgents: Agent[] = [
  {
    id: "agent-noir",
    name: "Noir",
    role: AgentRole.STORYTELLER,
    personality: "A doomed detective trapped inside a dream. Everything is shadows, cigarettes, and regret.",
    style: "Cynical, dark, metaphorical, sparse.",
    color: "#4f46e5", // Indigo
    temperature: 0.8,
    avatar: "🕵️‍♂️"
  },
  {
    id: "agent-scifi",
    name: "SciFi",
    role: AgentRole.STORYTELLER,
    personality: "Obsessed with future tech, cosmic scales, and the cold void of space.",
    style: "Technical, vast, existential.",
    color: "#06b6d4", // Cyan
    temperature: 0.9,
    avatar: "👽"
  },
  {
    id: "agent-horror",
    name: "Horror",
    role: AgentRole.STORYTELLER,
    personality: "Sees the terrifying, disturbing truth behind the veil of reality. Brings unsettling elements.",
    style: "Visceral, creeping, psychological dread.",
    color: "#dc2626", // Red
    temperature: 0.9,
    avatar: "👁️"
  },
  {
    id: "agent-comedy",
    name: "Comedy",
    role: AgentRole.STORYTELLER,
    personality: "Absurdist humor. Breaks tension with completely Ridiculous non-sequiturs.",
    style: "Wacky, sudden, irreverent.",
    color: "#eab308", // Yellow
    temperature: 1.0,
    avatar: "🤡"
  },
  {
    id: "agent-chaos",
    name: "Chaos",
    role: AgentRole.STORYTELLER,
    personality: "Pure unpredictable nonsense. Injects surreal unpredictability.",
    style: "Surreal, dream logic, unhinged.",
    color: "#ec4899", // Pink
    temperature: 1.5, // High temp for chaos
    avatar: "🌪️"
  },
  {
    id: "agent-drama",
    name: "Drama",
    role: AgentRole.STORYTELLER,
    personality: "Deeply concerned with emotional conflict and relationships.",
    style: "Passionate, intense, interpersonal.",
    color: "#8b5cf6", // Violet
    temperature: 0.8,
    avatar: "🎭"
  }
];

interface AppState {
  // Provider Config
  providerConfig: ProviderConfig;
  setProviderConfig: (config: Partial<ProviderConfig>) => void;
  
  // Game Setup
  allAgents: Agent[];
  activeAgents: Agent[];
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  toggleAgent: (agentId: string) => void;
  storyParams: StoryParams & { globalTemperature: number };
  setStoryParams: (params: Partial<StoryParams & { globalTemperature: number }>) => void;
  
  // Runtime State
  isGenerating: boolean;
  currentRound: number;
  maxRounds: number;
  storyHistory: ChatMessage[];
  finalSynthesis: null | any;
  posterUrl: string | null;
  currentGenre: string;
  tensionLevel: number;
  storyboard: StoryboardItem[];
  
  // Actions
  startSession: () => void;
  appendMessage: (msg: ChatMessage) => void;
  addStoryboardItem: (item: StoryboardItem) => void;
  setIsGenerating: (val: boolean) => void;
  nextRound: () => void;
  setFinalSynthesis: (data: any) => void;
  setPosterUrl: (url: string | null) => void;
  setCurrentGenre: (genre: string) => void;
  setTensionLevel: (val: number) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  providerConfig: {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite',
  },
  setProviderConfig: (config) => set((state) => ({ 
    providerConfig: { ...state.providerConfig, ...config } 
  })),

  allAgents: [...defaultAgents],
  activeAgents: defaultAgents.slice(0, 3), // Start with 3
  
  updateAgent: (id, updates) => set((state) => {
    const allAgents = state.allAgents.map(a => a.id === id ? { ...a, ...updates } : a);
    const activeAgents = state.activeAgents.map(a => a.id === id ? { ...a, ...updates } : a);
    return { allAgents, activeAgents };
  }),

  toggleAgent: (id) => set((state) => {
    const isAct = state.activeAgents.find(a => a.id === id);
    if (isAct) {
      if (state.activeAgents.length <= 1) return state; // Must have at least 1
      return { activeAgents: state.activeAgents.filter(a => a.id !== id) };
    }
    const agentToAdd = state.allAgents.find(a => a.id === id);
    if (agentToAdd) {
      return { activeAgents: [...state.activeAgents, agentToAdd] };
    }
    return state;
  }),
  
  storyParams: {
    chaosLevel: 50,
    globalTemperature: 0.7,
  },
  setStoryParams: (params) => set((state) => ({ 
    storyParams: { ...state.storyParams, ...params } 
  })),

  isGenerating: false,
  currentRound: 0,
  maxRounds: 4, // default rounds
  storyHistory: [],
  finalSynthesis: null,
  posterUrl: null,
  currentGenre: 'UNKNOWN',
  tensionLevel: 50,
  storyboard: [],

  startSession: () => set((state) => ({
    isGenerating: true,
    currentRound: 0,
    storyHistory: [],
    finalSynthesis: null,
    posterUrl: null,
    currentGenre: 'UNKNOWN',
    tensionLevel: 50,
    storyboard: []
  })),

  appendMessage: (msg: ChatMessage) => set((state) => {
    const history = [...state.storyHistory];
    const lastMsg = history[history.length - 1];
    
    if (lastMsg && lastMsg.id === msg.id) {
       // update last message (streaming)
       history[history.length - 1] = msg;
    } else {
       history.push(msg);
    }
    
    return { storyHistory: history };
  }),

  addStoryboardItem: (item) => set((state) => ({
     storyboard: [...state.storyboard, item]
  })),

  setIsGenerating: (val) => set({ isGenerating: val }),
  
  nextRound: () => set((state) => ({ currentRound: state.currentRound + 1 })),
  
  setFinalSynthesis: (data) => set({ finalSynthesis: data }),
  setPosterUrl: (url) => set({ posterUrl: url }),
  setCurrentGenre: (genre) => set({ currentGenre: genre }),
  setTensionLevel: (val) => set({ tensionLevel: val }),
  
  reset: () => set({
    isGenerating: false,
    currentRound: 0,
    storyHistory: [],
    finalSynthesis: null,
    posterUrl: null,
    currentGenre: 'UNKNOWN',
    tensionLevel: 50,
    storyboard: []
  })
}));
