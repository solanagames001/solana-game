const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Адреса получателей
const recipients = [
  'Bmwz7rYpdtfN4Gg6PteUmmDTkosh29hB2vVBVxNf21Y9',
  '7EAWwp4GN3HwZjMe4h1MtoSB7mEK4BMHiojFn2GMESfe',
  'AnqU6Cmqb9uiXv1FLQLnMV3WkZ1DAQguV7EeWMGA75Vw',
  '2RbfW3ng1eeL2JWD8EzNMtiox1BrsN49oPoN8XJvK4N4',
  'EiSBHu4YfU3zJWScb25oDVn9f5nCHUhaFv6sPeLdAMS9',
  'B6ZQDaCkSRKzEFQrkP6Zus7k6bbXtnMZPcDVNroq3rjt',
  'BdQxHRxV5qLWUHqDQYdUhjwE5YjibFbKFdMyyG1he4yt',
  'BcD3xkeuTqWWfa9esfT5uxHQyNAXXgBxcC26ZebCN1aC',
  'cPBQimXXC3JSyRytHL9NpMzWqfE33vEtmvAbKJyHYno',
  'H7grikC5vevxTAtmBMJbAoEv9abnGdAd3qWazFyLfsFA',
];

// Количество SOL для отправки каждому получателю
const SOL_AMOUNT = 1.6;
const LAMPORTS_TO_SEND = SOL_AMOUNT * LAMPORTS_PER_SOL;

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

async function sendSolBatch() {
  try {
    console.log('=== Batch SOL Transfer ===');
    console.log('Cluster:', cluster);
    console.log('RPC URL:', rpcUrl);
    console.log('Amount per recipient:', SOL_AMOUNT, 'SOL');
    console.log('Total recipients:', recipients.length);
    console.log('Total SOL to send:', SOL_AMOUNT * recipients.length, 'SOL');
    console.log('----------------------------\n');

    // Загружаем приватный ключ отправителя
    const walletPath = path.join(__dirname, '../wallets/master_funder.json');
    const privateKeyArray = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const privateKey = new Uint8Array(privateKeyArray);
    const senderKeypair = Keypair.fromSecretKey(privateKey);
    const senderAddress = senderKeypair.publicKey.toBase58();

    console.log('Sender address:', senderAddress);

    // Подключаемся к сети
    const connection = new Connection(rpcUrl, 'confirmed');

    // Проверяем баланс отправителя
    const senderBalance = await connection.getBalance(senderKeypair.publicKey);
    const senderBalanceSol = senderBalance / LAMPORTS_PER_SOL;
    const totalNeeded = (LAMPORTS_TO_SEND * recipients.length) + (5000 * recipients.length); // + комиссии

    console.log('Sender balance:', senderBalanceSol.toFixed(9), 'SOL');
    console.log('Total needed (including fees):', (totalNeeded / LAMPORTS_PER_SOL).toFixed(9), 'SOL\n');

    if (senderBalance < totalNeeded) {
      console.error('❌ Insufficient balance!');
      console.error('Need:', (totalNeeded / LAMPORTS_PER_SOL).toFixed(9), 'SOL');
      console.error('Have:', senderBalanceSol.toFixed(9), 'SOL');
      process.exit(1);
    }

    // Отправляем SOL каждому получателю
    const results = [];
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const recipientPubkey = new PublicKey(recipient);

      try {
        console.log(`[${i + 1}/${recipients.length}] Sending ${SOL_AMOUNT} SOL to ${recipient}...`);

        // Создаем транзакцию
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: recipientPubkey,
            lamports: LAMPORTS_TO_SEND,
          })
        );

        // Получаем последний блокчейн хэш
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderKeypair.publicKey;

        // Подписываем и отправляем транзакцию
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [senderKeypair],
          {
            commitment: 'confirmed',
            maxRetries: 3,
          }
        );

        const explorerUrl = cluster === 'mainnet-beta' 
          ? `https://explorer.solana.com/tx/${signature}`
          : `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;

        console.log(`✅ Success! Signature: ${signature}`);
        console.log(`   Explorer: ${explorerUrl}\n`);

        results.push({
          recipient,
          success: true,
          signature,
          explorerUrl,
        });

        // Небольшая задержка между транзакциями
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ Failed to send to ${recipient}:`, error.message);
        results.push({
          recipient,
          success: false,
          error: error.message,
        });
      }
    }

    // Итоговая статистика
    console.log('\n=== Transfer Summary ===');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Successful: ${successful}/${recipients.length}`);
    console.log(`Failed: ${failed}/${recipients.length}`);

    if (failed > 0) {
      console.log('\nFailed transfers:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.recipient}: ${r.error}`);
      });
    }

    // Проверяем финальный баланс отправителя
    const finalBalance = await connection.getBalance(senderKeypair.publicKey);
    const finalBalanceSol = finalBalance / LAMPORTS_PER_SOL;
    console.log(`\nFinal sender balance: ${finalBalanceSol.toFixed(9)} SOL`);
    console.log('============================');
  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Запускаем скрипт
sendSolBatch();

