
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DomainVariables, StepId, ChatMessage } from './types';
import { INITIAL_VARIABLES, PROMPT_TEMPLATE } from './constants';
import { brainstormVariables, chatWithExpert } from './services/geminiService';

// --- Atomic Components ---

const HighlightLabel: React.FC<{ text: string }> = ({ text }) => (
  <span className="handwritten text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded-sm border-b-2 border-orange-500/30 whitespace-nowrap">
    {text || '[UNDEFINED]'}
  </span>
);

const SketchedCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`sketch-border bg-zinc-950/40 p-5 mb-6 relative group hover:border-white/30 transition-all ${className}`}>
    {title && (
      <div className="absolute -top-3 left-4 bg-zinc-950 px-2 handwritten text-xs text-orange-500 uppercase tracking-widest border border-white/10">
        {title}
      </div>
    )}
    {children}
  </div>
);

const SketchedInput: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea';
}> = ({ label, value, onChange, placeholder, type = 'text' }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="mb-4">
      <label className="block mono text-[9px] uppercase font-bold text-zinc-500 mb-1 tracking-tighter">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={2}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-zinc-900/50 p-2.5 text-xs text-zinc-200 outline-none transition-all ${
            isFocused ? 'sketch-border-active' : 'sketch-border'
          }`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-zinc-900/50 p-2.5 text-xs text-zinc-200 outline-none transition-all ${
            isFocused ? 'sketch-border-active' : 'sketch-border'
          }`}
        />
      )}
    </div>
  );
};

// --- Step Navigator (Column 1) ---

const Navigator: React.FC<{ current: StepId; onClick: (s: StepId) => void }> = ({ current, onClick }) => {
  const steps: { id: StepId; icon: string }[] = [
    { id: 'identity', icon: '1' },
    { id: 'context', icon: '2' },
    { id: 'scenarios', icon: '3' },
    { id: 'preview', icon: '4' },
    { id: 'sandbox', icon: '5' },
  ];

  return (
    <div className="w-20 h-full border-r border-white/5 flex flex-col items-center py-8 gap-10 bg-black/20">
      {steps.map((step) => {
        const isActive = current === step.id;
        return (
          <button
            key={step.id}
            onClick={() => onClick(step.id)}
            className="group relative flex flex-col items-center"
          >
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center handwritten text-lg transition-all ${
              isActive 
                ? 'bg-orange-500 border-orange-400 text-black scale-110 shadow-[0_0_20px_#f9731644]' 
                : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
            }`}>
              {step.icon}
            </div>
            <div className={`absolute top-1/2 left-14 -translate-y-1/2 bg-zinc-900 px-3 py-1 text-[8px] uppercase mono tracking-widest border border-white/10 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none`}>
              {step.id}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// --- Main View ---

export default function App() {
  const [vars, setVars] = useState<DomainVariables>(INITIAL_VARIABLES);
  const [activeStep, setActiveStep] = useState<StepId>('identity');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [brainstormInput, setBrainstormInput] = useState('');
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatting]);

  const updateVar = useCallback((name: keyof DomainVariables, val: string) => {
    setVars(prev => ({ ...prev, [name]: val }));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedFile({
          name: file.name,
          data: base64String,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrainstorm = async () => {
    if (!brainstormInput.trim() && !uploadedFile) return;
    setIsBrainstorming(true);
    const suggested = await brainstormVariables(brainstormInput, uploadedFile || undefined);
    setVars(prev => ({ ...prev, ...suggested }));
    setIsBrainstorming(false);
  };

  const finalPrompt = useMemo(() => PROMPT_TEMPLATE(vars), [vars]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isChatting) return;
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsChatting(true);
    
    try {
      const response = await chatWithExpert(finalPrompt, newMessages);
      setMessages([...newMessages, { role: 'model', text: response || 'No response.' }]);
    } catch (e) {
      setMessages([...newMessages, { role: 'model', text: 'ERROR: CONNECTION_TIMEOUT. RESTARTING_CHAMBER.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalPrompt);
    alert('BLUEPRINT_COPIED');
  };

  return (
    <div className="h-screen flex overflow-hidden">
      
      {/* Column 1: Navigator */}
      <Navigator current={activeStep} onClick={setActiveStep} />

      {/* Column 2: Form Canvas */}
      <main className="flex-1 flex flex-col bg-black/10 overflow-hidden">
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-950/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-orange-500 rounded-sm flex items-center justify-center rotate-3">
              <span className="text-orange-500 font-black text-2xl handwritten">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-zinc-100">
                MODE<span className="text-orange-500 handwritten ml-1">SHIFT</span>
              </h1>
              <div className="mono text-[8px] text-zinc-500 uppercase tracking-widest flex gap-2">
                <span>Core_Arch_v2.5</span>
                <span className="text-orange-500/50">●</span>
                <span>Active_Session</span>
              </div>
            </div>
          </div>
          <button onClick={copyToClipboard} className="text-[10px] mono border border-orange-500/30 text-orange-500 px-4 py-2 hover:bg-orange-500/10 transition-all uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(249,115,22,0.1)] active:shadow-none translate-y-[-2px] active:translate-y-[0px]">
            Export_Blueprint
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scroll">
          <div className="max-w-xl mx-auto space-y-6">
            
            {activeStep === 'identity' && (
              <div className="animate-in fade-in duration-500">
                <SketchedCard title="Module: Lightning_Brainstorm">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Input Domain/Role..." 
                        className="flex-1 bg-zinc-900/50 border border-zinc-800 p-2.5 text-xs text-zinc-300 outline-none focus:border-orange-500 transition-all"
                        value={brainstormInput}
                        onChange={(e) => setBrainstormInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                      />
                      <button 
                        onClick={handleBrainstorm}
                        disabled={isBrainstorming}
                        className="bg-orange-600 text-black px-4 py-1 text-xs font-bold uppercase transition-all hover:bg-orange-500 disabled:opacity-50"
                      >
                        {isBrainstorming ? '...' : 'Sketch'}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.txt"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] mono text-zinc-500 border border-zinc-800 px-3 py-1.5 hover:text-zinc-300 hover:border-zinc-700 flex items-center gap-2 uppercase tracking-widest"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.415a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {uploadedFile ? uploadedFile.name : 'Upload Document'}
                      </button>
                      {uploadedFile && (
                        <button 
                          onClick={() => setUploadedFile(null)}
                          className="text-[8px] text-red-500/50 hover:text-red-500 uppercase mono"
                        >
                          [CLEAR]
                        </button>
                      )}
                    </div>
                  </div>
                </SketchedCard>

                <SketchedCard title="Module: Core_Identity">
                  <SketchedInput label="Role Title" value={vars.roleTitle} onChange={(v) => updateVar('roleTitle', v)} placeholder="e.g. Lead Systems Engineer" />
                  <SketchedInput label="Domain Area" value={vars.domainArea} onChange={(v) => updateVar('domainArea', v)} placeholder="e.g. Distributed Infrastructure" />
                  <SketchedInput label="Primary Responsibilities" type="textarea" value={vars.primaryResponsibilities} onChange={(v) => updateVar('primaryResponsibilities', v)} />
                  <div className="grid grid-cols-2 gap-4">
                    <SketchedInput label="Key Systems" value={vars.keySystems} onChange={(v) => updateVar('keySystems', v)} />
                    <SketchedInput label="Task Types" value={vars.commonTaskTypes} onChange={(v) => updateVar('commonTaskTypes', v)} />
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'context' && (
              <div className="animate-in fade-in duration-500">
                <SketchedCard title="Module: Communication_Layers">
                  <SketchedInput label="Formal Contexts" value={vars.formalContexts} onChange={(v) => updateVar('formalContexts', v)} />
                  <SketchedInput label="Technical Contexts" value={vars.technicalContexts} onChange={(v) => updateVar('technicalContexts', v)} />
                  <SketchedInput label="Formality Exceptions" value={vars.formalityExceptions} onChange={(v) => updateVar('formalityExceptions', v)} />
                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                    <SketchedInput label="Level" value={vars.expertiseLevel} onChange={(v) => updateVar('expertiseLevel', v)} />
                    <SketchedInput label="Characteristic" value={vars.experienceCharacteristic} onChange={(v) => updateVar('experienceCharacteristic', v)} />
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'scenarios' && (
              <div className="animate-in fade-in duration-500 space-y-6">
                <SketchedCard title="Module: Stance_Logic">
                  <div className="space-y-6">
                    <div>
                      <h4 className="handwritten text-orange-500 text-xs mb-2">/URGENT_STATE</h4>
                      <SketchedInput label="Scenario" value={vars.highUrgencyScenario} onChange={(v) => updateVar('highUrgencyScenario', v)} />
                      <SketchedInput label="Style" type="textarea" value={vars.crisisResponseStyle} onChange={(v) => updateVar('crisisResponseStyle', v)} />
                    </div>
                    <div className="border-t border-white/5 pt-4">
                      <h4 className="handwritten text-orange-500 text-xs mb-2">/LEARNING_STATE</h4>
                      <SketchedInput label="Scenario" value={vars.learningScenario} onChange={(v) => updateVar('learningScenario', v)} />
                      <SketchedInput label="Style" type="textarea" value={vars.mentoringStyle} onChange={(v) => updateVar('mentoringStyle', v)} />
                    </div>
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'preview' && (
              <div className="animate-in fade-in duration-500 h-full flex flex-col">
                <SketchedCard title="Module: Source_Code" className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto mono text-[10px] text-zinc-400 p-4 bg-black/40 border border-white/5 whitespace-pre-wrap leading-relaxed custom-scroll">
                    {finalPrompt}
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'sandbox' && (
              <div className="animate-in fade-in duration-500 h-full flex flex-col">
                <SketchedCard title="Module: Test_Chamber" className="flex-1 flex flex-col min-h-[500px] overflow-hidden">
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scroll scroll-smooth">
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-2">
                        <div className="w-12 h-12 border border-dashed border-zinc-500 rounded-full animate-spin-slow"></div>
                        <p className="text-[10px] mono">NO_SIGNAL_DETECTED. INITIATE_CONTACT.</p>
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 max-w-[85%] border transition-all ${
                          m.role === 'user' 
                            ? 'bg-orange-600/5 text-orange-500 border-orange-500/40' 
                            : 'bg-zinc-900/80 text-zinc-300 border-zinc-700'
                        } sketch-border`}>
                          <p className="text-xs leading-relaxed">{m.text}</p>
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-900 border-zinc-800 p-2 text-zinc-500 italic text-[9px] mono animate-pulse">
                          STREAMING_CORE_DATA...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-white/5">
                    <input 
                      type="text" 
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Input Vector..."
                      className="flex-1 bg-zinc-950/80 border border-zinc-800 p-2.5 text-xs text-zinc-200 sketch-border outline-none focus:border-orange-500"
                    />
                    <button 
                      onClick={handleSendMessage} 
                      disabled={isChatting || !userInput.trim()}
                      className="w-10 h-10 bg-orange-600 text-black flex items-center justify-center transition-all hover:bg-orange-500 disabled:opacity-20 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </button>
                  </div>
                </SketchedCard>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Column 3: Blueprint Preview */}
      <aside className="hidden lg:flex w-[350px] xl:w-[420px] border-l border-white/5 flex-col bg-zinc-950 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          <div className="text-[7px] text-zinc-800 font-bold uppercase rotate-90 origin-bottom-right tracking-widest opacity-40">System_Blueprint_Engine_v4</div>
        </div>

        <div className="mb-8 flex-shrink-0">
          <h4 className="text-[10px] mono font-bold text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            LIVE_VARIABLE_INJECTION
          </h4>
          <div className="space-y-4">
            <div className="p-3 bg-black/40 border border-zinc-800 rounded-sm relative">
              <span className="absolute -top-1.5 left-2 bg-zinc-950 px-1 text-[7px] text-zinc-500 mono">@PROMPT_ROLE</span>
              <HighlightLabel text={vars.roleTitle} />
            </div>
            <div className="p-3 bg-black/40 border border-zinc-800 rounded-sm relative">
              <span className="absolute -top-1.5 left-2 bg-zinc-950 px-1 text-[7px] text-zinc-500 mono">@PROMPT_DOMAIN</span>
              <HighlightLabel text={vars.domainArea} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <h4 className="text-[10px] mono font-bold text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
            BLUEPRINT_SOURCE
          </h4>
          <div className="flex-1 bg-zinc-900/30 border border-zinc-800/60 p-5 rounded-xl relative overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scroll mono text-[9px] leading-relaxed text-zinc-500 pr-1">
              {finalPrompt.split('\n').map((line, i) => (
                <div key={i} className="mb-1">
                  {line.includes(vars.roleTitle) && vars.roleTitle ? (
                    line.split(vars.roleTitle).map((seg, j, arr) => (
                      <React.Fragment key={j}>
                        {seg}
                        {j < arr.length - 1 && <HighlightLabel text={vars.roleTitle} />}
                      </React.Fragment>
                    ))
                  ) : line.includes(vars.domainArea) && vars.domainArea ? (
                    line.split(vars.domainArea).map((seg, j, arr) => (
                      <React.Fragment key={j}>
                        {seg}
                        {j < arr.length - 1 && <HighlightLabel text={vars.domainArea} />}
                      </React.Fragment>
                    ))
                  ) : (
                    line
                  )}
                </div>
              ))}
            </div>
            
            {/* Visual Trace SVG */}
            <svg className="absolute inset-0 pointer-events-none opacity-5">
              <path d="M 0 100 Q 150 120 300 110" stroke="#f97316" strokeWidth="1" fill="none" className="animate-flow" />
              <path d="M 0 350 Q 150 330 300 340" stroke="#f97316" strokeWidth="1" fill="none" className="animate-flow" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Sketchy Global Footer */}
      <footer className="fixed bottom-0 left-0 right-0 px-6 py-2 border-t border-white/5 bg-zinc-950/80 backdrop-blur-sm flex justify-between items-center z-50">
        <div className="handwritten text-[10px] text-zinc-600 tracking-wider">MODESHIFT_ALPHA // BUILD_2025 // NO_REPRODUCTION</div>
        <div className="flex gap-8 mono text-[9px] text-zinc-800 uppercase">
          <span className={vars.roleTitle ? 'text-orange-500/60' : ''}>VAR_ROLE: {vars.roleTitle ? 'OK' : 'NULL'}</span>
          <span className={vars.domainArea ? 'text-orange-500/60' : ''}>VAR_DOMAIN: {vars.domainArea ? 'OK' : 'NULL'}</span>
        </div>
        <div className="mono text-[9px] text-zinc-600 animate-pulse uppercase tracking-widest">Efficiency_Protocol_Active</div>
      </footer>
    </div>
  );
}
