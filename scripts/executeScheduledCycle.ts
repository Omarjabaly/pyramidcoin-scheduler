import "dotenv/config";
import { ethers } from "ethers";

const EXPECTED_CHAIN_ID = 11155111; // Ethereum Sepolia

const ABI = [
  "function executeScheduledCycle() external",
];

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

async function main(): Promise<void> {
  const rpcUrl = requireEnvironmentVariable("SEPOLIA_RPC_URL");
  const privateKey = requireEnvironmentVariable("PRIVATE_KEY");
  const contractAddress = requireEnvironmentVariable(
    "PYRAMIDCOIN_ADDRESS"
  );

  if (!ethers.utils.isAddress(contractAddress)) {
    throw new Error(
      `Invalid PYRAMIDCOIN_ADDRESS: ${contractAddress}`
    );
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();

  console.log(`Connected chain ID: ${network.chainId}`);

  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(
      `Wrong network. Expected Sepolia ${EXPECTED_CHAIN_ID}, received ${network.chainId}`
    );
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const walletAddress = await wallet.getAddress();
  const balance = await wallet.getBalance();

  console.log(`Executor wallet: ${walletAddress}`);
  console.log(
    `Wallet balance: ${ethers.utils.formatEther(balance)} ETH`
  );
  console.log(`PyramidCoin contract: ${contractAddress}`);

  if (balance.isZero()) {
    throw new Error("Executor wallet has no Sepolia ETH for gas");
  }

  const contract = new ethers.Contract(
    contractAddress,
    ABI,
    wallet
  );

  console.log("Estimating transaction gas...");

  const estimatedGas =
    await contract.estimateGas.executeScheduledCycle();

  const gasLimit = estimatedGas.mul(120).div(100);

  console.log(`Estimated gas: ${estimatedGas.toString()}`);
  console.log(`Gas limit: ${gasLimit.toString()}`);
  console.log("Sending executeScheduledCycle()...");

  const transaction =
    await contract.executeScheduledCycle({
      gasLimit,
    });

  console.log(`Transaction hash: ${transaction.hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await transaction.wait(1);

  if (receipt.status !== 1) {
    throw new Error(
      `Transaction failed: ${transaction.hash}`
    );
  }

  console.log(`Confirmed in block: ${receipt.blockNumber}`);
  console.log("executeScheduledCycle() completed successfully.");
}

main().catch((error: unknown) => {
  console.error("Scheduled transaction failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
});