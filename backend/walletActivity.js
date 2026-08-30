const { PublicKey } = require("@solana/web3.js");
const { connection } = require("./solana");

/**
 * Fetch a recent transaction timeline for a wallet address. Returns a
 * lightweight summary per transaction (signature, timestamp, status,
 * fee, top-level instruction program ids) — enough to spot patterns
 * (bot-like frequency, interaction with known DEX/scam programs) without
 * pulling full parsed instruction data for every transaction.
 */
async function getWalletActivity(address, limit = 25) {
  const pubkey = new PublicKey(address);

  const signatures = await connection.getSignaturesForAddress(pubkey, { limit });

  const transactions = await Promise.all(
    signatures.map(async (sigInfo) => {
      try {
        const tx = await connection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });

        const programIds =
          tx?.transaction?.message?.instructions?.map((ix) => ix.programId?.toBase58()) || [];

        return {
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime,
          status: sigInfo.err ? "failed" : "success",
          fee: tx?.meta?.fee ?? null,
          programIds: [...new Set(programIds)],
        };
      } catch {
        return {
          signature: sigInfo.signature,
          blockTime: sigInfo.blockTime,
          status: sigInfo.err ? "failed" : "success",
          fee: null,
          programIds: [],
        };
      }
    })
  );

  return transactions;
}

module.exports = { getWalletActivity };
