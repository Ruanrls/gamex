import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Wallet } from "@/lib/blockchain/wallet"
import { userContext } from "@/providers/user.provider"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { use, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

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

    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [privateKey, setPrivateKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingStorage, setIsCheckingStorage] = useState(true);

    // Check for existing keypair on mount
    useEffect(() => {
        const checkExistingKeypair = async () => {
            try {
                console.debug("[LoginRoute] Checking for existing keypair...");
                const wallet = await Wallet.loadFromStorage();

                if (wallet) {
                    console.debug("[LoginRoute] Found existing keypair, auto-authenticating...");
                    await userCtx.authenticate(wallet);
                    navigate({ to: "/" });
                } else {
                    console.debug("[LoginRoute] No existing keypair found");
                }
            } catch (error) {
                console.error("[LoginRoute] Error checking for existing keypair:", error);
                toast.error("Failed to load saved wallet");
            } finally {
                setIsCheckingStorage(false);
            }
        };

        checkExistingKeypair();
    }, []);

    const generateWallet = useCallback(async () => {
        try {
            setIsLoading(true);
            console.debug("[LoginRoute:generateWallet] Generating a new wallet");
            const wallet = await Wallet.generate();
            console.debug("[LoginRoute:generateWallet] Wallet generated:", wallet.address);
            await userCtx.authenticate(wallet);
            toast.success("Wallet created successfully!");
            navigate({ to: "/" });
        } catch (error) {
            console.error("[LoginRoute:generateWallet] Error generating wallet:", error);
            toast.error("Failed to generate wallet");
        } finally {
            setIsLoading(false);
        }
    }, [navigate, userCtx]);

    const importPrivateKey = useCallback(async () => {
        if (!privateKey.trim()) {
            toast.error("Please enter a private key");
            return;
        }

        try {
            setIsLoading(true);
            console.debug("[LoginRoute:importPrivateKey] Importing private key");
            const wallet = await Wallet.fromBase58(privateKey.trim());
            console.debug("[LoginRoute:importPrivateKey] Wallet imported:", wallet.address);
            await userCtx.authenticate(wallet);
            toast.success("Wallet imported successfully!");
            setIsImportDialogOpen(false);
            navigate({ to: "/" });
        } catch (error) {
            console.error("[LoginRoute:importPrivateKey] Error importing wallet:", error);
            toast.error("Failed to import wallet. Please check your private key.");
        } finally {
            setIsLoading(false);
        }
    }, [privateKey, navigate, userCtx]);

    // Show loading state while checking for stored keypair
    if (isCheckingStorage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center">
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center space-y-6">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Welcome to GameX
                    </h1>
                    <p className="text-gray-400 mb-8">
                        Create or connect your wallet to get started
                    </p>
                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={generateWallet}
                            size="lg"
                            className="bg-pink-600 hover:bg-pink-700 text-white font-semibold"
                            disabled={isLoading}
                        >
                            {isLoading ? "Generating..." : "Generate New Wallet"}
                        </Button>
                        <Button
                            onClick={() => setIsImportDialogOpen(true)}
                            size="lg"
                            variant="outline"
                            className="border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white"
                            disabled={isLoading}
                        >
                            Import Private Key
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="bg-gray-900 text-white border-gray-800">
                    <DialogHeader>
                        <DialogTitle>Import Private Key</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Enter your Solana private key in base58 format
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="privateKey">Private Key</Label>
                            <Textarea
                                id="privateKey"
                                placeholder="Enter your base58 private key..."
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                className="mt-2 bg-gray-800 border-gray-700 text-white"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsImportDialogOpen(false)}
                            disabled={isLoading}
                            className="border-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={importPrivateKey}
                            disabled={isLoading || !privateKey.trim()}
                            className="bg-pink-600 hover:bg-pink-700"
                        >
                            {isLoading ? "Importing..." : "Import"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}