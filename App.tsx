
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DomainVariables, StepId, ChatMessage } from './types';
import { INITIAL_VARIABLES, PROMPT_TEMPLATE } from './constants';
import { brainstormVariables, chatWithExpert, extractLinguisticPatterns } from './services/geminiService';

// --- Atomic Components ---

const Badge: React.FC<{ text: string }> = ({ text }) => (
  <span className="mono text-[10px] bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded border border-sky-500/20 whitespace-nowrap inline-block uppercase font-bold tracking-wider">
    {text || '[EMPTY]'}
  </span>
);

const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`panel-surface rounded-xl transition-all duration-300 ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">{title}</h3>
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
    <nav className="flex lg:flex-col items-center justify-between lg:justify-start lg:py-8 lg:gap-2 bg-slate-800/50 border-t lg:border-t-0 lg:border-r border-slate-700 w-full lg:w-20 xl:w-64 h-20 lg:h-full z-40 fixed lg:static bottom-0 left-0 backdrop-blur-xl">
      <div className="hidden lg:flex items-center gap-3 px-6 mb-12 w-full">
        <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
          <span className="font-black text-white text-xl">M</span>
        </div>
        <div className="xl:block hidden">
          <h2 className="font-bold text-sm tracking-tighter text-slate-100">MODESHIFT</h2>
          <p className="text-[9px] mono text-slate-500 font-bold uppercase tracking-widest">Architect v4.2</p>
        </div>
      </div>

      <div className="flex flex-row lg:flex-col w-full px-3 lg:px-4 gap-2">
        {steps.map((step) => {
          const isActive = current === step.id;
          return (
            <button
              key={step.id}
              onClick={() => onClick(step.id)}
              className={`relative flex items-center justify-center xl:justify-start gap-4 p-3.5 rounded-xl transition-all duration-200 flex-1 lg:flex-none ${
                isActive 
                  ? 'bg-sky-500/10 text-sky-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-sky-500 rounded-r-full shadow-[2px_0_8px_rgba(14,165,233,0.4)]" />}
              <span className="shrink-0">{step.icon}</span>
              <span className="text-xs tracking-wide xl:block hidden uppercase font-bold">{step.label}</span>
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
    <div className="h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Sidebar current={activeStep} onClick={setActiveStep} />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-900/40 pb-24 lg:pb-0 overflow-hidden relative">
        <header className="px-8 h-20 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black tracking-tight text-white uppercase">{activeStep}</h1>
            <div className="h-5 w-px bg-slate-700" />
            <span className="text-[10px] mono text-slate-400 uppercase tracking-widest hidden sm:block font-bold">Expert Protocol Engine</span>
          </div>

          <div className="flex items-center gap-2">
            {['PROMPT', 'JSON', 'YAML', 'XML'].map((label) => (
              <button 
                key={label}
                id={`export-${label.toLowerCase()}`}
                onClick={() => exportAction(label.toLowerCase() as any)}
                className="text-[10px] mono font-bold border border-slate-700 text-slate-400 px-4 py-1.5 rounded-lg hover:bg-slate-700 hover:text-white transition-all uppercase tracking-widest active:scale-95"
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
                <Card title="Expert Role Ingestion">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="text" 
                        placeholder="Describe role, technical domain, or core topic..." 
                        className="flex-1 input-recessed p-4 text-sm rounded-lg outline-none"
                        value={brainstormInput}
                        onChange={(e) => setBrainstormInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBrainstorm()}
                      />
                      <button 
                        onClick={handleBrainstorm}
                        disabled={isBrainstorming}
                        className="bg-sky-600 text-white px-8 py-4 text-xs font-black rounded-lg uppercase transition-all hover:bg-sky-500 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] disabled:opacity-50 active:scale-95"
                      >
                        {isBrainstorming ? 'Analyzing...' : 'Auto-Generate'}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'general')} className="hidden" />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] font-bold text-slate-400 border border-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 uppercase tracking-widest"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        {uploadedFile ? uploadedFile.name : 'Ingest Documentation'}
                      </button>
                    </div>
                  </div>
                </Card>

                <div className="flex gap-2 p-1.5 bg-slate-800/80 border border-slate-700 rounded-xl w-fit">
                  <button onClick={() => setIdentityTab('core')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${identityTab === 'core' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Core Profile</button>
                  <button onClick={() => setIdentityTab('patterns')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${identityTab === 'patterns' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Linguistic Style</button>
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
                            className="flex-1 input-recessed p-4 text-sm rounded-lg outline-none"
                            value={speechSampleText}
                            onChange={(e) => setSpeechSampleText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSpeechAnalysis()}
                          />
                          <button onClick={handleSpeechAnalysis} disabled={isAnalyzingSpeech} className="bg-sky-600 text-white px-8 py-4 text-xs font-black rounded-lg uppercase hover:bg-sky-500 disabled:opacity-50">
                            {isAnalyzingSpeech ? 'Analyzing...' : 'Extract Voice'}
                          </button>
                        </div>
                        <input type="file" ref={speechFileInputRef} onChange={(e) => handleFileChange(e, 'speech')} className="hidden" />
                        <button onClick={() => speechFileInputRef.current?.click()} className="text-[10px] font-bold text-slate-400 border border-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 uppercase tracking-widest">
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
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full">
                <Card className="h-full min-h-[600px] flex flex-col">
                  <div className="flex-1 mono text-xs text-slate-300 bg-slate-950/80 p-8 rounded-lg border border-slate-800 overflow-y-auto custom-scroll leading-relaxed whitespace-pre-wrap selection:bg-sky-500/20">
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
                      <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <div className="w-14 h-14 border border-slate-800 rounded-full mb-6 flex items-center justify-center animate-pulse">
                          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.4em] font-black text-slate-500">Neural Sandbox Initialization Required</p>
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4.5 rounded-2xl text-sm max-w-[85%] border shadow-md transition-all ${
                          m.role === 'user' ? 'bg-sky-600/10 text-sky-200 border-sky-500/30' : 'bg-slate-800 text-slate-200 border-slate-700'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                        <div className="bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                          <div className="w-2 h-2 bg-sky-500 rounded-full animate-ping" />
                          <span className="text-[10px] mono uppercase text-slate-400 font-bold tracking-widest">Expert Node Synthesizing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 pt-8 border-t border-slate-700/50">
                    <input 
                      type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Enter command or operational query..."
                      className="flex-1 input-recessed p-4 text-sm rounded-xl outline-none"
                    />
                    <button onClick={handleSendMessage} disabled={isChatting || !userInput.trim()} className="w-16 h-16 bg-sky-600 text-white flex items-center justify-center rounded-xl hover:bg-sky-500 hover:shadow-lg disabled:opacity-20 active:scale-90 transition-all">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="hidden lg:flex w-72 xl:w-96 border-l border-slate-800 flex-col bg-slate-900/80 p-10 backdrop-blur-md">
        <div className="mb-12">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-status" />
            Live Parameters
          </h4>
          <div className="space-y-5">
            <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <span className="block text-[8px] text-slate-500 uppercase tracking-[0.25em] mb-3 font-black">Expert Node</span>
              <Badge text={vars.roleTitle} />
            </div>
            <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <span className="block text-[8px] text-slate-500 uppercase tracking-[0.25em] mb-3 font-black">Target Domain</span>
              <Badge text={vars.domainArea} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">Architecture Trace</h4>
          <div className="flex-1 bg-slate-950/50 border border-slate-800 p-5 rounded-xl overflow-y-auto custom-scroll">
            <div className="mono text-[10px] text-slate-400 leading-relaxed font-medium">
              {finalPrompt.slice(0, 1500)}...
            </div>
          </div>
        </div>
      </aside>

      <footer className="fixed bottom-0 left-0 right-0 h-12 px-10 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-2xl flex justify-between items-center z-50 text-[10px] mono text-slate-500 font-bold">
        <div className="flex items-center gap-8">
          <span className="uppercase tracking-[0.3em] text-slate-400">ModeShift_Engine_v4.2</span>
          <div className="h-4 w-px bg-slate-700" />
          <span className="hidden sm:inline tracking-widest text-slate-600">ENCLAVE: STABLE_ALPHA</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-status" />
          <span className="uppercase tracking-[0.25em] text-slate-400">System Ready</span>
        </div>
      </footer>
    </div>
  );
}
