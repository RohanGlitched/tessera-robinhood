"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  createWalletClient,
  custom,
  http,
  parseEther,
  type Abi,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { publicClient, robinhoodTestnet } from "@/lib/chain";
import { requestTestTokens } from "@/lib/faucet";

type Mode = "injected" | "test";

type WalletState = {
  address: Address | null;
  mode: Mode | null;
  /** Bumps after every confirmed transaction so balances can refetch. */
  nonce: number;
  connecting: boolean;
  error: string | null;
  connectBrowserWallet: () => Promise<void>;
  useTestWallet: () => void;
  disconnect: () => void;
  write: (args: {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<Hash>;
  refresh: () => void;
};

const Ctx = createContext<WalletState | null>(null);
const TEST_KEY = "tessera-rh-test-wallet";
const MODE_KEY = "tessera-rh-wallet-mode";

declare global {
  interface Window {
    ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const store = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage blocked: the session still works, it just will not persist */
  }
};

async function ensureChain() {
  const eth = window.ethereum!;
  const hex = `0x${robinhoodTestnet.id.toString(16)}`;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hex,
          chainName: robinhoodTestnet.name,
          nativeCurrency: robinhoodTestnet.nativeCurrency,
          rpcUrls: robinhoodTestnet.rpcUrls.default.http,
          blockExplorerUrls: [robinhoodTestnet.blockExplorers.default.url],
        },
      ],
    });
  }
}

/** Turn a viem error into one sentence a person can act on. */
export function explain(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? "";
      const map: Record<string, string> = {
        WeightsMustSumToOne: "Weights must add up to exactly 100%.",
        SymbolTaken: "You already have a basket with this symbol. Pick another.",
        BadName: "Name must be 1 to 32 characters.",
        BadSymbol: "Symbol must be 1 to 10 characters.",
        ZeroShares: "Enter an amount above zero.",
        DustMint: "That amount is too small to back with every component.",
        ERC20InsufficientBalance: "You don't hold enough of one of the components.",
        ERC20InsufficientAllowance: "Approval is missing for one of the components.",
        Expired: "This order has expired.",
        NotOpen: "This order is no longer open.",
        NotBuyer: "Only the buyer can cancel before the order expires.",
      };
      if (map[name]) return map[name];
      if (name) return `The contract refused: ${name}.`;
    }
    if (/User rejected|denied/i.test(e.message)) return "You cancelled the request in your wallet.";
    if (/insufficient funds|enough funds/i.test(`${e.message} ${e.details ?? ""}`))
      return "This wallet needs a little test ETH for gas. Use Get test tokens.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<WalletClient | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [nonce, setNonce] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTest = useCallback(() => {
    let pk = read(TEST_KEY) as `0x${string}` | null;
    if (!pk) {
      pk = generatePrivateKey();
      store(TEST_KEY, pk);
    }
    const account = privateKeyToAccount(pk);
    setClient(createWalletClient({ account, chain: robinhoodTestnet, transport: http() }));
    setAddress(account.address);
    setMode("test");
    store(MODE_KEY, "test");
    setError(null);
  }, []);

  const connectBrowserWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("No browser wallet found. Install one, or use a test wallet instead.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const [account] = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as Address[];
      await ensureChain();
      setClient(
        createWalletClient({ account, chain: robinhoodTestnet, transport: custom(window.ethereum) }),
      );
      setAddress(account);
      setMode("injected");
      store(MODE_KEY, "injected");
    } catch (e) {
      setError(explain(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setClient(null);
    setAddress(null);
    setMode(null);
    store(MODE_KEY, null);
  }, []);

  // Restore the last session without prompting.
  useEffect(() => {
    const last = read(MODE_KEY);
    if (last === "test") startTest();
    else if (last === "injected" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accs) => {
          const [account] = accs as Address[];
          if (!account) return;
          setClient(
            createWalletClient({ account, chain: robinhoodTestnet, transport: custom(window.ethereum!) }),
          );
          setAddress(account);
          setMode("injected");
        })
        .catch(() => {});
    }
  }, [startTest]);

  const write = useCallback<WalletState["write"]>(
    async ({ address: to, abi, functionName, args }) => {
      if (!client || !address) throw new Error("Connect a wallet first.");
      if (mode === "injected") await ensureChain();
      if (mode === "test") {
        // A fresh test wallet has no gas. Top it up from the faucet rather
        // than fail the first thing a visitor tries.
        const gas = await publicClient.getBalance({ address }).catch(() => null);
        if (gas !== null && gas < parseEther("0.00005")) await requestTestTokens(address).catch(() => {});
      }
      const { request } = await publicClient.simulateContract({
        account: address,
        address: to,
        abi,
        functionName,
        args,
      } as never);
      const hash = await client.writeContract({ ...(request as object), account: client.account!, chain: robinhoodTestnet } as never);
      await publicClient.waitForTransactionReceipt({ hash });
      setNonce((n) => n + 1);
      // Read replicas behind the public RPC can lag the receipt by a block; read once more.
      setTimeout(() => setNonce((n) => n + 1), 3000);
      return hash;
    },
    [client, address, mode],
  );

  const value = useMemo<WalletState>(
    () => ({
      address,
      mode,
      nonce,
      connecting,
      error,
      connectBrowserWallet,
      useTestWallet: startTest,
      disconnect,
      write,
      refresh: () => setNonce((n) => n + 1),
    }),
    [address, mode, nonce, connecting, error, connectBrowserWallet, startTest, disconnect, write],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
