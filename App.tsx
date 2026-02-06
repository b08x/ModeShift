import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DomainVariables, StepId, ChatMessage } from './types';
import { INITIAL_VARIABLES, PROMPT_TEMPLATE } from './constants';
import { brainstormVariables, chatWithExpert, extractLinguisticPatterns } from './services/geminiService';

// --- Atomic Components ---

const Badge: React.FC<{ text: string }> = ({ text }) => (
  <span className="mono text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 whitespace-nowrap inline-block uppercase tracking-wider">
    {text || '[EMPTY]'}
  </span>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`glass-card rounded-xl overflow-hidden transition-all duration-300 ${className}`}>
    {title && (
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">{title}</h3>
      </div>
    )}
    <div className="p-6">
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
      <label className="block text-[10px] uppercase font-semibold text-zinc-500 mb-2 tracking-widest">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none custom-scroll"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
        />
      )}
    </div>
  );
};

// --- Professional Navigation ---

const Sidebar: React.FC<{ current: StepId; onClick: (s: StepId) => void }> = ({ current, onClick }) => {
  const steps: { id: StepId; icon: React.ReactNode; label: string }[] = [
    { id: 'identity', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, label: 'Identity' },
    { id: 'context', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>, label: 'Context' },
    { id: 'scenarios', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>, label: 'Logic' },
    { id: 'preview', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>, label: 'Code' },
    { id: 'sandbox', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, label: 'Live' },
  ];

  return (
    <nav className="flex lg:flex-col items-center justify-between lg:justify-start lg:py-8 lg:gap-2 bg-zinc-950 border-t lg:border-t-0 lg:border-r border-zinc-800 w-full lg:w-20 xl:w-64 h-20 lg:h-full z-40 fixed lg:static bottom-0 left-0">
      <div className="hidden lg:flex items-center gap-3 px-6 mb-10 w-full">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <span className="font-black text-white text-lg">M</span>
        </div>
        <span className="font-bold text-sm tracking-tighter xl:block hidden">MODESHIFT <span className="text-zinc-500 font-normal">v4.2</span></span>
      </div>

      <div className="flex flex-row lg:flex-col w-full px-2 lg:px-3 gap-1">
        {steps.map((step) => {
          const isActive = current === step.id;
          return (
            <button
              key={step.id}
              onClick={() => onClick(step.id)}
              className={`relative flex items-center justify-center xl:justify-start gap-4 p-3 rounded-lg transition-all duration-200 flex-1 lg:flex-none ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
              <span className="shrink-0">{step.icon}</span>
              <span className="text-xs tracking-wide xl:block hidden uppercase font-medium">{step.label}</span>
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
    <div className="h-screen flex flex-col lg:flex-row bg-zinc-950 text-white overflow-hidden font-sans">
      <Sidebar current={activeStep} onClick={setActiveStep} />

      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950/20 pb-24 lg:pb-0 overflow-hidden relative">
        <header className="px-8 h-20 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">{activeStep}</h1>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-[10px] mono text-zinc-500 uppercase tracking-widest hidden sm:block">Expert Configuration Protocol</span>
          </div>

          <div className="flex items-center gap-2">
            {['PROMPT', 'JSON', 'YAML', 'XML'].map((label) => (
              <button 
                key={label}
                id={`export-${label.toLowerCase()}`}
                onClick={() => exportAction(label.toLowerCase() as any)}
                className="text-[9px] mono font-bold border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all uppercase tracking-widest active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 custom-scroll">
          <div className="max-w-4xl mx-auto">
            {activeStep === 'identity' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card title="Expert Ingestion">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="text" 
                        placeholder="Define role, domain, or core topic..." 
                        className="flex-1 bg-zinc-900/50 border border-zinc-800 p-4 text-sm rounded-lg outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                        value={brainstormInput}
                        onChange={(e) => setBrainstormInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                      />
                      <button 
                        onClick={handleBrainstorm}
                        disabled={isBrainstorming}
                        className="bg-indigo-600 text-white px-8 py-4 text-xs font-bold rounded-lg uppercase transition-all hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {isBrainstorming ? 'Processing...' : 'Auto-Generate'}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'general')} className="hidden" />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] font-semibold text-zinc-400 border border-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-900 transition-all flex items-center gap-2 uppercase tracking-wider"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        {uploadedFile ? uploadedFile.name : 'Ingest Document'}
                      </button>
                    </div>
                  </div>
                </Card>

                <div className="flex gap-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-xl w-fit">
                  <button onClick={() => setIdentityTab('core')} className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${identityTab === 'core' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Core Profile</button>
                  <button onClick={() => setIdentityTab('patterns')} className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${identityTab === 'patterns' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Linguistic Style</button>
                </div>

                {identityTab === 'core' ? (
                  <Card title="Primary Identity Matrix">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField label="Title / Role" value={vars.roleTitle} onChange={(v) => updateVar('roleTitle', v)} />
                      <FormField label="Domain Specialization" value={vars.domainArea} onChange={(v) => updateVar('domainArea', v)} />
                      <FormField label="Operational Mission" type="textarea" value={vars.primaryResponsibilities} onChange={(v) => updateVar('primaryResponsibilities', v)} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Core Systems" value={vars.keySystems} onChange={(v) => updateVar('keySystems', v)} />
                        <FormField label="Task Vectors" value={vars.commonTaskTypes} onChange={(v) => updateVar('commonTaskTypes', v)} />
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <Card title="Linguistic Feature Extraction">
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input 
                            type="text" 
                            placeholder="Describe target tone or sample context..." 
                            className="flex-1 bg-zinc-900/50 border border-zinc-800 p-4 text-sm rounded-lg outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                            value={speechSampleText}
                            onChange={(e) => setSpeechSampleText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSpeechAnalysis()}
                          />
                          <button onClick={handleSpeechAnalysis} disabled={isAnalyzingSpeech} className="bg-indigo-600 text-white px-8 py-4 text-xs font-bold rounded-lg uppercase hover:bg-indigo-500 disabled:opacity-50">
                            {isAnalyzingSpeech ? 'Analyzing...' : 'Extract Style'}
                          </button>
                        </div>
                        <input type="file" ref={speechFileInputRef} onChange={(e) => handleFileChange(e, 'speech')} className="hidden" />
                        <button onClick={() => speechFileInputRef.current?.click()} className="text-[10px] font-semibold text-zinc-400 border border-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-900 flex items-center gap-2 uppercase tracking-wider">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                          {speechFile ? speechFile.name : 'Upload Style Sample'}
                        </button>
                      </div>
                    </Card>
                    <Card title="Syntactic Signature">
                      <FormField label="Speech Patterns" type="textarea" value={vars.speakingPatterns} onChange={(v) => updateVar('speakingPatterns', v)} placeholder="Stylistic markers extracted from source..." />
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeStep === 'context' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card title="Linguistic Environment">
                  <FormField label="Formal Protocols" value={vars.formalContexts} onChange={(v) => updateVar('formalContexts', v)} />
                  <FormField label="Technical Depth" value={vars.technicalContexts} onChange={(v) => updateVar('technicalContexts', v)} />
                  <FormField label="Formality Constraints" value={vars.formalityExceptions} onChange={(v) => updateVar('formalityExceptions', v)} />
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card title="Professional Tier">
                    <FormField label="Seniority Level" value={vars.expertiseLevel} onChange={(v) => updateVar('expertiseLevel', v)} />
                  </Card>
                  <Card title="Persona Signature">
                    <FormField label="Tenure Trait" value={vars.experienceCharacteristic} onChange={(v) => updateVar('experienceCharacteristic', v)} />
                  </Card>
                </div>
              </div>
            )}

            {activeStep === 'scenarios' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card title="State Management: Critical Response">
                  <FormField label="Incident Vector" value={vars.highUrgencyScenario} onChange={(v) => updateVar('highUrgencyScenario', v)} />
                  <FormField label="Response Protocol" type="textarea" value={vars.crisisResponseStyle} onChange={(v) => updateVar('crisisResponseStyle', v)} />
                </Card>
                <Card title="State Management: Education">
                  <FormField label="Mentorship Context" value={vars.learningScenario} onChange={(v) => updateVar('learningScenario', v)} />
                  <FormField label="Transfer Style" type="textarea" value={vars.mentoringStyle} onChange={(v) => updateVar('mentoringStyle', v)} />
                </Card>
              </div>
            )}

            {activeStep === 'preview' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full">
                <Card className="h-full min-h-[600px] flex flex-col">
                  <div className="flex-1 mono text-xs text-zinc-400 bg-zinc-950 p-8 rounded-lg border border-zinc-800 overflow-y-auto custom-scroll leading-relaxed whitespace-pre-wrap">
                    {finalPrompt.split('\n').map((line, i) => <div key={i} className="mb-1">{line || <br/>}</div>)}
                  </div>
                </Card>
              </div>
            )}

            {activeStep === 'sandbox' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col min-h-[600px]">
                <Card className="flex-1 flex flex-col overflow-hidden">
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scroll pb-6">
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                        <div className="w-12 h-12 border border-zinc-800 rounded-full mb-4 flex items-center justify-center animate-glow">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-medium">Awaiting Initial Transmission</p>
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-xl text-sm max-w-[85%] border shadow-sm ${
                          m.role === 'user' ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30' : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                          <span className="text-[10px] mono uppercase text-zinc-500 font-bold">Synthesizing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-6 border-t border-zinc-800">
                    <input 
                      type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Input operational command..."
                      className="flex-1 bg-zinc-950/50 border border-zinc-800 p-4 text-sm rounded-xl focus:border-indigo-500 outline-none transition-all"
                    />
                    <button onClick={handleSendMessage} disabled={isChatting || !userInput.trim()} className="w-14 h-14 bg-indigo-600 text-white flex items-center justify-center rounded-xl hover:bg-indigo-500 disabled:opacity-20 active:scale-95 transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="hidden lg:flex w-72 xl:w-80 border-l border-zinc-800 flex-col bg-zinc-950 p-8">
        <div className="mb-10">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Active Parameters
          </h4>
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg">
              <span className="block text-[8px] text-zinc-600 uppercase tracking-widest mb-2 font-bold">Expert Designation</span>
              <Badge text={vars.roleTitle} />
            </div>
            <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg">
              <span className="block text-[8px] text-zinc-600 uppercase tracking-widest mb-2 font-bold">Core Domain</span>
              <Badge text={vars.domainArea} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Architecture Trace</h4>
          <div className="flex-1 bg-zinc-950 border border-zinc-800 p-4 rounded-lg overflow-y-auto custom-scroll">
            <div className="mono text-[10px] text-zinc-600 leading-relaxed">
              {finalPrompt.slice(0, 1000)}...
            </div>
          </div>
        </div>
      </aside>

      <footer className="fixed bottom-0 left-0 right-0 h-12 px-8 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex justify-between items-center z-50 text-[10px] mono text-zinc-500">
        <div className="flex items-center gap-6">
          <span className="uppercase tracking-widest font-bold">MS_ARCH_SYSTEM</span>
          <div className="h-3 w-px bg-zinc-800" />
          <span className="hidden sm:inline">PROTOCOL: ALPHA_STABLE</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500/80 animate-glow" />
          <span className="uppercase tracking-widest font-bold text-zinc-400">Environment Ready</span>
        </div>
      </footer>
    </div>
  );
}
