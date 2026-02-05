import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DomainVariables, StepId, ChatMessage } from './types';
import { INITIAL_VARIABLES, PROMPT_TEMPLATE } from './constants';
import { brainstormVariables, chatWithExpert } from './services/geminiService';

// --- Atomic Components ---

const HighlightLabel: React.FC<{ text: string }> = ({ text }) => (
  <span className="handwritten text-orange-400 bg-orange-400/10 px-2 py-1 rounded-sm border-b-2 border-orange-400/50 whitespace-nowrap inline-block text-sm">
    {text || '[UNDEFINED]'}
  </span>
);

const SketchedCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`sketch-border bg-zinc-900/60 p-6 md:p-8 mb-8 relative group transition-all duration-500 hover:bg-zinc-900/80 shadow-2xl ${className}`}>
    {title && (
      <div className="absolute -top-4 left-6 bg-orange-500 px-3 py-1 handwritten text-xs text-black font-bold uppercase tracking-widest z-10 shadow-lg">
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
    <div className="mb-6">
      <label className="block mono text-[10px] uppercase font-black text-zinc-400 mb-2 tracking-widest">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-black/50 p-4 text-sm font-medium text-white outline-none transition-all duration-300 custom-scroll border-2 border-transparent ${
            isFocused ? 'sketch-border-active' : 'sketch-border border-zinc-800'
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
          className={`w-full bg-black/50 p-4 text-sm font-medium text-white outline-none transition-all duration-300 border-2 border-transparent ${
            isFocused ? 'sketch-border-active' : 'sketch-border border-zinc-800'
          }`}
        />
      )}
    </div>
  );
};

// --- Responsive Navigator ---

const Navigator: React.FC<{ current: StepId; onClick: (s: StepId) => void }> = ({ current, onClick }) => {
  const steps: { id: StepId; icon: string; label: string }[] = [
    { id: 'identity', icon: '01', label: 'Identity' },
    { id: 'context', icon: '02', label: 'Context' },
    { id: 'scenarios', icon: '03', label: 'Logic' },
    { id: 'preview', icon: '04', label: 'Code' },
    { id: 'sandbox', icon: '05', label: 'Live' },
  ];

  return (
    <nav className="flex lg:flex-col items-center justify-around lg:justify-start lg:py-12 lg:gap-12 bg-zinc-950/50 border-t lg:border-t-0 lg:border-r-2 border-white/10 w-full lg:w-28 h-24 lg:h-full z-40 fixed lg:static bottom-0 left-0 backdrop-blur-md">
      {steps.map((step) => {
        const isActive = current === step.id;
        return (
          <button
            key={step.id}
            onClick={() => onClick(step.id)}
            className="group relative flex flex-col items-center flex-1 lg:flex-none"
          >
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center handwritten text-lg font-bold transition-all duration-500 ${
              isActive 
                ? 'bg-orange-500 border-orange-300 text-black scale-125 shadow-[0_0_30px_rgba(249,115,22,0.6)]' 
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-400 hover:text-zinc-200'
            }`}>
              {step.icon}
            </div>
            <span className={`text-[10px] mono mt-3 uppercase tracking-widest lg:hidden font-black ${isActive ? 'text-orange-400 text-shadow-vivid' : 'text-zinc-600'}`}>
              {step.label}
            </span>
            <div className={`hidden lg:block absolute top-1/2 left-20 -translate-y-1/2 bg-orange-500 text-black font-black px-4 py-1.5 text-[10px] uppercase mono tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none translate-x-[-15px] group-hover:translate-x-0 shadow-2xl`}>
              {step.label}
            </div>
          </button>
        );
      })}
    </nav>
  );
};

// --- Main Application ---

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
    try {
      const suggested = await brainstormVariables(brainstormInput, uploadedFile || undefined);
      setVars(prev => ({ ...prev, ...suggested }));
    } catch (e) {
      console.error("Brainstorm failed", e);
    } finally {
      setIsBrainstorming(false);
    }
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
      setMessages([...newMessages, { role: 'model', text: 'SYSTEM ERROR: NEURAL DISCONNECT. REINITIALIZING...' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalPrompt);
    const btn = document.getElementById('copy-btn');
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = 'CODE_SYNCED_√';
      btn.classList.add('bg-green-600', 'text-white', 'border-green-500');
      setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-green-600', 'text-white', 'border-green-500');
      }, 2500);
    }
  };

  const renderPreview = () => {
    return finalPrompt.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      
      let elements: React.ReactNode[] = [line];
      
      const checkVars: (keyof DomainVariables)[] = ['roleTitle', 'domainArea', 'expertiseLevel'];
      checkVars.forEach(vKey => {
        const val = vars[vKey];
        if (val && line.includes(val)) {
          const parts = line.split(val);
          const newElements: React.ReactNode[] = [];
          parts.forEach((p, idx) => {
            newElements.push(p);
            if (idx < parts.length - 1) {
              newElements.push(<HighlightLabel key={`${i}-${idx}`} text={val} />);
            }
          });
          elements = newElements;
        }
      });

      return <div key={i} className="mb-2">{elements}</div>;
    });
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* Column 1: Navigator */}
      <Navigator current={activeStep} onClick={setActiveStep} />

      {/* Column 2: Content Canvas */}
      <main className="flex-1 flex flex-col min-w-0 bg-black/40 pb-24 lg:pb-0 overflow-hidden relative">
        <div className="absolute inset-0 blueprint-dots opacity-20 pointer-events-none"></div>
        
        <header className="px-8 py-7 border-b-2 border-white/5 flex justify-between items-center bg-zinc-950/95 backdrop-blur-2xl z-30 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 border-4 border-orange-500 rounded-sm flex items-center justify-center rotate-6 flex-shrink-0 transition-all hover:rotate-0 hover:scale-110 duration-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              <span className="text-orange-500 font-black text-3xl handwritten">M</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tightest truncate leading-none mb-1 text-white">
                MODE<span className="text-orange-500 handwritten ml-1 text-3xl">SHIFT</span>
              </h1>
              <div className="mono text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black flex items-center gap-3">
                <span className="hidden sm:inline bg-zinc-900 px-2 py-0.5 rounded">ARCH_V4.2</span>
                <span className="text-orange-500/40">●</span>
                <span className="truncate">NEURAL_DOMAIN_ENGINE</span>
              </div>
            </div>
          </div>
          <button 
            id="copy-btn"
            onClick={copyToClipboard} 
            className="text-[12px] mono font-black border-2 border-orange-500/30 text-orange-500 px-8 py-3.5 hover:bg-orange-500 hover:text-black hover:border-orange-400 transition-all uppercase tracking-widest active:scale-95 shadow-xl flex-shrink-0"
          >
            Export_Source_Code
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 custom-scroll relative z-10">
          <div className="max-w-3xl mx-auto">
            
            {activeStep === 'identity' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <SketchedCard title="Module: Neural_Extraction">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                        type="text" 
                        placeholder="Define Expert Domain, Role, or Context..." 
                        className="flex-1 bg-black/70 border-2 border-zinc-800 p-5 text-sm font-bold text-white outline-none focus:border-orange-500 transition-all placeholder:text-zinc-600"
                        value={brainstormInput}
                        onChange={(e) => setBrainstormInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                      />
                      <button 
                        onClick={handleBrainstorm}
                        disabled={isBrainstorming}
                        className="bg-orange-500 text-black px-10 py-5 text-xs font-black uppercase transition-all hover:bg-orange-400 disabled:opacity-50 flex-shrink-0 active:scale-90 shadow-2xl shadow-orange-950/40"
                      >
                        {isBrainstorming ? 'CALCULATING...' : 'AI_GENERATE_BLUEPRINT'}
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-5 pt-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.txt"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] mono font-black text-zinc-300 border-2 border-dashed border-zinc-700 px-6 py-3.5 hover:text-orange-400 hover:border-orange-600 flex items-center gap-4 uppercase tracking-[0.2em] transition-all bg-zinc-900/40"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {uploadedFile ? uploadedFile.name : 'INGEST_EXPERT_DOCS'}
                      </button>
                      {uploadedFile && (
                        <button 
                          onClick={() => setUploadedFile(null)}
                          className="text-[10px] text-zinc-500 hover:text-red-500 uppercase mono font-black border-b border-zinc-800"
                        >
                          [PURGE_DATA]
                        </button>
                      )}
                    </div>
                  </div>
                </SketchedCard>

                <SketchedCard title="Module: Identity_Logic">
                  <div className="grid grid-cols-1 gap-4">
                    <SketchedInput label="Designated Expert Title" value={vars.roleTitle} onChange={(v) => updateVar('roleTitle', v)} placeholder="e.g. Lead DevSecOps Architect" />
                    <SketchedInput label="High-Resolution Domain" value={vars.domainArea} onChange={(v) => updateVar('domainArea', v)} placeholder="e.g. Scalable Infrastructure & Network Hardening" />
                    <SketchedInput label="Operational Mission" type="textarea" value={vars.primaryResponsibilities} onChange={(v) => updateVar('primaryResponsibilities', v)} placeholder="Describe the expert's primary goals..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <SketchedInput label="Core Technologies" value={vars.keySystems} onChange={(v) => updateVar('keySystems', v)} placeholder="Terraform, Kubernetes, GCP..." />
                    <SketchedInput label="Primary Task Vectors" value={vars.commonTaskTypes} onChange={(v) => updateVar('commonTaskTypes', v)} placeholder="Troubleshooting, Design, Compliance..." />
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'context' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <SketchedCard title="Module: Syntactic_Calibration">
                  <div className="grid grid-cols-1 gap-4">
                    <SketchedInput label="Formal Protocol Contexts" value={vars.formalContexts} onChange={(v) => updateVar('formalContexts', v)} />
                    <SketchedInput label="High-Complexity Technical Contexts" value={vars.technicalContexts} onChange={(v) => updateVar('technicalContexts', v)} />
                    <SketchedInput label="Linguistic Constraints (Formal-Only)" value={vars.formalityExceptions} onChange={(v) => updateVar('formalityExceptions', v)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t-2 border-white/5 pt-10 mt-6">
                    <SketchedInput label="Neural_Seniority_Level" value={vars.expertiseLevel} onChange={(v) => updateVar('expertiseLevel', v)} />
                    <SketchedInput label="Persona_Core_Signature" value={vars.experienceCharacteristic} onChange={(v) => updateVar('experienceCharacteristic', v)} />
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'scenarios' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-12">
                <SketchedCard title="Module: Behavioral_Synthesis">
                  <div className="space-y-12">
                    <div>
                      <h4 className="handwritten text-orange-500 text-sm font-bold mb-5 tracking-[0.2em] uppercase text-shadow-vivid">State: CRITICAL_URGENCY</h4>
                      <SketchedInput label="Incident Scenario" value={vars.highUrgencyScenario} onChange={(v) => updateVar('highUrgencyScenario', v)} />
                      <SketchedInput label="Persona Response Logic" type="textarea" value={vars.crisisResponseStyle} onChange={(v) => updateVar('crisisResponseStyle', v)} />
                    </div>
                    <div className="border-t-2 border-white/5 pt-12">
                      <h4 className="handwritten text-orange-500 text-sm font-bold mb-5 tracking-[0.2em] uppercase text-shadow-vivid">State: KNOWLEDGE_INHERITANCE</h4>
                      <SketchedInput label="Educational Scenario" value={vars.learningScenario} onChange={(v) => updateVar('learningScenario', v)} />
                      <SketchedInput label="Mentorship Delivery Style" type="textarea" value={vars.mentoringStyle} onChange={(v) => updateVar('mentoringStyle', v)} />
                    </div>
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'preview' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 h-full flex flex-col">
                <SketchedCard title="Module: System_Source_Buffer" className="flex-1 flex flex-col min-h-[600px]">
                  <div className="flex-1 overflow-y-auto mono text-[11px] sm:text-[13px] text-zinc-100 p-8 bg-black/80 sketch-border border-white/10 whitespace-pre-wrap font-medium leading-relaxed custom-scroll selection:bg-orange-500/30">
                    {renderPreview()}
                  </div>
                </SketchedCard>
              </div>
            )}

            {activeStep === 'sandbox' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 h-full flex flex-col overflow-hidden min-h-[600px]">
                <SketchedCard title="Module: LIVE_EMULATION_UNIT" className="flex-1 flex flex-col overflow-hidden">
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-8 mb-6 pr-4 custom-scroll scroll-smooth">
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-40 italic space-y-6">
                        <div className="w-20 h-20 border-4 border-dashed border-orange-500/60 rounded-full glow-pulse-intense"></div>
                        <p className="text-[12px] mono tracking-[0.5em] font-black uppercase text-center text-orange-400">Core_Neural_Link: IDLE<br/>Awaiting_Command_Packet</p>
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-5 max-w-[94%] sm:max-w-[85%] border-2 transition-all duration-500 shadow-xl ${
                          m.role === 'user' 
                            ? 'bg-orange-600/10 text-orange-300 border-orange-500/40' 
                            : 'bg-zinc-800/60 text-white border-zinc-700'
                        } sketch-border`}>
                          <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="bg-orange-600 text-black border-2 border-orange-400 p-4 text-[10px] mono font-black animate-pulse sketch-border shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                          COMPUTING_RESPONSE_MATRIX...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 pt-8 border-t-2 border-white/5 flex-shrink-0">
                    <input 
                      type="text" 
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Input Operational Query..."
                      className="flex-1 bg-black/70 border-2 border-zinc-800 p-5 text-sm font-bold text-white sketch-border outline-none focus:border-orange-500 transition-all placeholder:text-zinc-700"
                    />
                    <button 
                      onClick={handleSendMessage} 
                      disabled={isChatting || !userInput.trim()}
                      className="w-16 h-16 bg-orange-500 text-black flex items-center justify-center transition-all hover:bg-orange-400 hover:scale-105 disabled:opacity-20 flex-shrink-0 active:scale-90 shadow-2xl shadow-orange-950/40"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </button>
                  </div>
                </SketchedCard>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Column 3: Blueprint Preview - Desktop Only */}
      <aside className="hidden lg:flex w-[420px] xl:w-[520px] border-l-2 border-white/10 flex-col bg-zinc-950 p-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 pointer-events-none">
          <div className="text-[8px] text-zinc-800 font-black uppercase rotate-90 origin-bottom-right tracking-[1em] opacity-40">SYSTEM_ARCH_X_PRO</div>
        </div>

        <div className="mb-14 flex-shrink-0">
          <h4 className="text-[11px] mono font-black text-zinc-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-4">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_15px_#f97316]"></span>
            LIVE_VARIABLE_INJECT
          </h4>
          <div className="space-y-6">
            <div className="p-5 bg-zinc-900/60 border-2 border-white/5 sketch-border relative transition-all duration-500 hover:border-orange-500/40 hover:bg-zinc-900">
              <span className="absolute -top-2.5 left-4 bg-zinc-950 px-2 text-[8px] text-orange-500 mono font-black uppercase tracking-[0.2em]">@active_role</span>
              <HighlightLabel text={vars.roleTitle} />
            </div>
            <div className="p-5 bg-zinc-900/60 border-2 border-white/5 sketch-border relative transition-all duration-500 hover:border-orange-500/40 hover:bg-zinc-900">
              <span className="absolute -top-2.5 left-4 bg-zinc-950 px-2 text-[8px] text-orange-500 mono font-black uppercase tracking-[0.2em]">@active_domain</span>
              <HighlightLabel text={vars.domainArea} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <h4 className="text-[11px] mono font-black text-zinc-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800"></span>
            BLUEPRINT_CORE_TRACE
          </h4>
          <div className="flex-1 bg-zinc-900/20 border-2 border-white/5 p-8 rounded-3xl relative overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scroll mono text-[11px] leading-relaxed text-zinc-400 font-bold pr-4 scroll-smooth">
              {renderPreview()}
            </div>
            
            {/* Architectural Trace Decorations */}
            <svg className="absolute inset-0 pointer-events-none opacity-[0.08]">
              <path d="M 0 80 Q 200 110 400 90" stroke="#f97316" strokeWidth="2" fill="none" className="animate-draw" />
              <path d="M 0 450 Q 250 420 500 440" stroke="#f97316" strokeWidth="1.5" fill="none" className="animate-draw" />
              <path d="M 150 0 Q 180 300 160 600" stroke="#f97316" strokeWidth="0.8" fill="none" />
              <circle cx="160" cy="100" r="4" fill="#f97316" className="glow-pulse-intense" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Global Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-12 px-8 border-t-2 border-white/10 bg-zinc-950/98 backdrop-blur-3xl flex justify-between items-center z-50 text-[10px] mono text-zinc-600 font-black">
        <div className="handwritten tracking-[0.3em] opacity-70 flex items-center gap-6">
          <span className="text-orange-500/80">MODE_SHIFT_X_ULTIMATE</span>
          <span className="lg:inline hidden border-l-2 border-zinc-800 pl-6">PROTOCOL_V5_STABLE</span>
        </div>
        <div className="hidden md:flex gap-12 uppercase">
          <span className={`transition-all duration-500 ${vars.roleTitle ? 'text-orange-500 text-shadow-vivid' : ''}`}>VAR_ID: {vars.roleTitle ? 'LOCKED_OK' : 'NULL'}</span>
          <span className={`transition-all duration-500 ${vars.domainArea ? 'text-orange-500 text-shadow-vivid' : ''}`}>VAR_DOMAIN: {vars.domainArea ? 'LOCKED_OK' : 'NULL'}</span>
        </div>
        <div className="flex items-center gap-3">
           <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_#f97316]"></span>
           <span className="uppercase tracking-[0.4em] text-orange-400/80">NEURAL_STREAM_ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}
