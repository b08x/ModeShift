
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DomainVariables, StepId, ChatMessage } from './types';
import { INITIAL_VARIABLES, PROMPT_TEMPLATE } from './constants';
import { brainstormVariables, chatWithExpert, extractLinguisticPatterns } from './services/geminiService';

// --- Atomic Components ---

const Badge: React.FC<{ text: string }> = ({ text }) => (
  <span className="mono text-[10px] bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded border border-orange-500/20 whitespace-nowrap inline-block uppercase font-bold tracking-wider">
    {text || '[EMPTY]'}
  </span>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; bodyClassName?: string }> = ({ children, className = '', title, bodyClassName = '' }) => (
  <div className={`panel-surface rounded-xl transition-all duration-500 flex flex-col ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">{title}</h3>
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
      </div>
    )}
    <div className={`flex-1 min-h-0 ${bodyClassName || 'p-6'}`}>
      {children}
    </div>
  </div>
);

const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea';
}> = ({ label, value, onChange, placeholder, type = 'text' }) => {
  return (
    <div className="mb-6 last:mb-0">
      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full input-recessed rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 resize-none custom-scroll"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full input-recessed rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500"
        />
      )}
    </div>
  );
};

// --- Professional Navigation ---

const Sidebar: React.FC<{ current: StepId; onClick: (s: StepId) => void }> = ({ current, onClick }) => {
  const steps: { id: StepId; icon: React.ReactNode; label: string }[] = [
    { id: 'identity', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, label: 'Identity' },
    { id: 'context', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>, label: 'Context' },
    { id: 'scenarios', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>, label: 'Logic' },
    { id: 'preview', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>, label: 'Code' },
    { id: 'sandbox', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, label: 'Live' },
  ];

  return (
    <nav className="flex lg:flex-col items-center justify-between lg:justify-start lg:py-8 lg:gap-2 bg-black/40 border-t lg:border-t-0 lg:border-r border-white/5 w-full lg:w-20 xl:w-64 h-20 lg:h-full z-40 fixed lg:static bottom-0 left-0 backdrop-blur-3xl">
      <div className="hidden lg:flex items-center gap-4 px-6 mb-12 w-full">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
          <span className="font-black text-black text-xl">M</span>
        </div>
        <div className="xl:block hidden">
          <h2 className="font-bold text-sm tracking-tighter text-zinc-100">MODESHIFT</h2>
          <p className="text-[9px] mono text-orange-500/60 font-bold uppercase tracking-[0.2em]">Architect v4.2</p>
        </div>
      </div>

      <div className="flex flex-row lg:flex-col w-full px-3 lg:px-4 gap-2">
        {steps.map((step) => {
          const isActive = current === step.id;
          return (
            <button
              key={step.id}
              onClick={() => onClick(step.id)}
              className={`relative flex items-center justify-center xl:justify-start gap-4 p-3.5 rounded-xl transition-all duration-300 flex-1 lg:flex-none group ${
                isActive 
                  ? 'bg-orange-500/10 text-orange-500 font-bold' 
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full shadow-[2px_0_12px_rgba(249,115,22,0.6)]" />}
              <span className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                {step.icon}
              </span>
              <span className="text-[11px] tracking-[0.15em] xl:block hidden uppercase font-bold">{step.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// --- Main Application ---

export default function App() {
  const [vars, setVars] = useState<DomainVariables>(INITIAL_VARIABLES);
  const [activeStep, setActiveStep] = useState<StepId>('identity');
  const [identityTab, setIdentityTab] = useState<'core' | 'patterns'>('core');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const [brainstormInput, setBrainstormInput] = useState('');
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);
  
  const [isAnalyzingSpeech, setIsAnalyzingSpeech] = useState(false);
  const [speechSampleText, setSpeechSampleText] = useState('');
  const [speechFile, setSpeechFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatting]);

  const updateVar = useCallback((name: keyof DomainVariables, val: string) => {
    setVars(prev => ({ ...prev, [name]: val }));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'general' | 'speech') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const fileData = { name: file.name, data: base64String, mimeType: file.type };
        if (type === 'general') setUploadedFile(fileData);
        else setSpeechFile(fileData);
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

  const handleSpeechAnalysis = async () => {
    if (!speechSampleText.trim() && !speechFile) return;
    setIsAnalyzingSpeech(true);
    try {
      const patternSummary = await extractLinguisticPatterns(speechSampleText, speechFile || undefined);
      updateVar('speakingPatterns', patternSummary);
    } catch (e) {
      console.error("Speech analysis failed", e);
    } finally {
      setIsAnalyzingSpeech(false);
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
      setMessages([...newMessages, { role: 'model', text: 'CONNECTION_ERROR: Failed to reach expert node.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const toYAML = (obj: any) => Object.entries(obj).map(([k, v]) => `${k}: "${String(v).replace(/\n/g, '\\n')}"`).join('\n');
  const toXML = (obj: any) => `<Blueprint>\n${Object.entries(obj).map(([k, v]) => `  <${k}>${String(v)}</${k}>`).join('\n')}\n</Blueprint>`;

  const exportAction = (type: 'raw' | 'yaml' | 'json' | 'xml') => {
    let content = '';
    let btnId = `export-${type}`;
    if (type === 'raw') content = finalPrompt;
    else if (type === 'yaml') content = toYAML(vars);
    else if (type === 'json') content = JSON.stringify(vars, null, 2);
    else if (type === 'xml') content = toXML(vars);

    navigator.clipboard.writeText(content);
    const btn = document.getElementById(btnId);
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = 'COPIED';
      btn.classList.add('bg-green-600', 'text-white', 'border-green-600');
      setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-green-600', 'text-white', 'border-green-600');
      }, 1500);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-app text-zinc-100 overflow-hidden font-sans">
      <Sidebar current={activeStep} onClick={setActiveStep} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 lg:flex-row overflow-hidden">
          <main className="flex-1 flex flex-col min-w-0 bg-app overflow-hidden relative">
            <header className="px-8 h-20 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-xl z-30 shrink-0">
              <div className="flex items-center gap-4">
                <h1 className="text-sm font-black tracking-[0.2em] text-zinc-100 uppercase">{activeStep}</h1>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-[10px] mono text-zinc-500 uppercase tracking-[0.3em] hidden sm:block font-bold">Expert Protocol Engine</span>
              </div>

              <div className="flex items-center gap-2">
                {['PROMPT', 'JSON', 'YAML', 'XML'].map((label) => (
                  <button 
                    key={label}
                    id={`export-${label.toLowerCase()}`}
                    onClick={() => exportAction(label.toLowerCase() as any)}
                    className="text-[9px] mono font-bold border border-white/10 text-zinc-500 px-4 py-2 rounded-lg hover:bg-white/5 hover:text-orange-500 transition-all uppercase tracking-[0.2em] active:scale-95"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
              <div className={`flex-1 flex flex-col min-h-0 ${['sandbox', 'preview'].includes(activeStep) ? 'overflow-hidden' : 'overflow-y-auto'} px-4 sm:px-8 lg:px-12 py-6 sm:py-10 custom-scroll scroll-smooth`}>
                <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
                  {activeStep === 'identity' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <Card title="Expert Role Ingestion">
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                              type="text" 
                              placeholder="Describe role, technical domain, or core topic..." 
                              className="flex-1 input-recessed p-4 text-sm rounded-xl outline-none"
                              value={brainstormInput}
                              onChange={(e) => setBrainstormInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                            />
                            <button 
                              onClick={handleBrainstorm}
                              disabled={isBrainstorming}
                              className="bg-orange-600 text-white px-8 py-4 text-[10px] font-black rounded-xl uppercase transition-all hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 active:scale-95 tracking-widest"
                            >
                              {isBrainstorming ? 'Analyzing...' : 'Auto-Generate'}
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'general')} className="hidden" />
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[10px] font-bold text-zinc-500 border border-white/10 px-5 py-3 rounded-xl hover:bg-white/5 transition-all flex items-center gap-2 uppercase tracking-widest"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              {uploadedFile ? uploadedFile.name : 'Ingest Documentation'}
                            </button>
                          </div>
                        </div>
                      </Card>

                      <div className="flex gap-2 p-1.5 bg-black/20 border border-white/5 rounded-2xl w-fit">
                        <button onClick={() => setIdentityTab('core')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${identityTab === 'core' ? 'bg-white/10 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}>Core Profile</button>
                        <button onClick={() => setIdentityTab('patterns')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${identityTab === 'patterns' ? 'bg-white/10 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}>Linguistic Style</button>
                      </div>

                      {identityTab === 'core' ? (
                        <Card title="Expert Identity Matrix">
                          <div className="grid grid-cols-1 gap-2">
                            <FormField label="Designated Title" value={vars.roleTitle} onChange={(v) => updateVar('roleTitle', v)} />
                            <FormField label="Core Specialization" value={vars.domainArea} onChange={(v) => updateVar('domainArea', v)} />
                            <FormField label="Operational Mission" type="textarea" value={vars.primaryResponsibilities} onChange={(v) => updateVar('primaryResponsibilities', v)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                              <FormField label="Infrastructure / Systems" value={vars.keySystems} onChange={(v) => updateVar('keySystems', v)} />
                              <FormField label="Primary Task Vectors" value={vars.commonTaskTypes} onChange={(v) => updateVar('commonTaskTypes', v)} />
                            </div>
                          </div>
                        </Card>
                      ) : (
                        <div className="space-y-8">
                          <Card title="Neural Linguistic Extraction">
                            <div className="space-y-6">
                              <div className="flex flex-col sm:flex-row gap-3">
                                <input 
                                  type="text" 
                                  placeholder="Describe target voice or attach sample context..." 
                                  className="flex-1 input-recessed p-4 text-sm rounded-xl outline-none"
                                  value={speechSampleText}
                                  onChange={(e) => setSpeechSampleText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSpeechAnalysis()}
                                />
                                <button onClick={handleSpeechAnalysis} disabled={isAnalyzingSpeech} className="bg-orange-600 text-white px-8 py-4 text-[10px] font-black rounded-xl uppercase hover:bg-orange-500 disabled:opacity-50">
                                  {isAnalyzingSpeech ? 'Analyzing...' : 'Extract Voice'}
                                </button>
                              </div>
                              <input type="file" ref={speechFileInputRef} onChange={(e) => handleFileChange(e, 'speech')} className="hidden" />
                              <button onClick={() => speechFileInputRef.current?.click()} className="text-[10px] font-bold text-zinc-500 border border-white/10 px-5 py-3 rounded-xl hover:bg-white/5 flex items-center gap-2 uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                {speechFile ? speechFile.name : 'Upload Style Samples'}
                              </button>
                            </div>
                          </Card>
                          <Card title="Syntactic Logic Signature">
                            <FormField label="Speech Patterns" type="textarea" value={vars.speakingPatterns} onChange={(v) => updateVar('speakingPatterns', v)} placeholder="Stylistic linguistic markers extracted from samples..." />
                          </Card>
                        </div>
                      )}
                    </div>
                  )}

                  {activeStep === 'context' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <Card title="Situational Calibration">
                        <FormField label="Formal Protocols" value={vars.formalContexts} onChange={(v) => updateVar('formalContexts', v)} />
                        <FormField label="Advanced Technical Context" value={vars.technicalContexts} onChange={(v) => updateVar('technicalContexts', v)} />
                        <FormField label="Exceptions / Constraints" value={vars.formalityExceptions} onChange={(v) => updateVar('formalityExceptions', v)} />
                      </Card>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card title="Expert Tier">
                          <FormField label="Seniority Level" value={vars.expertiseLevel} onChange={(v) => updateVar('expertiseLevel', v)} />
                        </Card>
                        <Card title="Experience Signature">
                          <FormField label="Experience Characteristic" value={vars.experienceCharacteristic} onChange={(v) => updateVar('experienceCharacteristic', v)} />
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeStep === 'scenarios' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <Card title="Operational Logic: Urgency">
                        <FormField label="Critical Incident Vector" value={vars.highUrgencyScenario} onChange={(v) => updateVar('highUrgencyScenario', v)} />
                        <FormField label="Crisis Response Protocol" type="textarea" value={vars.crisisResponseStyle} onChange={(v) => updateVar('crisisResponseStyle', v)} />
                      </Card>
                      <Card title="Operational Logic: Mentorship">
                        <FormField label="Instructional Context" value={vars.learningScenario} onChange={(v) => updateVar('learningScenario', v)} />
                        <FormField label="Educational Transfer Style" type="textarea" value={vars.mentoringStyle} onChange={(v) => updateVar('mentoringStyle', v)} />
                      </Card>
                    </div>
                  )}

                  {activeStep === 'preview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
                      <Card className="flex-1 flex flex-col min-h-0" bodyClassName="flex-1 flex flex-col min-h-0 p-0">
                        <div className="flex-1 mono text-[11px] text-zinc-400 bg-black/40 p-6 sm:p-10 rounded-b-xl border-t border-white/5 overflow-y-auto custom-scroll leading-[1.8] whitespace-pre-wrap selection:bg-orange-500/20">
                          {finalPrompt.split('\n').map((line, i) => <div key={i} className="mb-1">{line || <br/>}</div>)}
                        </div>
                      </Card>
                    </div>
                  )}

                  {activeStep === 'sandbox' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col min-h-0">
                      <Card className="flex-1 flex flex-col min-h-0" bodyClassName="flex-1 flex flex-col min-h-0 min-w-0">
                        <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scroll pb-6 scroll-smooth min-h-0">
                          {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-700 mt-20 opacity-40">
                              <div className="w-16 h-16 border border-white/5 rounded-2xl mb-8 flex items-center justify-center animate-pulse">
                                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                              </div>
                              <p className="text-[10px] uppercase tracking-[0.6em] font-black underline underline-offset-[12px] decoration-white/5">Neural Sandbox Initialization Required</p>
                            </div>
                          )}
                          {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-5 rounded-2xl text-sm max-w-[90%] sm:max-w-[75%] border transition-all duration-300 leading-relaxed ${
                                m.role === 'user' 
                                  ? 'bg-orange-600/5 text-orange-200 border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.05)]' 
                                  : 'bg-white/5 text-zinc-100 border-white/5'
                              }`}>
                                {m.text}
                              </div>
                            </div>
                          ))}
                          {isChatting && (
                            <div className="flex justify-start">
                              <div className="bg-white/5 border border-white/5 px-5 py-3 rounded-2xl flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                                <span className="text-[9px] mono uppercase text-orange-500/80 font-black tracking-[0.25em]">Synthesizing Response...</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-4 pt-8 border-t border-white/5 mt-auto shrink-0">
                          <input 
                            type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Enter command or operational query..."
                            className="flex-1 input-recessed p-5 text-sm rounded-2xl outline-none placeholder:text-zinc-700"
                          />
                          <button onClick={handleSendMessage} disabled={isChatting || !userInput.trim()} className="w-16 h-16 bg-orange-600 text-white flex items-center justify-center rounded-2xl hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] disabled:opacity-10 active:scale-95 transition-all outline-none">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          </button>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          <aside className="hidden lg:flex w-72 xl:w-96 border-l border-white/5 flex-col bg-black/20 p-10 backdrop-blur-3xl shrink-0">
            <div className="mb-12 shrink-0">
              <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-status shadow-[0_0_8px_rgba(234,88,12,0.5)]" />
                Live Parameters
              </h4>
              <div className="space-y-6">
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                  <span className="block text-[9px] text-zinc-600 uppercase tracking-[0.3em] mb-4 font-black">Expert Node</span>
                  <Badge text={vars.roleTitle} />
                </div>
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                  <span className="block text-[9px] text-zinc-600 uppercase tracking-[0.3em] mb-4 font-black">Target Domain</span>
                  <Badge text={vars.domainArea} />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-6">Architecture Trace</h4>
              <div className="flex-1 bg-black/40 border border-white/5 p-6 rounded-2xl overflow-y-auto custom-scroll">
                <div className="mono text-[10px] text-zinc-500 leading-relaxed font-medium">
                  {finalPrompt.slice(0, 2000)}...
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="h-14 px-10 border-t border-white/5 bg-black/40 backdrop-blur-3xl flex justify-between items-center z-50 text-[10px] mono text-zinc-600 font-bold shrink-0">
          <div className="flex items-center gap-8">
            <span className="uppercase tracking-[0.5em] text-zinc-500 text-[9px]">ModeShift_Engine_v4.2</span>
            <div className="h-4 w-px bg-white/10" />
            <span className="hidden sm:inline tracking-[0.3em] text-zinc-700">ENCLAVE: STABLE_ALPHA</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-600/80 animate-status shadow-[0_0_8px_rgba(234,88,12,0.3)]" />
            <span className="uppercase tracking-[0.35em] text-zinc-500">System Functional</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
