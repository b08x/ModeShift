
import React, { useState, useCallback, useMemo } from 'react';
import { DomainVariables, StepId, ChatMessage } from './types';
import { INITIAL_VARIABLES, PROMPT_TEMPLATE } from './constants';
import { brainstormVariables, chatWithExpert } from './services/geminiService';

// --- Components ---

const StepIndicator: React.FC<{ current: StepId; onClick: (s: StepId) => void }> = ({ current, onClick }) => {
  const steps: { id: StepId; label: string }[] = [
    { id: 'identity', label: 'Core Identity' },
    { id: 'context', label: 'Communication' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'preview', label: 'Review Prompt' },
    { id: 'sandbox', label: 'Test Drive' },
  ];

  return (
    <nav className="flex items-center justify-between mb-8 overflow-x-auto pb-4 gap-4 border-b border-slate-200">
      {steps.map((step, idx) => {
        const isActive = current === step.id;
        return (
          <button
            key={step.id}
            onClick={() => onClick(step.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg transition-all ${
              isActive 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-indigo-400' : 'bg-slate-200'}`}>
              {idx + 1}
            </span>
            <span className="font-medium text-sm">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const InputGroup: React.FC<{ label: string; name: keyof DomainVariables; value: string; onChange: (name: keyof DomainVariables, val: string) => void; placeholder?: string; type?: 'text' | 'textarea' }> = ({ label, name, value, onChange, placeholder, type = 'text' }) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-800"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-800"
        />
      )}
    </div>
  );
};

const AIAssist: React.FC<{ onBrainstorm: (topic: string) => void }> = ({ onBrainstorm }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    await onBrainstorm(topic);
    setLoading(false);
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="font-bold text-indigo-900">AI Assistant Brainstorm</h3>
      </div>
      <p className="text-sm text-indigo-700 mb-4">Enter a domain or role, and let Gemini help you fill out the core variables.</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. Senior Cybersecurity Architect"
          className="flex-1 px-4 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          onClick={handleAction}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Thinking...' : 'Brainstorm'}
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [vars, setVars] = useState<DomainVariables>(INITIAL_VARIABLES);
  const [activeStep, setActiveStep] = useState<StepId>('identity');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const updateVar = useCallback((name: keyof DomainVariables, val: string) => {
    setVars(prev => ({ ...prev, [name]: val }));
  }, []);

  const handleBrainstorm = async (topic: string) => {
    const suggested = await brainstormVariables(topic);
    setVars(prev => ({ ...prev, ...suggested }));
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
      setMessages([...newMessages, { role: 'model', text: 'Error: Make sure your API_KEY is set and valid.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalPrompt);
    alert('Prompt copied to clipboard!');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <span className="bg-indigo-600 text-white p-2 rounded-xl">Mode</span>
          <span className="text-indigo-600 font-light italic">Shift</span>
        </h1>
        <p className="text-slate-500 mt-2">Design high-performance system prompts using the Natural Pacing Protocol.</p>
      </header>

      <StepIndicator current={activeStep} onClick={setActiveStep} />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Form/Sandbox */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100 overflow-y-auto max-h-[75vh]">
          {activeStep === 'identity' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold mb-6 text-slate-800">Core Identity</h2>
              <AIAssist onBrainstorm={handleBrainstorm} />
              <InputGroup label="Role Title" name="roleTitle" value={vars.roleTitle} onChange={updateVar} placeholder="e.g. Lead DevOps Engineer" />
              <InputGroup label="Domain Area" name="domainArea" value={vars.domainArea} onChange={updateVar} placeholder="e.g. Cloud Infrastructure and CI/CD" />
              <InputGroup label="Primary Responsibilities" name="primaryResponsibilities" type="textarea" value={vars.primaryResponsibilities} onChange={updateVar} placeholder="e.g. managing uptime, scaling Kubernetes clusters..." />
              <InputGroup label="Key Systems" name="keySystems" value={vars.keySystems} onChange={updateVar} placeholder="e.g. AWS, Terraform, Docker" />
              <InputGroup label="Common Task Types" name="commonTaskTypes" value={vars.commonTaskTypes} onChange={updateVar} placeholder="e.g. troubleshooting, architecture design" />
              <InputGroup label="Stakeholder Expectations" name="stakeholderExpectations" value={vars.stakeholderExpectations} onChange={updateVar} placeholder="e.g. high availability, security compliance" />
            </section>
          )}

          {activeStep === 'context' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold mb-6 text-slate-800">Communication Contexts</h2>
              <InputGroup label="Formal Mode Examples" name="formalContexts" type="textarea" value={vars.formalContexts} onChange={updateVar} />
              <InputGroup label="Technical Mode Examples" name="technicalContexts" type="textarea" value={vars.technicalContexts} onChange={updateVar} />
              <InputGroup label="Formality Exceptions (No Contractions)" name="formalityExceptions" type="textarea" value={vars.formalityExceptions} onChange={updateVar} />
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Expertise Level" name="expertiseLevel" value={vars.expertiseLevel} onChange={updateVar} />
                <InputGroup label="Experience Characteristic" name="experienceCharacteristic" value={vars.experienceCharacteristic} onChange={updateVar} />
              </div>
            </section>
          )}

          {activeStep === 'scenarios' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold mb-6 text-slate-800">Adaptive Scenarios</h2>
              
              <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Urgent Situation</h3>
                <InputGroup label="Scenario Description" name="highUrgencyScenario" value={vars.highUrgencyScenario} onChange={updateVar} />
                <InputGroup label="Response Style" name="crisisResponseStyle" value={vars.crisisResponseStyle} onChange={updateVar} />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Teaching/Learning</h3>
                <InputGroup label="Scenario Description" name="learningScenario" value={vars.learningScenario} onChange={updateVar} />
                <InputGroup label="Mentoring Style" name="mentoringStyle" value={vars.mentoringStyle} onChange={updateVar} />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Routine/Efficiency</h3>
                <InputGroup label="Scenario Description" name="routineScenario" value={vars.routineScenario} onChange={updateVar} />
                <InputGroup label="Collaboration Style" name="efficientCollaborativeStyle" value={vars.efficientCollaborativeStyle} onChange={updateVar} />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Complex/Analytical</h3>
                <InputGroup label="Scenario Description" name="complexScenario" value={vars.complexScenario} onChange={updateVar} />
                <InputGroup label="Analytical Style" name="investigativeAnalyticalStyle" value={vars.investigativeAnalyticalStyle} onChange={updateVar} />
              </div>
            </section>
          )}

          {activeStep === 'preview' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Generated System Prompt</h2>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Prompt
                </button>
              </div>
              <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl flex-1 overflow-y-auto mono text-sm leading-relaxed whitespace-pre-wrap">
                {finalPrompt}
              </div>
            </section>
          )}

          {activeStep === 'sandbox' && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-slate-800">Expert Test Drive</h2>
              <div className="bg-indigo-50 p-3 rounded-xl mb-4 text-xs text-indigo-700 italic border border-indigo-100">
                The AI is now initialized with your custom prompt. Try asking questions or presenting scenarios to test its persona.
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 min-h-[400px]">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-400 text-center px-12">
                    Start a conversation to see the prompt in action.
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                      m.role === 'user' 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 px-4 py-3 rounded-2xl text-slate-400 text-sm animate-pulse italic">
                      AI expert is thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask your custom expert something..."
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isChatting}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Side: Quick Reference / Preview Mini */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="sticky top-8 bg-slate-900 rounded-3xl p-6 h-[75vh] flex flex-col overflow-hidden text-white border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Live Preview</h3>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto mono text-[11px] leading-relaxed text-slate-400 select-none opacity-80 pointer-events-none custom-scroll">
              {finalPrompt}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                   {vars.roleTitle ? vars.roleTitle[0]?.toUpperCase() : '?'}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Active Identity</p>
                  <p className="text-sm font-semibold truncate w-40">{vars.roleTitle || "Undefined Expert"}</p>
                </div>
              </div>
              <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-500/20">
                <p className="text-[10px] text-indigo-300/60 uppercase font-black mb-1">Architecture Note</p>
                <p className="text-xs text-indigo-100/90 leading-tight">
                  The Natural Pacing Protocol ensures your AI avoids generic fluff like "I hope this helps" and maintains professional continuity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-center text-slate-400 text-xs py-8 border-t border-slate-200">
        ModeShift &copy; 2025 • Powered by Gemini AI & The Natural Pacing Protocol
      </footer>
    </div>
  );
}
