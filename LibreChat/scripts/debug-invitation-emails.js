#!/usr/bin/env node

/**
 * Debug script to examine invitation emails in MailHog
 * 
 * Usage:
 * 1. Run an invitation test: npm run e2e -- e2e/specs/auth-ob/auth-ob.team-invitation.spec.ts -g "User can send team invitations"
 * 2. In another terminal: node scripts/debug-invitation-emails.js
 * 3. Open MailHog UI: http://localhost:8025
 */

const axios = require('axios');

async function debugInvitationEmails() {
  try {
    console.log('🔍 Fetching emails from MailHog...\n');
    
    // Get all messages from MailHog
    const response = await axios.get('http://localhost:8025/api/v2/messages');
    const messages = response.data.items;
    
    console.log(`📧 Found ${messages.length} emails in MailHog\n`);
    
    // Filter and display invitation emails
    messages.forEach((message, index) => {
      const subject = message.Content.Headers.Subject[0];
      const to = message.Content.Headers.To[0];
      const from = message.Content.Headers.From[0];
      
      // Check if it's an invitation email
      if (subject.includes('Join') && subject.includes('team')) {
        console.log(`📨 Invitation Email #${index + 1}`);
        console.log(`   To: ${to}`);
        console.log(`   From: ${from}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Date: ${new Date(message.Created).toLocaleString()}`);
        console.log(`   ID: ${message.ID}`);
        
        // Extract invitation link from HTML body
        const htmlBody = message.Content.Body;
        const linkMatch = htmlBody.match(/href="([^"]*accept-invitation[^"]*)"/);
        if (linkMatch) {
          console.log(`   🔗 Invitation Link: ${linkMatch[1]}`);
        }
        
        console.log('   ---');
      }
    });
    
    console.log('\n💡 Tips:');
    console.log('- View full emails at: http://localhost:8025');
    console.log('- To keep emails between tests, comment out mailhog.clearMessages() in the test');
    console.log('- To pause test after sending emails, add: await page.pause()');
    
  } catch (error) {
    console.error('❌ Error fetching emails:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. MailHog is running: docker-compose -f docker-compose.dev.yml up -d mailhog');
    console.log('2. MailHog API is accessible at: http://localhost:8025');
  }
}

debugInvitationEmails();