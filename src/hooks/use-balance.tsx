import { connectionManager } from "@/lib/blockchain/connection";
import { useUser } from "@/providers/user.provider";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
export function useBalance() {
  const userContext = useUser();

  const [state, setState] = useState({
    balance: 0,
    isLoading: true,
  });

  const getBalance = useCallback(
    async function () {
      setState((ctx) => ({
        balance: ctx.balance,
        isLoading: true,
      }));
      console.debug(
        "[useBalance:getBalance] getting user balance: ",
        userContext.wallet?.address
      );
      if (!userContext.wallet) {
        return;
      }

      try {
        const balance = await connectionManager.getConnection().getBalance(
          new PublicKey(userContext.wallet.address)
        );
        console.debug("[useBalance:getBalance] new user balance: ", balance);

        setState({
          balance,
          isLoading: false,
        });
      } catch (e) {
        console.error(e);
        setState({
          balance: 0,
          isLoading: false,
        });
      }
    },
    [setState, userContext]
  );

  async function refetch() {
    await getBalance();
  }

  useEffect(() => {
    getBalance();
  }, [getBalance]);

  return {
    data: state,
    refetch,
  };
}
