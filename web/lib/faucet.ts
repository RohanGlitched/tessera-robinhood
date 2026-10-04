import type { Address } from "viem";

export type FaucetResult = {
  /** Human sentence describing what happened. */
  note: string;
  /** True when the wallet now holds test tokens, whether sent now or already there. */
  funded: boolean;
};

/**
 * Ask the project faucet to top up `address`. A wallet that already holds
 * enough counts as funded, so a returning visitor is never told "no".
 */
export async function requestTestTokens(address: Address): Promise<FaucetResult> {
  const r = await fetch("/api/faucet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    sent?: { what: string }[];
    skipped?: string[];
    error?: string;
  };
  if (r.status === 429) {
    return { funded: true, note: j.error ?? "This wallet already has test tokens." };
  }
  if (!r.ok) throw new Error(j.error ?? "The faucet did not answer.");
  const got = (j.sent ?? []).map((s) => s.what).join(", ");
  const out = j.skipped?.length ? ` The faucet is out of ${j.skipped.join(", ")} for now.` : "";
  return {
    funded: (j.sent ?? []).length > 0,
    note: got ? `Sent ${got}.${out}` : `Nothing to send.${out}`,
  };
}
