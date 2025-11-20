import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/providers/user.provider";
import { useBalanceQuery } from "@/hooks/queries/use-balance-query";
import { requestAirdrop } from "@/lib/blockchain/utils";
import connection from "@/lib/blockchain/connection";
import { Coins, RefreshCw, Copy, Check, Key, LogOut } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PrivateKeyDialog } from "./PrivateKeyDialog";

export function Header() {
  const { wallet, logout } = useUser();
  const navigate = useNavigate();
  const {
    data: balance,
    isLoading,
    refetch,
  } = useBalanceQuery({ walletAddress: wallet?.address });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [privateKeyDialogOpen, setPrivateKeyDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshTransition, startRefreshTransition] = useTransition();
  const [airdropTransition, startAirdropTransition] = useTransition();

  const handleRefresh = () => {
    startRefreshTransition(async () => {
      await refetch();
      toast.success("Balance refreshed!");
    });
  };

  const handleAirdrop = () => {
    startAirdropTransition(async () => {
      if (!wallet) return;

      try {
        await requestAirdrop({
          amount: 1,
          publicKey: wallet.address,
        });
        await refetch();
        toast.success("Airdrop successful! Received 1 SOL");
      } catch (error) {
        toast.error("Airdrop failed. Please try again.");
        console.error(error);
      }
    });
  };

  const handleCopyAddress = async () => {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate({ to: "/login" });
  };

  const isLocalhost =
    connection.rpcEndpoint.includes("localhost") ||
    connection.rpcEndpoint.includes("192.168");

  if (!wallet) {
    return null;
  }

  return (
    <>
      <header className="w-full bg-black border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Navigation */}
            <nav className="flex items-center gap-8">
              <Link
                to="/create"
                className="text-lg font-semibold text-gray-400 transition-colors hover:text-pink-500 [&.active]:text-pink-500 [&.active]:border-b-2 [&.active]:border-pink-500 pb-1"
                activeProps={{
                  className: "text-pink-500 border-b-2 border-pink-500",
                }}
              >
                Inicio
              </Link>
              <Link
                to="/marketplace"
                className="text-lg font-semibold text-gray-400 transition-colors hover:text-pink-500 [&.active]:text-pink-500 [&.active]:border-b-2 [&.active]:border-pink-500 pb-1"
                activeProps={{
                  className: "text-pink-500 border-b-2 border-pink-500",
                }}
              >
                Marketplace
              </Link>
              <Link
                to="/library"
                className="text-lg font-semibold text-gray-400 transition-colors hover:text-pink-500 [&.active]:text-pink-500 [&.active]:border-b-2 [&.active]:border-pink-500 pb-1"
                activeProps={{
                  className: "text-pink-500 border-b-2 border-pink-500",
                }}
              >
                Library
              </Link>
            </nav>

            {/* Right side - User info */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-4 hover:opacity-80 transition-opacity focus:outline-none">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {wallet.address?.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Balance */}
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">
                      {isLoading
                        ? "..."
                        : (
                            Math.floor(((balance || 0) / 1e9) * 100) / 100
                          ).toFixed(2)}
                    </span>
                    <Coins className="w-5 h-5 text-blue-400" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-gray-900 border-gray-700"
                align="end"
              >
                <DropdownMenuLabel className="text-gray-400">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-normal">Wallet</span>
                    <code className="text-xs text-pink-400 truncate">
                      {wallet.address?.slice(0, 8)}...
                      {wallet.address?.slice(-8)}
                    </code>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onClick={() => setDialogOpen(true)}
                  className="cursor-pointer text-white hover:bg-gray-800"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Deposit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPrivateKeyDialogOpen(true)}
                  className="cursor-pointer text-white hover:bg-gray-800"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Private Key
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Wallet Details
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage your wallet and balance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Wallet Address
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-xs text-pink-400 break-all">
                  {wallet.address}
                </code>
                <Button
                  onClick={handleCopyAddress}
                  variant="secondary"
                  size="icon"
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Balance */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Current Balance
              </label>
              <div className="bg-gray-800 px-4 py-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-blue-400" />
                  <span className="text-2xl font-bold text-white">
                    {isLoading
                      ? "..."
                      : (
                          Math.floor(((balance || 0) / 1e9) * 10000) / 10000
                        ).toFixed(4)}{" "}
                    SOL
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleRefresh}
                disabled={refreshTransition}
                variant="secondary"
                className="flex-1"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    refreshTransition ? "animate-spin" : ""
                  }`}
                />
                {refreshTransition ? "Refreshing..." : "Refresh Balance"}
              </Button>

              {isLocalhost && (
                <Button
                  onClick={handleAirdrop}
                  disabled={airdropTransition}
                  className="flex-1"
                >
                  {airdropTransition ? "Requesting..." : "Airdrop 1 SOL"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrivateKeyDialog
        open={privateKeyDialogOpen}
        onOpenChange={setPrivateKeyDialogOpen}
      />
    </>
  );
}
