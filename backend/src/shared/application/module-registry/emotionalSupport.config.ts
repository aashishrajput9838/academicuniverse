import { ModuleDescriptor } from '../moduleRegistry.types';

const config: ModuleDescriptor = {
  moduleId: 'emotional_support',
  moduleName: 'AI Chatbot Memory',
  description: 'Maintains AI chatbot conversation context and student emotional state history.',
  acceptedDocumentCategories: ['OTHER'],
  requiredEntities: ['chat history', 'emotional state', 'student mood'],
  requiredCandidateFields: ['chatHistory', 'emotionalState', 'mood'],
  canonicalCollection: 'AILogAnalysis',
  priority: 12,
  eventName: 'ChatbotMemoryUpdated',
};

export default config;
