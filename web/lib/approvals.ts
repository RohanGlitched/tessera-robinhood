import { erc20Abi, maxUint256, type Address, type Abi } from "viem";
import { publicClient } from "./chain";

type Write = (a: { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }) => Promise<`0x${string}`>;

/**
 * Approve `spender` for each token where the current allowance falls short.
 * Returns how many approvals were sent, and reports progress for the UI.
 */
export async function ensureAllowances(
  write: Write,
  owner: Address,
  spender: Address,
  needs: { token: Address; amount: bigint; label: string }[],
  onStep: (label: string) => void,
) {
  const current = await publicClient.multicall({
    allowFailure: false,
    contracts: needs.map((n) => ({
      address: n.token,
      abi: erc20Abi,
      functionName: "allowance" as const,
      args: [owner, spender] as const,
    })),
  });
  let sent = 0;
  for (let i = 0; i < needs.length; i++) {
    if (current[i] >= needs[i].amount) continue;
    onStep(`Approving ${needs[i].label}`);
    await write({ address: needs[i].token, abi: erc20Abi as Abi, functionName: "approve", args: [spender, maxUint256] });
    sent++;
  }
  return sent;
}
