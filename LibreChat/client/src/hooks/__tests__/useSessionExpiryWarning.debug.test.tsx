import { renderHook } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { vi } from 'vitest';
import { useSessionExpiryWarning } from '../useSessionExpiryWarning';

// Simple debug test to understand the issue
describe('useSessionExpiryWarning Debug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should work with minimal setup', () => {
    // Mock useNavigate to return a function
    const mockNavigate = vi.fn();
    vi.doMock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));

    // Mock authClient.useSession to return a simple session
    vi.doMock('~/config/betterAuth', () => ({
      authClient: {
        useSession: () => ({
          data: {
            session: {
              expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
              user: { id: 'test', email: 'test@example.com' },
            },
          },
          isPending: false,
          error: null,
        }),
      },
    }));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RecoilRoot>{children}</RecoilRoot>
    );

    const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

    // Check if the hook returns anything
    console.log('result.current:', result.current);
    
    if (result.current) {
      expect(result.current.showWarning).toBeDefined();
      expect(result.current.timeRemaining).toBeDefined();
    } else {
      console.log('result.current is null - hook threw an error');
      expect(result.current).not.toBeNull();
    }
  });
});