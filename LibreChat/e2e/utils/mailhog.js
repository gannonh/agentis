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
      console.log('📧 No message content found');
      return null;
    }

    let body = message.Content.Body;
    console.log('📧 Raw email body length:', body.length);
    
    // Decode HTML entities and clean up the email body
    body = body
      .replace(/=\r\n/g, '') // Remove quoted-printable line breaks
      .replace(/&#x3D;/g, '=') // Decode &#x3D; to =
      .replace(/&amp;/g, '&') // Decode &amp; to &
      .replace(/&quot;/g, '"') // Decode &quot; to "
      .replace(/=3D/g, '=') // Decode quoted-printable =3D to =
      .replace(/\r\n/g, ' '); // Replace line breaks with spaces
    
    console.log('📧 Cleaned email body length:', body.length);
    
    // Look for magic link URL - capture everything including query params
    const urlPattern = /(https?:\/\/[^\s<>"']*magic-link\/verify[^\s<>"']*)/gi;
    const urlMatches = body.match(urlPattern);
    
    if (urlMatches && urlMatches.length > 0) {
      console.log('📧 Found URL matches:', urlMatches.length);
      let url = urlMatches[0];
      // Clean up any trailing characters and decode
      url = url.replace(/['">\)]*$/, ''); // Remove trailing quotes, brackets
      url = url.replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%3D/g, '=').replace(/%26/g, '&');
      console.log('📧 Extracted URL:', url);
      return url;
    }
    
    console.log('📧 No magic link found in email body');
    return null;
  }

  /**
   * Wait for and extract magic link from email sent to specific address
   * @param {string} email - Email address to monitor
   * @param {number} timeout - Timeout in milliseconds (default: 10000)
   * @returns {Promise<string|null>} Magic link URL or null if not found
   */
  async waitForMagicLink(email, timeout = 10000) {
    console.log(`📧 Starting magic link wait for ${email}`);
    
    // Wait 1 second for the email to arrive
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const messages = await this.getMessages();
      
      // Get the newest message for this email
      const emailMessages = messages
        .filter(msg => 
          msg.To && msg.To.some(to => to.Mailbox && to.Domain && 
            `${to.Mailbox}@${to.Domain}`.toLowerCase() === email.toLowerCase())
        )
        .sort((a, b) => new Date(b.Created) - new Date(a.Created)); // Newest first
      
      if (emailMessages.length > 0) {
        const latestMessage = emailMessages[0];
        console.log(`📧 Found latest message for ${email}, created: ${latestMessage.Created}`);
        
        const magicLink = this.extractMagicLink(latestMessage);
        if (magicLink) {
          console.log(`📧 Extracted magic link: ${magicLink}`);
          return magicLink;
        }
      }
    } catch (error) {
      console.log(`📧 Error getting messages: ${error.message}`);
    }
    
    console.log(`📧 No magic link found for ${email}`);
    return null;
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