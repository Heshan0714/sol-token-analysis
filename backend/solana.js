const {
  Connection,
  PublicKey,
} = require("@solana/web3.js");

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

/**
 * Fetch the SPL mint account and decode the fields we care about for risk analysis:
 * mintAuthority, freezeAuthority, supply, decimals.
 */
async function getMintInfo(mintAddress) {
  const mintPubkey = new PublicKey(mintAddress);
  const accountInfo = await connection.getParsedAccountInfo(mintPubkey);

  if (!accountInfo.value) {
    throw new Error("Mint account not found on-chain");
  }

  const parsed = accountInfo.value.data.parsed;
  if (!parsed || parsed.type !== "mint") {
    throw new Error("Address is not an SPL token mint");
  }

  const info = parsed.info;

  return {
    address: mintAddress,
    decimals: info.decimals,
    supply: info.supply,
    mintAuthority: info.mintAuthority || null,
    freezeAuthority: info.freezeAuthority || null,
    isInitialized: info.isInitialized,
  };
}

/**
 * Fetch the largest token holder accounts for a given mint.
 * Returns holder addresses with their raw + UI amount and % of total supply.
 */
async function getTopHolders(mintAddress, totalSupplyRaw, decimals) {
  const mintPubkey = new PublicKey(mintAddress);
  const largest = await connection.getTokenLargestAccounts(mintPubkey);

  const total = Number(totalSupplyRaw) || 1;

  const holders = largest.value.map((acc) => {
    const rawAmount = Number(acc.amount);
    return {
      address: acc.address.toBase58(),
      uiAmount: acc.uiAmount,
      rawAmount,
      percentOfSupply: total > 0 ? (rawAmount / total) * 100 : 0,
    };
  });

  holders.sort((a, b) => b.rawAmount - a.rawAmount);
  return holders;
}

/**
 * Compute concentration risk metrics from holder list.
 */
function computeConcentration(holders) {
  const top10 = holders.slice(0, 10);
  const top10Percent = top10.reduce((sum, h) => sum + h.percentOfSupply, 0);
  const top1Percent = holders.length > 0 ? holders[0].percentOfSupply : 0;

  return {
    top1HolderPercent: Number(top1Percent.toFixed(2)),
    top10HolderPercent: Number(top10Percent.toFixed(2)),
    holderSampleSize: holders.length,
  };
}

module.exports = {
  connection,
  getMintInfo,
  getTopHolders,
  computeConcentration,
};
