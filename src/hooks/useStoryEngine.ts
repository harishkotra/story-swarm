import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { Agent, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useStoryEngine = () => {
  const { 
    providerConfig, 
    activeAgents, 
    maxRounds, 
    storyParams, 
    storyHistory, 
    appendMessage, 
    setIsGenerating,
    currentRound,
    nextRound,
    setFinalSynthesis
  } = useStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateAgentResponse = async (agent: Agent, history: ChatMessage[]) => {
      const msgId = uuidv4();
      
      const { currentGenre } = useStore.getState();
      const systemPrompt = `You are ${agent.name}. 
Personality: ${agent.personality}
Style: ${agent.style}

STRICT RESPONSE RULES:
- Produce ONLY one short sentence OR two tiny phrases.
- NEVER exceed 15 words.
- NEVER explain yourself.
- NEVER output paragraphs or bullet points.
- ALWAYS stay in character.
- The story chaos level is ${storyParams.chaosLevel}/100.
${storyParams.chaosLevel > 70 ? 'EMBRACE PURE CHAOS. MAKE IT WEIRD.' : ''}
${currentGenre !== 'UNKNOWN' ? `- The emerging narrative genre is currently detected as: "${currentGenre}". You may lean into this genre or violently subvert it.` : ''}

Read the story so far and add your exact short continuation.`;

      const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              provider: agent.provider || providerConfig.provider,
              model: agent.model || providerConfig.model,
              systemPrompt,
              messages: history.map(h => ({ role: h.role, content: h.content })),
              temperature: (agent.temperature ?? storyParams.globalTemperature) + (storyParams.chaosLevel / 100) * 0.5 // scale temp slightly with chaos
          }),
          signal: abortControllerRef.current?.signal
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      // Initialize message
      appendMessage({
          id: msgId,
          role: 'assistant',
          content: '',
          agentId: agent.id,
          name: agent.name
      });

      while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
              const chunkLines = decoder.decode(value).split('\n\n');
              for (const line of chunkLines) {
                 if (line.startsWith('data: ')) {
                     try {
                         const data = JSON.parse(line.slice(6));
                         if (data.type === 'chunk') {
                             text += data.content;
                             appendMessage({
                                 id: msgId,
                                 role: 'assistant',
                                 content: text,
                                 agentId: agent.id,
                                 name: agent.name
                             });
                         } else if (data.type === 'error') {
                             console.error("Stream error", data.error);
                         }
                     } catch(e) {}
                 }
              }
          }
      }
      
      return { role: 'user', content: text } as ChatMessage; // to feed to next agent, we treat previous agent as user context
  };

  const lastDetectionRoundRef = useRef<number>(-1);

  const detectGenre = async (fullStory: string) => {
      const currentRoundNum = useStore.getState().currentRound;
      
      // OPTIMIZATION: Only detect every 2 rounds and only if story is long enough
      const isStart = lastDetectionRoundRef.current === -1;
      const isSignificantProgression = currentRoundNum - lastDetectionRoundRef.current >= 2;
      const isLongEnough = fullStory.length > 300;

      if (!isStart && !isSignificantProgression) return;
      if (!isLongEnough && !isStart) return;

      try {
          lastDetectionRoundRef.current = currentRoundNum;
          const response = await fetch('/api/detect-genre', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storyText: fullStory.slice(-2000) }) // Only send recent context for detection
          });
          const data = await response.json();
          if (data.genre) {
              useStore.getState().setCurrentGenre(data.genre);
          }
          if (data.tension !== undefined) {
              useStore.getState().setTensionLevel(data.tension);
          }
      } catch (e) {
          console.error("Genre detection failed", e);
      }
  };

  const generateDirectorSynthesis = async (fullStory: string) => {
      const msgId = uuidv4();
      const systemPrompt = `You are the Director Agent.
Your job is to synthesize the chaotic story into a cohesive Hollywood pitch.
You MUST output raw JSON (no markdown block, just the json object).
Keys required:
{
  "title": "Movie Title",
  "genre": "Main Genre",
  "synopsis": "1 paragraph summary of the madness",
  "characters": ["Char 1 description", "Char 2 description"],
  "twist": "The twist ending",
  "tagline": "Movie Tagline"
}`;

      appendMessage({
          id: msgId,
          role: 'assistant',
          content: 'Synthesizing final pitch...',
          agentId: 'director',
          name: 'The Director'
      });

      const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              provider: providerConfig.provider,
              model: providerConfig.model,
              systemPrompt,
              messages: [{ role: 'user', content: `Here is the full story:\n\n${fullStory}` }],
              temperature: 0.7
          }),
          signal: abortControllerRef.current?.signal
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
              const chunkLines = decoder.decode(value).split('\n\n');
              for (const line of chunkLines) {
                 if (line.startsWith('data: ')) {
                     try {
                         const data = JSON.parse(line.slice(6));
                         if (data.type === 'chunk') {
                             text += data.content;
                         }
                     } catch(e) {}
                 }
              }
          }
      }
      
      try {
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          setFinalSynthesis(parsed);
          appendMessage({
            id: msgId,
            role: 'assistant',
            content: 'Pitch complete. Generating poster...',
            agentId: 'director',
            name: 'The Director'
          });

          // Generate poster
          try {
             const posterRes = await fetch('/api/generate-poster', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(parsed)
             });
             const posterData = await posterRes.json();
             if (posterData.imageUrl) {
                 useStore.getState().setPosterUrl(posterData.imageUrl);
                 appendMessage({
                   id: uuidv4(),
                   role: 'assistant',
                   content: 'Poster generation complete.',
                   agentId: 'director',
                   name: 'The Director'
                 });
             } else {
                 throw new Error(posterData.error || "No image url");
             }
          } catch(e) {
             console.error("Poster gen failed", e);
             appendMessage({
               id: uuidv4(),
               role: 'assistant',
               content: 'Could not generate poster (requires OpenAI API key).',
               agentId: 'director',
               name: 'The Director'
             });
          }
      } catch(e) {
          console.error("Failed to parse director json", text);
          appendMessage({
            id: msgId,
            role: 'assistant',
            content: 'Failed to synthesize. The chaos was too strong.',
            agentId: 'director',
            name: 'The Director'
          });
      }
  };

  const injectDirectorCommentary = async (storyText: string) => {
    const msgId = uuidv4();
    const systemPrompt = `You are a Cinematic Director observing a live writer's room. 
Your job is to provide a single, cryptic, ultra-short meta-commentary (max 6 words) about the current state of the story.
Examples: 
- "The shadows are lengthening."
- "The atmosphere turns electric."
- "Logic begins to fracture."
- "A pulse of pure ego."

Output ONLY the commentary text.`;

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            provider: providerConfig.provider,
            model: providerConfig.model,
            systemPrompt,
            messages: [{ role: 'user', content: storyText.slice(-1000) }],
            temperature: 0.9,
            stream: false // Non-streaming for meta-commentary to keep it fast
        }),
        signal: abortControllerRef.current?.signal
    });

    const data = await response.json();
    if (data.content) {
        appendMessage({
            id: msgId,
            role: 'assistant',
            content: data.content.toUpperCase(),
            agentId: 'director',
            name: 'DIRECTOR_OBSERVATION'
        });
    }
  };

  const generateStoryboardScene = async (recentStory: string) => {
    try {
        const { currentGenre } = useStore.getState();
        const systemPrompt = `You are a Visual Concept Artist.
Review the recent story dialogue and describe a SINGLE, VIVID CINEMATIC IMAGE that captures the essence of the scene.
Focus on lighting, character positions, and atmosphere.
Output ONLY the image description (max 20 words).`;

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: providerConfig.provider,
                model: providerConfig.model,
                systemPrompt,
                messages: [{ role: 'user', content: recentStory }],
                temperature: 0.8,
                stream: false
            }),
            signal: abortControllerRef.current?.signal
        });

        const data = await response.json();
        if (data.content) {
            const description = data.content;
            const res = await fetch('/api/generate-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, genre: currentGenre })
            });
            const imgData = await res.json();
            if (imgData.imageUrl) {
                useStore.getState().addStoryboardItem({
                    id: uuidv4(),
                    round: useStore.getState().currentRound,
                    description,
                    imageUrl: imgData.imageUrl
                });
            }
        }
    } catch(e) {
        console.error("Storyboard gen failed", e);
    }
  };

  const playRound = async () => {
     if (activeAgents.length === 0) return;
     
     setIsGenerating(true);
     abortControllerRef.current = new AbortController();

     try {
         const currentContext = useStore.getState().storyHistory;
         let contextForModel: ChatMessage[] = currentContext.map(m => ({ 
             id: uuidv4(), 
             role: 'user' as const, 
             content: `${m.name}: ${m.content}` 
         }));
         
         if (currentContext.length === 0) {
             contextForModel = [{ id: uuidv4(), role: 'user', content: "The story begins now." }];
         }

         for (const agent of activeAgents) {
             if (abortControllerRef.current.signal.aborted) throw new Error("Aborted");

             const newContext = await generateAgentResponse(agent, contextForModel);
             contextForModel.push({ id: uuidv4(), role: 'user', content: `${agent.name}: ${newContext.content}` });
             
             await new Promise(res => setTimeout(res, 800));
         }

         nextRound();
         
         const fullHistory = useStore.getState().storyHistory;
         const currentFullStory = fullHistory.map(m => `${m.name}: ${m.content}`).join('\n');
         
         if (fullHistory.length > 0) {
             detectGenre(currentFullStory);
             // 30% chance for director commentary in single round mode after the first round
             if (Math.random() > 0.7 && currentRound > 0) {
               await injectDirectorCommentary(currentFullStory);
             }

             // Trigger storyboard every 2 rounds
             if (useStore.getState().currentRound % 2 === 0 && useStore.getState().currentRound > 0) {
               generateStoryboardScene(currentFullStory.slice(-1000)); // fire and forget
             }
         }
         
         if (useStore.getState().currentRound >= maxRounds) {
             await generateDirectorSynthesis(currentFullStory);
             setIsGenerating(false);
         } else {
             setIsGenerating(false);
         }
     } catch (err: any) {
         if (err.name === 'AbortError' || err.message === "Aborted" || err.message?.includes("BodyStreamBuffer was aborted")) {
             // User triggered stop, safely ignore
         } else {
             console.error("Story engine error:", err);
         }
         setIsGenerating(false);
     }
  };

  const playAll = async () => {
    setIsGenerating(true);
    // we manage the loop here
    abortControllerRef.current = new AbortController();
    
    try {
        let roundsToPlay = maxRounds - useStore.getState().currentRound;
        for (let i = 0; i < roundsToPlay; i++) {
            if (abortControllerRef.current.signal.aborted) break;
            
            const currentContext = useStore.getState().storyHistory;
            let contextForModel: ChatMessage[] = currentContext.map(m => ({ 
                id: uuidv4(), 
                role: 'user' as const, 
                content: `${m.name}: ${m.content}` 
            }));
            
            if (currentContext.length === 0) {
                contextForModel = [{ id: uuidv4(), role: 'user', content: "The story begins now." }];
            }

            for (const agent of activeAgents) {
                if (abortControllerRef.current.signal.aborted) break;
                const newContext = await generateAgentResponse(agent, contextForModel);
                contextForModel.push({ id: uuidv4(), role: 'user', content: `${agent.name}: ${newContext.content}` });
                await new Promise(res => setTimeout(res, 800));
            }
            nextRound();
            
            const currentFullStory = useStore.getState().storyHistory.map(m => `${m.name}: ${m.content}`).join('\n');
            await detectGenre(currentFullStory); // Don't block, fire and forget

            if (Math.random() > 0.6 && useStore.getState().currentRound < maxRounds) {
                await injectDirectorCommentary(currentFullStory);
            }

            // Trigger storyboard every 2 rounds
            if (useStore.getState().currentRound % 2 === 0 && useStore.getState().currentRound > 0) {
               generateStoryboardScene(currentFullStory.slice(-1000)); // fire and forget
            }
            
            await new Promise(res => setTimeout(res, 1000));
        }

        if (!abortControllerRef.current.signal.aborted) {
            const fullStory = useStore.getState().storyHistory.map(m => `${m.name}: ${m.content}`).join('\n');
            await generateDirectorSynthesis(fullStory);
        }
    } catch(err: any) {
        if (err.name === 'AbortError' || err.message === "Aborted" || err.message?.includes("BodyStreamBuffer was aborted")) {
            // safely ignore
        } else {
            console.error("Play all error", err);
        }
    } finally {
        setIsGenerating(false);
    }
  }

  const stop = () => {
     abortControllerRef.current?.abort();
     setIsGenerating(false);
  };

  return { playRound, playAll, stop };
};
