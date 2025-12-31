// scripts/init_config_v3.js
// FINAL — ONE TIME USE

const fs = require("fs");
const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Transaction, TransactionInstruction } = anchor.web3;

// --------------------
// RPC
// --------------------
const RPC_URL = "https://api.devnet.solana.com";
const connection = new anchor.web3.Connection(RPC_URL, { commitment: "confirmed" });

// --------------------
// PAYER (DEPLOY WALLET)
// --------------------
const secretKey = JSON.parse(
  fs.readFileSync("wallets/mainnet-final/solana_game_mainnet.json", "utf8")
);
const payerKeypair = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(secretKey));
const wallet = new anchor.Wallet(payerKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

// --------------------
// PROGRAM (ON-CHAIN)
// --------------------
const PROGRAM_ID = new PublicKey(
  "59RpjSpKwP9EBWK7vRPH4A1nVSvHPhWvb3NHdaV1hW5u"
);

// --------------------
// 🔒 FINAL ADMIN / TREASURY (PHONE WALLETS)
// --------------------
const ADMIN = new PublicKey(
  "D5MW8wka77pTpGJNRKaJqWwArKHsc7QQUzMwhNQX9yYc"
);

const TREASURY = new PublicKey(
  "C9QtToybzKx1LnjpJkmEDsoKcs8PofhvB5P9YZJj4LQ9"
);

// --------------------
// PDA
// --------------------
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config_v3_new")],
  PROGRAM_ID
);
const [statsPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_stats_v1")],
  PROGRAM_ID
);

// --------------------
// DISCRIMINATOR
// --------------------
const DISCR = Buffer.from([154, 83, 28, 164, 86, 51, 12, 174]);

function u64(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

// --------------------
// DATA
// --------------------
const data = Buffer.concat([
  DISCR,
  ADMIN.toBuffer(),
  TREASURY.toBuffer(),
  Buffer.from([60, 13, 8, 5, 14]),
  u64(50_000_000),
  Buffer.from([2]),
  u32(0),
  Buffer.from([1]),
  Buffer.from([3]),
  Buffer.from([16]),
]);

// --------------------
// TX
// --------------------
(async () => {
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPda, isWritable: true, isSigner: false },
      { pubkey: statsPda, isWritable: true, isSigner: false },
      { pubkey: wallet.publicKey, isWritable: true, isSigner: true },
      { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  const sig = await provider.sendAndConfirm(tx);
  console.log("✅ Config initialized:", sig);
})();
