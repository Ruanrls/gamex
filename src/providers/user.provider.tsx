import { Wallet } from "@/lib/blockchain/wallet";
import { KeypairStorageService } from "@/lib/blockchain/services/keypair-storage.service";
import { createContext, use, useState } from "react";

export type UserContext = {
  wallet?: Wallet;
  authenticate: (wallet: Wallet) => Promise<void>;
  logout: () => Promise<void>;
};

export const userContext = createContext<UserContext>({
  authenticate: () => Promise.resolve(undefined),
  logout: () => Promise.resolve(),
});

export function useUser() {
    return use(userContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);
  const storageService = new KeypairStorageService();

  const authenticate = async (wallet: Wallet) => {
    console.debug("[UserProvider:authenticate] Authenticating user with: ", wallet.address);
    setWallet(wallet);
    console.debug("[UserProvider:authenticate] User authenticated");
  };

  const logout = async () => {
    try {
      console.debug("[UserProvider:logout] Logging out user");
      await storageService.deleteKeypair();
      setWallet(undefined);
      console.debug("[UserProvider:logout] User logged out and keypair deleted");
    } catch (error) {
      console.error("[UserProvider:logout] Error during logout:", error);
      // Still clear the wallet state even if deletion fails
      setWallet(undefined);
    }
  };


  return (
    <userContext.Provider
      value={{
        wallet,
        authenticate,
        logout,
      }}
    >
      {children}
    </userContext.Provider>
  );
}
