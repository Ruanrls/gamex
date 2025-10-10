import { Button } from "@/components/ui/button"
import { Wallet } from "@/lib/blockchain/wallet"
import { userContext } from "@/providers/user.provider"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { use, useCallback } from "react"

export const Route = createFileRoute('/login')({
    component: LoginRoute,
    beforeLoad(ctx) {
      if(!!ctx.context.wallet) {
        throw redirect({
          to: '/',
        })
      }
    },
  })
  
export function LoginRoute() {
    const userCtx = use(userContext);
    const navigate = useNavigate({
        from: "/login"
    })

    const generateWallet = useCallback(async () => {
        console.debug("[LoginRoute:generateWallet] generating a new wallet")
        const wallet = Wallet.generate();
        console.debug("[LoginRoute:generateWallet] wallet generated: ", wallet.address);
        await userCtx.authenticate(wallet);
        navigate({
            to: "/"
        })
    }, [])

    return (
        <div>
            <Button onClick={generateWallet}>
                Generate wallet
            </Button>
        </div>
    )
}