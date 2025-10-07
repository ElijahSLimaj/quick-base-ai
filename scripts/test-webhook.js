#!/usr/bin/env node

/**
 * Simple script to test your Stripe webhook locally
 * Usage: node scripts/test-webhook.js
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/stripe';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

// Test webhook endpoint
async function testWebhookEndpoint() {
  console.log('🧪 Testing webhook endpoint...');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify({ test: true })
    });
    
    if (response.status === 400) {
      console.log('✅ Webhook endpoint is accessible (returned 400 as expected for invalid signature)');
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Webhook endpoint test failed:', error.message);
    console.log('💡 Make sure your Next.js app is running on localhost:3000');
  }
}

// Test with Stripe CLI command suggestions
function showStripeCLICommands() {
  console.log('\n📋 Stripe CLI Commands to Test Webhooks:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const commands = [
    'stripe listen --forward-to localhost:3000/api/webhooks/stripe',
    'stripe trigger customer.subscription.created',
    'stripe trigger customer.subscription.updated',
    'stripe trigger customer.subscription.deleted',
    'stripe trigger invoice.payment_succeeded',
    'stripe trigger invoice.payment_failed',
    'stripe trigger checkout.session.completed'
  ];
  
  commands.forEach((cmd, index) => {
    console.log(`${index + 1}. ${cmd}`);
  });
  
  console.log('\n💡 First run the listen command, then trigger events in another terminal');
}

// Show environment setup
function showEnvironmentSetup() {
  console.log('\n🔧 Environment Setup:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: Not set`);
    }
  });
}

// Main execution
async function main() {
  console.log('🚀 Stripe Webhook Test Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  showEnvironmentSetup();
  await testWebhookEndpoint();
  showStripeCLICommands();
  
  console.log('\n📚 For more details, see: STRIPE_WEBHOOK_GUIDE.md');
}

main().catch(console.error);
