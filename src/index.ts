import * as Web3 from "@solana/web3.js";
import * as fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const PROGRAM_ID = new Web3.PublicKey(
  "ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa"
);
const PROGRAM_DATA_ADDRESS = new Web3.PublicKey(
  "Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod"
);

async function initializeKeypair(
  connection: Web3.Connection
): Promise<Web3.Keypair> {
  if (!process.env.PRIVATE_KEY) {
    console.log("Creating .env file...");
    const signer = Web3.Keypair.generate();
    fs.writeFileSync(".env", `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

    airdropSolIfNeeded(signer, connection);

    return signer;
  }

  const secret = JSON.parse(process.env.PRIVATE_KEY ?? "") as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecret = Web3.Keypair.fromSecretKey(secretKey);

  airdropSolIfNeeded(keypairFromSecret, connection);

  return keypairFromSecret;
}

async function main() {
  const connection = new Web3.Connection(Web3.clusterApiUrl("devnet"));
  const signer = await initializeKeypair(connection);
  console.log("Public key:", signer.publicKey.toBase58());

  await pingProgram(connection, signer);
}

async function airdropSolIfNeeded(
  signer: Web3.Keypair,
  connection: Web3.Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log("Current balance is", balance / Web3.LAMPORTS_PER_SOL);

  if (balance / Web3.LAMPORTS_PER_SOL < 1) {
    console.log("Airdropping 1 SOL...");
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      Web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log("New balance is", newBalance / Web3.LAMPORTS_PER_SOL);
  }
}

async function pingProgram(connection: Web3.Connection, payer: Web3.Keypair) {
  const transaction = new Web3.Transaction();

  const instruction = new Web3.TransactionInstruction({
    keys: [
      {
        pubkey: PROGRAM_DATA_ADDRESS,
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: PROGRAM_ID,
  });

  transaction.add(instruction);

  const transactionSignature = await Web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );

  console.log(
    `Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
