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
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold text-white mb-4">
                    Welcome to GameX
                </h1>
                <p className="text-gray-400 mb-8">
                    Create or connect your wallet to get started
                </p>
                <Button
                    onClick={generateWallet}
                    size="lg"
                    className="bg-pink-600 hover:bg-pink-700 text-white font-semibold"
                >
                    Generate Wallet
                </Button>
            </div>
        </div>
    )
}