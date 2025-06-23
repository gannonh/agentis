import { NavigateFunction } from 'react-router-dom';

/**
 * NavigationService provides centralized navigation methods using React Router.
 * Must be initialized with a navigate function before use.
 */
export class NavigationService {
  private navigate: NavigateFunction | null = null;

  /**
   * Set the React Router navigate function
   */
  setNavigate(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  /**
   * Get the navigate function, throwing if not initialized
   */
  private getNavigate(): NavigateFunction {
    if (!this.navigate) {
      throw new Error('NavigationService not initialized. Call setNavigate() first.');
    }
    return this.navigate;
  }

  /**
   * Navigate to login page
   */
  navigateToLogin() {
    this.getNavigate()('/login', { replace: true });
  }

  /**
   * Navigate to home page
   */
  navigateToHome() {
    this.getNavigate()('/', { replace: true });
  }

  /**
   * Navigate to new chat
   */
  navigateToChat() {
    this.getNavigate()('/c/new', { replace: true });
  }

  /**
   * Check if URL is external
   */
  isExternalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Handle redirect to any URL (internal or external)
   */
  handleRedirect(url: string) {
    if (this.isExternalUrl(url)) {
      // External URLs require window.location (OAuth, external links)
      window.location.href = url;
    } else {
      // Internal navigation uses React Router
      this.getNavigate()(url, { replace: true });
    }
  }
}

// Singleton instance
export const navigationService = new NavigationService();
