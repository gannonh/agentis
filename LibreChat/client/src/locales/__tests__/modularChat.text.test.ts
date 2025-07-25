import { describe, it, expect } from 'vitest';
import enTranslation from '../en/translation.json';

describe('Modular Chat Text Update', () => {
  it('should use agents or models instead of endpoints in modular chat text', () => {
    const modularChatText = enTranslation.com_nav_modular_chat;
    
    // Should contain "agents or models" not "Endpoints"
    expect(modularChatText).toContain('agents or models');
    expect(modularChatText).not.toContain('Endpoints');
    
    // Should be the updated text
    expect(modularChatText).toBe('Enable switching agents or models mid-conversation');
  });

  it('should still contain the core functionality description', () => {
    const modularChatText = enTranslation.com_nav_modular_chat;
    
    // Should still describe the switching mid-conversation functionality
    expect(modularChatText).toContain('Enable switching');
    expect(modularChatText).toContain('mid-conversation');
  });
});