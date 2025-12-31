const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Путь к файлу с приватным ключом
const walletPath = path.join(__dirname, '../wallets/master_funder.json');

// Читаем файл
const privateKeyArray = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

// Преобразуем массив чисел в Uint8Array
const privateKey = new Uint8Array(privateKeyArray);

// Создаем Keypair из приватного ключа
const keypair = Keypair.fromSecretKey(privateKey);

// Получаем публичный адрес
const publicKey = keypair.publicKey;

console.log('=== Master Funder Wallet Address ===');
console.log('Public Address:', publicKey.toBase58());
console.log('=====================================');