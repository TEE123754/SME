import type { TrustedScope } from '@customerbuddy/contracts';

export const assistantDisclosure = 'Demo assistant — scripted responses';

export type SupportedIntent =
  | 'catalogue'
  | 'repeat_order'
  | 'prepare_quote'
  | 'order_status'
  | 'preference_proposal'
  | 'human_handoff'
  | 'unknown';

export interface ScriptedAssistantRequest {
  scope: TrustedScope;
  conversationId: string;
  messageId: string;
  text: string;
  language: 'bm' | 'en';
}

export interface ScriptedAssistantResult {
  mode: 'scripted';
  intent: SupportedIntent;
  scriptVersion: string;
  reply: string;
  objectReferences: string[];
}

// Contract only: real scoped service dispatch and templates are Phase 5 work.
export interface DemoAssistant {
  respond(request: ScriptedAssistantRequest): Promise<ScriptedAssistantResult>;
}
