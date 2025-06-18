/**
 * @fileoverview Unit tests for OnboardingFlow index exports
 */

import { describe, expect, it } from 'vitest';

// Import the index exports
import {
  OnboardingLayout,
  OrganizationDetection,
  OrganizationSetup,
  ProfileSetup,
  TeamInvitation,
  WelcomeDashboard,
} from '../index';

describe('OnboardingFlow Index Exports', () => {
  it('should export OnboardingLayout component', () => {
    expect(OnboardingLayout).toBeDefined();
    expect(typeof OnboardingLayout).toBe('function');
  });

  it('should export OrganizationDetection component', () => {
    expect(OrganizationDetection).toBeDefined();
    expect(typeof OrganizationDetection).toBe('function');
  });

  it('should export OrganizationSetup component', () => {
    expect(OrganizationSetup).toBeDefined();
    expect(typeof OrganizationSetup).toBe('function');
  });

  it('should export ProfileSetup component', () => {
    expect(ProfileSetup).toBeDefined();
    expect(typeof ProfileSetup).toBe('function');
  });

  it('should export TeamInvitation component', () => {
    expect(TeamInvitation).toBeDefined();
    expect(typeof TeamInvitation).toBe('function');
  });

  it('should export WelcomeDashboard component', () => {
    expect(WelcomeDashboard).toBeDefined();
    expect(typeof WelcomeDashboard).toBe('function');
  });
});