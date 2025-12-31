# Solana Game v3.10 — Helius RPC Configuration Guide

## Environment Variables for Optimized RPC Usage

### Required Configuration

```env
# Your program ID (REQUIRED)
NEXT_PUBLIC_PROGRAM_ID=your_program_id_here

# Solana cluster (mainnet-beta, devnet, testnet)
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
```

### Helius RPC Configuration (Recommended for Mainnet)

```env
# Helius API Key (get from https://helius.xyz/)
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key_here

# Fallback RPC (used when Helius rate limited)
NEXT_PUBLIC_RPC_FALLBACK=https://api.mainnet-beta.solana.com
```

### Optimization Mode

```env
# Enable optimized mode (caching, batching, throttling)
NEXT_PUBLIC_RPC_MODE=optimized

# Enable Helius webhooks
NEXT_PUBLIC_USE_HELIUS_WEBHOOKS=true

# Enable aggressive caching (default: true)
NEXT_PUBLIC_AGGRESSIVE_CACHING=true

# Enable request batching (default: true)
NEXT_PUBLIC_ENABLE_BATCHING=true
```

### Rate Limiting & Cache TTL

```env
# Maximum RPC requests per minute
NEXT_PUBLIC_MAX_RPC_REQUESTS_PER_MINUTE=60

# Cache TTL settings (milliseconds)
NEXT_PUBLIC_CACHE_TTL_ACCOUNT=60000     # 1 minute
NEXT_PUBLIC_CACHE_TTL_BALANCE=30000     # 30 seconds
NEXT_PUBLIC_CACHE_TTL_NFT=300000        # 5 minutes
NEXT_PUBLIC_CACHE_TTL_TX=10000          # 10 seconds
NEXT_PUBLIC_CACHE_TTL_CONFIG=120000     # 2 minutes
NEXT_PUBLIC_CACHE_TTL_LEVEL=15000       # 15 seconds

# Batch settings
NEXT_PUBLIC_BATCH_INTERVAL=100          # 100ms batch window
NEXT_PUBLIC_BATCH_MAX_SIZE=20           # Max requests per batch

# Throttle settings
NEXT_PUBLIC_THROTTLE_MIN_DELAY=100      # 100ms between calls
NEXT_PUBLIC_THROTTLE_BACKOFF=3000       # 3s backoff on 429
NEXT_PUBLIC_THROTTLE_MAX_BACKOFF=30000  # 30s max backoff
```

### Transaction Limits (Phantom Trust)

```env
# Maximum compute units (Phantom flags > 200k)
NEXT_PUBLIC_MAX_COMPUTE_UNITS=200000

# Simulation timeout (ms)
NEXT_PUBLIC_SIMULATION_TIMEOUT=10000
```

### Webhook Configuration

```env
# Helius webhook secret (for verifying requests)
HELIUS_WEBHOOK_SECRET=your_webhook_secret_here
```

## Setting Up Helius Webhooks

1. Go to https://helius.xyz/ and create an account
2. Get your API key
3. Set up a webhook:

```bash
curl -X POST "https://api.helius.xyz/v0/webhooks?api-key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "webhookURL": "https://your-app.com/api/helius-webhook",
    "transactionTypes": ["ANY"],
    "accountAddresses": ["YOUR_PROGRAM_ID"],
    "webhookType": "enhanced"
  }'
```

4. Set `HELIUS_WEBHOOK_SECRET` to verify incoming requests

## Optimization Checklist

- [ ] Set `NEXT_PUBLIC_HELIUS_API_KEY` for primary RPC
- [ ] Set `NEXT_PUBLIC_RPC_MODE=optimized`
- [ ] Enable webhooks with `NEXT_PUBLIC_USE_HELIUS_WEBHOOKS=true`
- [ ] Configure webhook endpoint on Helius dashboard
- [ ] Set appropriate cache TTLs for your use case
- [ ] Monitor RPC usage in Helius dashboard

