/**
 * @fileoverview MailHog utilities for e2e testing
 * @module e2e/utils/mailhog
 */

/**
 * MailHog API client for retrieving emails during e2e tests
 */
export class MailHog {
  constructor(baseUrl = 'http://localhost:8025') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all messages from MailHog
   * @returns {Promise<Array>} Array of email messages
   */
  async getMessages() {
    const response = await fetch(`${this.baseUrl}/api/v2/messages`);
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }
    const data = await response.json();
    return data.items || [];
  }

  /**
   * Get the latest message sent to a specific email address
   * @param {string} email - Email address to search for
   * @param {number} timeout - Timeout in milliseconds (default: 10000)
   * @returns {Promise<Object|null>} Latest message or null if not found
   */
  async getLatestMessage(email, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessages();
      const message = messages.find(msg => 
        msg.To && msg.To.some(to => to.Mailbox && to.Domain && 
          `${to.Mailbox}@${to.Domain}`.toLowerCase() === email.toLowerCase())
      );
      
      if (message) {
        return message;
      }
      
      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
  }

  /**
   * Extract magic link from email message
   * @param {Object} message - MailHog message object
   * @returns {string|null} Magic link URL or null if not found
   */
  extractMagicLink(message) {
    if (!message || !message.Content || !message.Content.Body) {
      return null;
    }

    let body = message.Content.Body;
    
    // Decode HTML entities and clean up the email body
    body = body
      .replace(/=\r\n/g, '') // Remove quoted-printable line breaks
      .replace(/&#x3D;/g, '=') // Decode &#x3D; to =
      .replace(/&amp;/g, '&') // Decode &amp; to &
      .replace(/&quot;/g, '"') // Decode &quot; to "
      .replace(/=3D/g, '=') // Decode quoted-printable =3D to =
      .replace(/\r\n/g, ' '); // Replace line breaks with spaces
    
    // Look for magic link URL in href attributes
    const hrefPattern = /href=3D?['"]?(https?:\/\/[^'">\s]*\/api\/auth\/magic-link\/verify[^'">\s]*?)['"]?/gi;
    const hrefMatches = body.match(hrefPattern);
    
    if (hrefMatches && hrefMatches.length > 0) {
      // Extract just the URL part from href="URL" 
      const urlMatch = hrefMatches[0].match(/(https?:\/\/[^'">\s]*)/);
      if (urlMatch) {
        let url = urlMatch[0];
        // URL decode any remaining entities
        url = url.replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%3D/g, '=').replace(/%26/g, '&');
        return url;
      }
    }
    
    // Fallback: look for any magic-link URL in the text
    const urlPattern = /(https?:\/\/[^\s<>"']*magic-link[^\s<>"']*)/gi;
    const urlMatches = body.match(urlPattern);
    
    if (urlMatches && urlMatches.length > 0) {
      let url = urlMatches[0];
      // Clean up any trailing characters and decode
      url = url.replace(/['">\)]*$/, ''); // Remove trailing quotes, brackets
      url = url.replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%3D/g, '=').replace(/%26/g, '&');
      return url;
    }
    
    return null;
  }

  /**
   * Wait for and extract magic link from email sent to specific address
   * @param {string} email - Email address to monitor
   * @param {number} timeout - Timeout in milliseconds (default: 10000)
   * @returns {Promise<string|null>} Magic link URL or null if not found
   */
  async waitForMagicLink(email, timeout = 10000) {
    const message = await this.getLatestMessage(email, timeout);
    if (!message) {
      return null;
    }
    
    return this.extractMagicLink(message);
  }

  /**
   * Clear all messages from MailHog
   * @returns {Promise<void>}
   */
  async clearMessages() {
    const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear messages: ${response.statusText}`);
    }
  }

  /**
   * Get message count
   * @returns {Promise<number>} Number of messages in MailHog
   */
  async getMessageCount() {
    const messages = await this.getMessages();
    return messages.length;
  }
}

/**
 * Create a new MailHog instance
 * @param {string} baseUrl - MailHog base URL (default: http://localhost:8025)
 * @returns {MailHog} MailHog instance
 */
export function createMailHog(baseUrl = 'http://localhost:8025') {
  return new MailHog(baseUrl);
}