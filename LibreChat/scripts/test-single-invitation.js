#!/usr/bin/env node

/**
 * Standalone script to test invitation emails and view them in MailHog
 * This runs outside of the E2E test framework so emails won't be cleaned up
 * 
 * Usage: node scripts/test-single-invitation.js
 */

const axios = require('axios');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testInvitation() {
  console.log('🚀 Testing invitation email system...\n');
  
  const testEmail = `test-invitation-${Date.now()}@example.com`;
  const testPassword = `TestPass123!${Date.now()}`;
  const testId = Date.now().toString();
  
  try {
    // 1. Create test user
    console.log('1️⃣ Creating test user...');
    const signUpResponse = await axios.post('http://localhost:3080/api/auth/sign-up/email', {
      email: testEmail,
      password: testPassword,
      name: `Test User ${testId}`,
    });
    console.log('✅ User created:', testEmail);
    
    // 2. Sign in to get session
    console.log('\n2️⃣ Signing in...');
    const signInResponse = await axios.post('http://localhost:3080/api/auth/sign-in/email', {
      email: testEmail,
      password: testPassword,
    }, {
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    // Extract session cookie
    const cookies = signInResponse.headers['set-cookie'];
    const sessionCookie = cookies.find(c => c.includes('better-auth.session_token'));
    const sessionToken = sessionCookie.match(/better-auth\.session_token=([^;]+)/)[1];
    console.log('✅ Session obtained');
    
    // 3. Create organization
    console.log('\n3️⃣ Creating organization...');
    const createOrgResponse = await axios.post('http://localhost:3080/api/auth/organization/create', {
      name: `Test Org ${testId}`,
      slug: `test-org-${testId}`,
    }, {
      headers: {
        'Cookie': `better-auth.session_token=${sessionToken}`
      }
    });
    console.log('✅ Organization created:', createOrgResponse.data.name);
    
    // 4. Send invitation
    console.log('\n4️⃣ Sending invitation...');
    const inviteeEmail = `invitee-${Date.now()}@example.com`;
    
    const inviteResponse = await axios.post('http://localhost:3080/api/auth/organization/invite-member', {
      email: inviteeEmail,
      role: 'member',
      resend: true
    }, {
      headers: {
        'Cookie': `better-auth.session_token=${sessionToken}`
      }
    });
    
    console.log('✅ Invitation sent to:', inviteeEmail);
    console.log('📧 Invitation ID:', inviteResponse.data.id);
    
    // 5. Wait for email to be processed
    console.log('\n⏳ Waiting 3 seconds for email delivery...');
    await delay(3000);
    
    // 6. Check MailHog
    console.log('\n5️⃣ Checking MailHog for invitation email...');
    const mailhogResponse = await axios.get('http://localhost:8025/api/v2/messages');
    const messages = mailhogResponse.data.items;
    
    const invitationEmail = messages.find(msg => 
      msg.Content.Headers.To[0].includes(inviteeEmail)
    );
    
    if (invitationEmail) {
      console.log('\n✅ Invitation email found!');
      console.log('📨 Email Details:');
      console.log('   Subject:', invitationEmail.Content.Headers.Subject[0]);
      console.log('   To:', invitationEmail.Content.Headers.To[0]);
      console.log('   From:', invitationEmail.Content.Headers.From[0]);
      
      // Extract invitation link
      const htmlBody = invitationEmail.Content.Body;
      const linkMatch = htmlBody.match(/href="([^"]*accept-invitation[^"]*)"/);
      if (linkMatch) {
        console.log('   🔗 Invitation Link:', linkMatch[1]);
      }
    } else {
      console.log('❌ Invitation email not found in MailHog');
    }
    
    console.log('\n📌 View all emails at: http://localhost:8025');
    console.log('📌 The invitation email will remain in MailHog until you clear it');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testInvitation();