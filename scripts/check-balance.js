const { Connection, PublicKey } = require('@solana/web3.js');

// Адрес кошелька (можно передать как аргумент)
let walletAddress = process.argv[2];

// Если аргумент не передан, используем дефолтный адрес master funder
if (!walletAddress) {
  walletAddress = 'AzDDiKHcs4pzfpaaNcGUc3A6MqsbRbVADXDT9hGnA6ys';
} else {
  walletAddress = walletAddress.trim();
}

// Определяем cluster и RPC endpoint
const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet';
let rpcUrl;

if (process.env.NEXT_PUBLIC_SOLANA_RPC) {
  rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC.trim();
} else {
  switch (cluster) {
    case 'mainnet-beta':
      rpcUrl = 'https://api.mainnet-beta.solana.com';
      break;
    case 'testnet':
      rpcUrl = 'https://api.testnet.solana.com';
      break;
    default:
      rpcUrl = 'https://api.devnet.solana.com';
  }
}

async function checkBalance() {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const publicKey = new PublicKey(walletAddress);

    console.log('=== Wallet Balance Check ===');
    console.log('Address:', walletAddress);
    console.log('Cluster:', cluster);
    console.log('RPC URL:', rpcUrl);
    console.log('----------------------------');

    const balance = await connection.getBalance(publicKey);
    const balanceInSol = balance / 1e9;

    console.log('Balance:', balance.toLocaleString(), 'lamports');
    console.log('Balance:', balanceInSol.toFixed(9), 'SOL');
    console.log('============================');
  } catch (error) {
    console.error('Error checking balance:', error.message);
    if (error.message.includes('Invalid public key')) {
      console.error('Invalid wallet address provided');
    }
    process.exit(1);
  }
}

checkBalance();

