# Solana Game

A decentralized gaming platform built on Solana blockchain with Next.js frontend.

## 🚀 Features

- **Multi-level Game System** - 16 levels with progressive pricing
- **Referral Program** - 3-tier referral system
- **Real-time Updates** - Optimized with Helius webhooks
- **Mobile-first Design** - Responsive UI for all devices
- **Multi-language Support** - 12 languages supported

## 📋 Prerequisites

- Node.js 18.17.0 or higher
- npm 9.0.0 or higher

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/solana-game.git
cd solana-game

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your values
```

## ⚙️ Environment Variables

Create a `.env.local` file with the following variables:

```env
# Required
NEXT_PUBLIC_PROGRAM_ID=your_program_id
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta

# Helius RPC (recommended for production)
NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=your_key
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key

# Optimization (optional)
NEXT_PUBLIC_RPC_MODE=optimized
NEXT_PUBLIC_USE_HELIUS_WEBHOOKS=true
```

See `ENV_CONFIG.md` for full configuration options.

## 🏃 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🚀 Deployment to Vercel

### Option 1: Deploy via GitHub

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Option 2: Deploy via CLI

```bash
npm i -g vercel
vercel --prod
```

### Required Vercel Environment Variables

Set these in your Vercel project settings:

- `NEXT_PUBLIC_PROGRAM_ID` - Your Solana program ID
- `NEXT_PUBLIC_SOLANA_CLUSTER` - `mainnet-beta` for production
- `NEXT_PUBLIC_SOLANA_RPC` - Your Helius RPC endpoint
- `NEXT_PUBLIC_HELIUS_API_KEY` - Helius API key (optional)

## 📁 Project Structure

```
solana-game/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes (webhooks)
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/
│   └── sdk/              # Solana SDK
│       ├── helius/       # Helius RPC optimization
│       ├── hooks/        # React hooks
│       └── history/      # Transaction history
├── messages/              # i18n translations
├── public/               # Static assets
└── docs/                 # Documentation
```

## 🔧 RPC Optimization

This project includes built-in Helius RPC optimization:

- **Caching** - LRU cache for all RPC responses
- **Batching** - Automatic request batching
- **Throttling** - Rate limiting with backoff
- **Fallback** - Auto-switch to public RPC on limits

See `docs/HELIUS_RPC_OPTIMIZATION.md` for details.

## 🔐 Security

- Never commit `.env.local` or wallet files
- Use environment variables for all secrets
- Wallets are excluded via `.gitignore`

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a PR.
