import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore, defaultAgents } from './store';
import { useStoryEngine } from './hooks/useStoryEngine';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Play, 
  Square, 
  Clapperboard, 
  Loader2, 
  Menu, 
  BarChart2, 
  X, 
  Zap, 
  Fingerprint, 
  Terminal,
  Cpu,
  Sparkles
} from 'lucide-react';

// UI Components
import { Button } from './components/ui/button';
import { Slider } from './components/ui/slider';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Agent } from './types';

export default function App() {
  const store = useStore();
  const engine = useStoryEngine();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // UI states
  const [showConfig, setShowConfig] = useState(false);
  const [showStoryboard, setShowStoryboard] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [store.storyHistory, store.isGenerating]);

  // Map genre to glow colors
  const genreColor = useMemo(() => {
    const genre = store.currentGenre.toLowerCase();
    const alpha = 0.1 + ((store.tensionLevel || 0) / 100) * 0.15; // Shift alpha based on tension
    if (genre.includes('noir')) return `rgba(239, 68, 68, ${alpha})`; // Red
    if (genre.includes('sci-fi') || genre.includes('cyberpunk')) return `rgba(6, 182, 212, ${alpha})`; // Cyan
    if (genre.includes('horror')) return `rgba(168, 85, 247, ${alpha})`; // Purple
    if (genre.includes('romance')) return `rgba(236, 72, 153, ${alpha})`; // Pink
    return `rgba(6, 182, 212, ${alpha})`;
  }, [store.currentGenre, store.tensionLevel]);

  // Dynamic pulse duration based on tension
  const pulseDuration = useMemo(() => {
    return Math.max(1, 4 - ((store.tensionLevel || 0) / 100) * 3) + 's';
  }, [store.tensionLevel]);

  return (
    <div className="flex h-screen w-full bg-[#050505] text-[#f0f0f0] font-sans overflow-hidden select-none relative">
      
      {/* Immersive Effects */}
      <div className="scanline" />
      <div className="genre-glow" style={{ '--glow-color': genreColor } as any} />

      {/* Primary Navigation Rail (Left) */}
      <div className="w-16 h-full flex flex-col items-center py-8 glass-panel border-r shrink-0 z-50">
        <div className="mb-10 text-cyan-500" style={{ animation: `pulse ${pulseDuration} cubic-bezier(0.4, 0, 0.6, 1) infinite` }}>
           <Zap className="w-6 h-6 fill-current" />
        </div>
        
        <div className="flex-1 flex flex-col gap-8">
           <button 
             onClick={() => setShowConfig(!showConfig)}
             className={`p-3 rounded-full transition-all ${showConfig ? 'bg-cyan-500 text-black shadow-[0_0_15px_#06b6d4]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
             title="Writer's Room Config"
           >
              <Terminal className="w-5 h-5" />
           </button>

           <button 
             onClick={() => setShowStoryboard(!showStoryboard)}
             className={`p-3 rounded-full transition-all ${showStoryboard ? 'bg-cyan-500 text-black shadow-[0_0_15px_#06b6d4]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
             title="Visual Storyboard"
           >
              <Clapperboard className="w-5 h-5" />
           </button>

           <div className="flex flex-col gap-4 mt-8">
              {store.allAgents.map(a => {
                const isActive = store.activeAgents.some(act => act.id === a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => store.toggleAgent(a.id)}
                    className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${isActive ? 'bg-white/5 border-white/20' : 'opacity-30 border-transparent hover:opacity-100 hover:bg-white/5'}`}
                    style={{ borderColor: isActive ? a.color : '' }}
                  >
                     <span className="text-lg">{a.avatar}</span>
                     {isActive && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#050505]" style={{ backgroundColor: a.color }} />}
                  </button>
                )
              })}
           </div>
        </div>

        <div className="flex flex-col gap-4 items-center">
           {store.isGenerating ? (
             <button onClick={engine.stop} className="p-4 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all">
                <Square className="w-5 h-5 fill-current" />
             </button>
           ) : store.currentRound < store.maxRounds ? (
             <button onClick={engine.playRound} className="p-4 rounded-full bg-cyan-500 text-black shadow-[0_0_20px_#06b6d4] hover:scale-110 active:scale-95 transition-all">
                <Play className="w-5 h-5 fill-current" />
             </button>
           ) : (
             <button onClick={() => store.reset()} className="p-4 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-all">
                <Loader2 className="w-5 h-5" />
             </button>
           )}

           <div className="mt-4 flex flex-col items-center gap-4 text-[7px] font-mono text-zinc-600 uppercase tracking-widest">
              <a href="https://harishkotra.me" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors [writing-mode:vertical-lr] rotate-180">Built By Harish Kotra</a>
              <div className="w-[1px] h-6 bg-white/5" />
              <a href="https://dailybuild.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-colors [writing-mode:vertical-lr] rotate-180">Other Builds</a>
           </div>
        </div>
      </div>

      {/* Config Drawer */}
      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-16 w-80 glass-panel z-40 p-8 flex flex-col gap-10"
          >
             <div className="flex justify-between items-center">
               <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Writer's Room</h2>
               <button onClick={() => setShowConfig(false)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
             </div>

             <div className="space-y-8">
                <div className="space-y-4">
                  <header className="flex items-center gap-2 text-[10px] uppercase font-mono text-cyan-500/80 tracking-widest leading-none">
                    <Cpu className="w-3 h-3" /> System Engine
                  </header>
                  <Select 
                    value={store.providerConfig.provider}
                    onValueChange={(v) => store.setProviderConfig({ provider: v as any })}
                    disabled={store.isGenerating || store.currentRound > 0}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-10 text-xs font-mono">
                      <SelectValue placeholder="Select Engine" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0c] border-white/10 text-zinc-300">
                       <SelectItem value="gemini">Gemini Pro</SelectItem>
                       <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                       <SelectItem value="featherless">OpenRouter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-6">
                  <header className="flex items-center gap-2 text-[10px] uppercase font-mono text-zinc-400 tracking-widest leading-none">
                    <Settings className="w-3 h-3" /> Parameters
                  </header>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-mono"><span className="text-zinc-500">CHAOS_LVL</span> <span className="text-cyan-400">{store.storyParams.chaosLevel || 0}%</span></div>
                       <Slider 
                         value={[Number(store.storyParams.chaosLevel) || 0]} 
                         onValueChange={(v) => store.setStoryParams({ chaosLevel: v[0] })}
                         className="opacity-60 hover:opacity-100 transition-opacity"
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-mono"><span className="text-zinc-500">GLOBAL_TEMP</span> <span className="text-pink-400">{(store.storyParams.globalTemperature || 0).toFixed(2)}</span></div>
                       <Slider 
                         value={[(Number(store.storyParams.globalTemperature) || 0) * 100]} 
                         onValueChange={(v) => store.setStoryParams({ globalTemperature: v[0] / 100 })}
                         max={200}
                         className="opacity-60 hover:opacity-100 transition-opacity"
                       />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <header className="flex items-center gap-2 text-[10px] uppercase font-mono text-zinc-400 tracking-widest leading-none">
                    <Fingerprint className="w-3 h-3" /> Agents
                  </header>
                  <div className="grid grid-cols-1 gap-2">
                    {store.allAgents.map(a => (
                      <div 
                        key={a.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${store.activeAgents.some(act => act.id === a.id) ? 'bg-white/5 border-white/10' : 'opacity-40 border-transparent grayscale'}`}
                        style={{ borderLeftColor: a.color, borderLeftWidth: '2px' }}
                      >
                         <div className="flex items-center gap-3">
                            <span className="text-xl">{a.avatar}</span>
                            <span className="text-xs font-bold text-zinc-200">{a.name}</span>
                         </div>
                         <button onClick={() => setEditingAgent(a)} className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-white">
                           <Settings className="w-4 h-4" />
                         </button>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Manuscript Stage */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header Stats */}
        <header className="h-16 px-12 flex items-center justify-between border-b border-white/5 z-10">
           <div className="flex items-center gap-6">
              <div className="flex flex-col">
                 <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Script Progress</span>
                 <div className="flex items-center gap-2">
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         className="h-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" 
                         initial={{ width: 0 }}
                         animate={{ width: `${((store.currentRound || 0) / (store.maxRounds || 1)) * 100}%` }}
                       />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{store.currentRound}/{store.maxRounds}</span>
                 </div>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="flex flex-col">
                 <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Active Genre</span>
                 <span className="text-xs font-bold text-cyan-400 tracking-wider">
                   {store.currentGenre !== 'UNKNOWN' ? store.currentGenre.toUpperCase() : 'PENDING_ANALYSIS'}
                 </span>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <Badge variant="outline" className={`font-mono text-[9px] uppercase tracking-widest border-white/10 ${store.isGenerating ? 'bg-cyan-500/10 text-cyan-400 animate-pulse' : 'text-zinc-600'}`}>
                {store.isGenerating ? 'System_Streaming' : 'System_Idle'}
              </Badge>
           </div>
        </header>

        {/* Content Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto cinematic-scroll scroll-smooth relative">
           <div className="max-w-3xl mx-auto py-24 px-8 pb-40">
              <AnimatePresence mode="popLayout">
                 {store.storyHistory.map((line, i) => {
                   const agent = store.allAgents.find(a => a.id === line.agentId);
                   if (line.agentId === 'director') {
                      return (
                        <motion.div 
                          key={line.id} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="my-16 flex items-center justify-center gap-4"
                        >
                           <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                           <div className="agent-badge bg-white/5 text-white/50 flex items-center gap-2">
                              <Clapperboard className="w-3 h-3" /> {line.content}
                           </div>
                           <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                        </motion.div>
                      );
                   }

                   return (
                     <motion.div 
                       key={line.id}
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ duration: 0.8, ease: 'easeOut' }}
                       className="group relative mb-12"
                     >
                        <div className="absolute -left-32 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-right">
                           <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: agent?.color }}>{agent?.name}</span>
                        </div>
                        <div className="flex items-start gap-8">
                           <div className="w-[2px] h-auto self-stretch rounded-full transition-all group-hover:w-[4px]" style={{ backgroundColor: agent?.color || '#333' }} />
                           <div className="flex-1">
                              <p className="manuscript-text group-hover:text-white transition-colors duration-500">
                                {line.content}
                                {store.isGenerating && i === store.storyHistory.length - 1 && (
                                   <motion.span 
                                     animate={{ opacity: [1, 0] }}
                                     transition={{ repeat: Infinity, duration: 0.8 }}
                                     className="inline-block w-1 h-5 bg-cyan-500 ml-2"
                                   />
                                )}
                              </p>
                           </div>
                        </div>
                     </motion.div>
                   )
                 })}
              </AnimatePresence>

              {/* End Screen / Synthesis View */}
              {store.finalSynthesis && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="mt-20 p-12 glass-panel rounded-3xl border border-white/10 relative overflow-hidden group/final"
                 >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/final:opacity-20 transition-opacity">
                       <Sparkles className="w-32 h-32 text-cyan-500" />
                    </div>

                    <div className="mb-12">
                       <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-[0.3em] block mb-2">Director's Cut</span>
                       <h1 className="text-5xl font-bold tracking-tighter text-white mb-4 uppercase">{store.finalSynthesis.title}</h1>
                       <div className="h-1 w-20 bg-cyan-500 mb-6" />
                       <p className="text-xl italic font-story text-zinc-400 opacity-80">"{store.finalSynthesis.tagline}"</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                       <div className="space-y-8">
                          {store.posterUrl ? (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative group/poster"
                            >
                               <img src={store.posterUrl} className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700" alt="Poster" referrerPolicy="no-referrer" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                               <div className="absolute bottom-4 left-4">
                                  <span className="text-[9px] font-mono uppercase tracking-widest text-white/50">Cinematic Render 1.0</span>
                               </div>
                            </motion.div>
                          ) : store.isGenerating ? (
                            <div className="aspect-[2/3] bg-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 text-zinc-600 border border-dashed border-white/10">
                               <Loader2 className="w-8 h-8 animate-spin" />
                               <span className="text-[10px] font-mono uppercase tracking-widest">Generating Visual Asset...</span>
                            </div>
                          ) : null}
                       </div>

                       <div className="space-y-8 flex flex-col justify-center">
                          <div className="space-y-4">
                             <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Synopsis</h3>
                             <p className="font-story text-zinc-300 leading-relaxed text-sm">
                               {store.finalSynthesis.synopsis}
                             </p>
                          </div>

                          <div className="space-y-4">
                             <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Characters</h3>
                             <ul className="space-y-2">
                                {store.finalSynthesis.characters?.map((c: string, j: number) => (
                                   <li key={j} className="flex gap-4 group/char">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 opacity-50 group-hover/char:opacity-100 transition-opacity" />
                                      <span className="text-xs text-zinc-400 group-hover/char:text-white transition-colors">{c}</span>
                                   </li>
                                ))}
                             </ul>
                          </div>

                          <div className="p-6 bg-pink-500/5 border border-pink-500/20 rounded-2xl">
                             <span className="text-[10px] font-mono text-pink-500 uppercase tracking-widest block mb-4">Core Subversion</span>
                             <p className="text-sm italic font-story text-pink-200/80">
                               {store.finalSynthesis.twist}
                             </p>
                          </div>

                          <Button 
                            onClick={() => {
                               const text = `# ${store.finalSynthesis.title}\n\n${store.finalSynthesis.tagline}\n\nSYNOPSIS\n${store.finalSynthesis.synopsis}\n\nTHE TWIST\n${store.finalSynthesis.twist}\n\n--- SCRIPT ---\n${store.storyHistory.map(m => m.name.toUpperCase() + ': ' + m.content).join('\n\n')}`;
                               const blob = new Blob([text], { type: 'text/markdown' });
                               const url = URL.createObjectURL(blob);
                               const a = document.createElement('a');
                               a.href = url;
                               a.download = `synthesis-${store.finalSynthesis.title}.md`;
                               a.click();
                            }}
                            className="w-full bg-white text-black hover:bg-cyan-500 hover:text-white transition-all font-bold px-8 h-12 rounded-xl"
                          >
                             Export Manuscript
                          </Button>
                       </div>
                    </div>
                 </motion.div>
              )}

              {store.storyHistory.length === 0 && !store.isGenerating && (
                 <div className="h-80 flex flex-col items-center justify-center gap-6 animate-pulse opacity-20">
                    <Clapperboard className="w-12 h-12" />
                    <p className="text-xs font-mono uppercase tracking-[0.4em]">Initialize Transmission</p>
                 </div>
              )}
           </div>
        </div>
      </div>

      {/* Visual Storyboard Sidebar (Right) */}
      <AnimatePresence>
        {showStoryboard && (
          <motion.div 
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 h-full glass-panel border-l shrink-0 flex flex-col z-30"
          >
             <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Storyboard_Progression</h2>
                <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-500">{store.storyboard.length} FRAMES</Badge>
             </div>
             
             <ScrollArea className="flex-1 p-6">
                <div className="space-y-12">
                   {store.storyboard.length === 0 && (
                     <div className="py-20 flex flex-col items-center justify-center text-center gap-4 opacity-20">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}>
                           <Sparkles className="w-8 h-8" />
                        </motion.div>
                        <p className="text-[9px] font-mono uppercase tracking-widest max-w-[150px]">Waiting for narrative milestones...</p>
                     </div>
                   )}
                   
                   {store.storyboard.map((item, idx) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group relative"
                      >
                         <div className="absolute -top-3 left-0 px-2 py-0.5 bg-cyan-500 text-black text-[8px] font-bold rounded z-10 shadow-lg">
                           FRAME_{idx + 1}
                         </div>
                         <div className="rounded-xl overflow-hidden border border-white/10 aspect-video relative group-hover:border-cyan-500/50 transition-all cursor-crosshair">
                            <img src={item.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Storyboard Scene" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-3 left-3 right-3">
                               <p className="text-[9px] text-zinc-300 font-story italic leading-tight line-clamp-2 uppercase tracking-wide group-hover:text-white">
                                  {item.description}
                                </p>
                            </div>
                         </div>
                         {idx < store.storyboard.length - 1 && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-white/10" />
                         )}
                      </motion.div>
                   ))}
                </div>
             </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Editor Tooltip/Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
         <DialogContent className="bg-[#0a0a0c] border-white/10 text-zinc-200">
           {editingAgent && (
             <>
               <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                     <span className="text-2xl">{editingAgent.avatar}</span> Configure Agent_{editingAgent.name}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 uppercase text-[10px] tracking-widest font-mono">
                     Neural Calibration Protocol
                  </DialogDescription>
               </DialogHeader>
               
               <div className="space-y-8 py-6">
                  <div className="space-y-3">
                     <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">System Personality</Label>
                     <textarea 
                       className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-story leading-relaxed focus:bg-white/10 transition-all outline-none h-32"
                       value={editingAgent.personality}
                       onChange={(e) => store.updateAgent(editingAgent.id, { personality: e.target.value })}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Precision</Label>
                       <div className="flex justify-between items-center px-4 h-11 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-[10px] font-mono text-pink-400">{(editingAgent.temperature || 0).toFixed(2)}</span>
                          <Slider 
                            value={[(Number(editingAgent.temperature) || 0) * 100]} 
                            onValueChange={(v) => store.updateAgent(editingAgent.id, { temperature: v[0] / 100 })}
                            max={200}
                            className="w-24"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Agent Identity</Label>
                       <input 
                         className="w-full bg-white/5 border border-white/10 rounded-xl h-11 px-4 text-xs font-bold"
                         value={editingAgent.name}
                         onChange={(e) => store.updateAgent(editingAgent.id, { name: e.target.value })}
                       />
                    </div>
                  </div>
               </div>

               <DialogFooter>
                  <Button onClick={() => setEditingAgent(null)} variant="outline" className="border-white/10 hover:bg-white/5 text-xs rounded-xl">
                    Finalize Patch
                  </Button>
               </DialogFooter>
             </>
           )}
         </DialogContent>
      </Dialog>
    </div>
  );
}
