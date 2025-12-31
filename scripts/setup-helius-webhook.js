#!/usr/bin/env node
/**
 * Solana Game v3.10 — Helius Webhook Setup Script
 * 
 * This script sets up a Helius webhook for real-time transaction monitoring.
 * Run it once after deploying your app to production.
 * 
 * Usage:
 *   node scripts/setup-helius-webhook.js
 * 
 * Environment variables required:
 *   - HELIUS_API_KEY: Your Helius API key
 *   - WEBHOOK_URL: Your app's webhook endpoint (e.g., https://your-app.com/api/helius-webhook)
 *   - PROGRAM_ID: Your Solana program ID
 */

require('dotenv').config({ path: '.env.local' });

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID;

async function main() {
  console.log('🚀 Helius Webhook Setup Script');
  console.log('================================\n');

  if (!HELIUS_API_KEY) {
    console.error('❌ Error: HELIUS_API_KEY or NEXT_PUBLIC_HELIUS_API_KEY is not set');
    console.log('   Set it in your .env.local file');
    process.exit(1);
  }

  if (!WEBHOOK_URL) {
    console.error('❌ Error: WEBHOOK_URL is not set');
    console.log('   Example: WEBHOOK_URL=https://your-app.com/api/helius-webhook');
    process.exit(1);
  }

  if (!PROGRAM_ID) {
    console.error('❌ Error: NEXT_PUBLIC_PROGRAM_ID is not set');
    process.exit(1);
  }

  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`📍 Program ID: ${PROGRAM_ID}`);
  console.log(`📍 API Key: ${HELIUS_API_KEY.slice(0, 8)}...`);
  console.log('');

  // First, list existing webhooks
  console.log('📋 Checking existing webhooks...\n');
  
  try {
    const listResponse = await fetch(
      `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`
    );
    
    if (!listResponse.ok) {
      throw new Error(`Failed to list webhooks: ${listResponse.statusText}`);
    }
    
    const existingWebhooks = await listResponse.json();
    
    if (existingWebhooks.length > 0) {
      console.log(`Found ${existingWebhooks.length} existing webhook(s):`);
      existingWebhooks.forEach((wh, i) => {
        console.log(`  ${i + 1}. ${wh.webhookURL} (ID: ${wh.webhookID})`);
      });
      console.log('');
      
      // Check if webhook for our URL already exists
      const existing = existingWebhooks.find(wh => wh.webhookURL === WEBHOOK_URL);
      if (existing) {
        console.log(`✅ Webhook already exists for ${WEBHOOK_URL}`);
        console.log(`   ID: ${existing.webhookID}`);
        console.log(`   Type: ${existing.webhookType}`);
        console.log('');
        console.log('To update it, delete and recreate, or update via API.');
        process.exit(0);
      }
    } else {
      console.log('No existing webhooks found.\n');
    }
  } catch (err) {
    console.warn(`⚠️  Could not list existing webhooks: ${err.message}`);
  }

  // Create new webhook
  console.log('🔧 Creating new webhook...\n');

  const webhookConfig = {
    webhookURL: WEBHOOK_URL,
    transactionTypes: ['ANY'],
    accountAddresses: [PROGRAM_ID],
    webhookType: 'enhanced',
    txnStatus: 'all', // Get both success and failed transactions
  };

  console.log('Webhook configuration:');
  console.log(JSON.stringify(webhookConfig, null, 2));
  console.log('');

  try {
    const createResponse = await fetch(
      `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookConfig),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create webhook: ${createResponse.status} ${errorText}`);
    }

    const result = await createResponse.json();
    
    console.log('✅ Webhook created successfully!\n');
    console.log('Webhook details:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Add HELIUS_WEBHOOK_SECRET to your .env.local for verification');
    console.log('2. Deploy your app with the /api/helius-webhook endpoint');
    console.log('3. Monitor webhook deliveries in Helius dashboard');
    
  } catch (err) {
    console.error(`❌ Failed to create webhook: ${err.message}`);
    process.exit(1);
  }
}

main().catch(console.error);

