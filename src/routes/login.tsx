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
                toast.error("Falha ao carregar carteira salva");
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
            toast.success("Carteira criada com sucesso!");
            navigate({ to: "/" });
        } catch (error) {
            console.error("[LoginRoute:generateWallet] Error generating wallet:", error);
            toast.error("Falha ao gerar carteira");
        } finally {
            setIsLoading(false);
        }
    }, [navigate, userCtx]);

    const importPrivateKey = useCallback(async () => {
        if (!privateKey.trim()) {
            toast.error("Por favor, insira uma chave privada");
            return;
        }

        try {
            setIsLoading(true);
            console.debug("[LoginRoute:importPrivateKey] Importing private key");
            const wallet = await Wallet.fromBase58(privateKey.trim());
            console.debug("[LoginRoute:importPrivateKey] Wallet imported:", wallet.address);
            await userCtx.authenticate(wallet);
            toast.success("Carteira importada com sucesso!");
            setIsImportDialogOpen(false);
            navigate({ to: "/" });
        } catch (error) {
            console.error("[LoginRoute:importPrivateKey] Error importing wallet:", error);
            toast.error("Falha ao importar carteira. Verifique sua chave privada.");
        } finally {
            setIsLoading(false);
        }
    }, [privateKey, navigate, userCtx]);

    // Show loading state while checking for stored keypair
    if (isCheckingStorage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center">
                    <p className="text-gray-400">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center space-y-6">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Bem-vindo ao GameX
                    </h1>
                    <p className="text-gray-400 mb-8">
                        Crie ou conecte sua carteira para começar
                    </p>
                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={generateWallet}
                            size="lg"
                            className="bg-pink-600 hover:bg-pink-700 text-white font-semibold"
                            disabled={isLoading}
                        >
                            {isLoading ? "Gerando..." : "Gerar Nova Carteira"}
                        </Button>
                        <Button
                            onClick={() => setIsImportDialogOpen(true)}
                            size="lg"
                            variant="outline"
                            className="border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white"
                            disabled={isLoading}
                        >
                            Importar Chave Privada
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent className="bg-gray-900 text-white border-gray-800">
                    <DialogHeader>
                        <DialogTitle>Importar Chave Privada</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Digite sua chave privada Solana no formato base58
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="privateKey">Chave Privada</Label>
                            <Textarea
                                id="privateKey"
                                placeholder="Digite sua chave privada base58..."
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
                            Cancelar
                        </Button>
                        <Button
                            onClick={importPrivateKey}
                            disabled={isLoading || !privateKey.trim()}
                            className="bg-pink-600 hover:bg-pink-700"
                        >
                            {isLoading ? "Importando..." : "Importar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}