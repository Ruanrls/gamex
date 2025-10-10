import { Wallet } from "@/lib/blockchain/wallet";
import { createContext, use, useState } from "react";

export type UserContext = {
  wallet?: Wallet;
  authenticate: (wallet: Wallet) => Promise<void>;
};

export const userContext = createContext<UserContext>({
  authenticate: () => Promise.resolve(undefined),
});

export function useUser() {
    return use(userContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);

  const authenticate = async (wallet: Wallet) => {
      // TODO: Better authentication handling
    console.debug("[UserProvider:authenticate] Authenticating user with: ", wallet.address);
    setWallet(wallet);
    console.debug("[UserProvider:authenticate] User authenticated");
  };


  
  return (
    <userContext.Provider
      value={{
        wallet,
        authenticate,
      }}
    >
      {children}
    </userContext.Provider>
  );
}
