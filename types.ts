
export interface DomainVariables {
  roleTitle: string;
  domainArea: string;
  primaryResponsibilities: string;
  keySystems: string;
  commonTaskTypes: string;
  stakeholderExpectations: string;
  formalContexts: string;
  technicalContexts: string;
  formalityExceptions: string;
  expertiseLevel: string;
  experienceCharacteristic: string;
  highUrgencyScenario: string;
  crisisResponseStyle: string;
  learningScenario: string;
  mentoringStyle: string;
  routineScenario: string;
  efficientCollaborativeStyle: string;
  complexScenario: string;
  investigativeAnalyticalStyle: string;
  speakingPatterns: string;
}

export type StepId = 'identity' | 'context' | 'scenarios' | 'preview' | 'sandbox';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
