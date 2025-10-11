import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/providers/user.provider";
import { useBalance } from "@/hooks/use-balance";
import { requestAirdrop } from "@/lib/blockchain/utils";
import connection from "@/lib/blockchain/connection";
import { Coins, RefreshCw, Copy, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function Header() {
  const { wallet } = useUser();
  const { data, refetch } = useBalance();
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const isLocalhost = connection.rpcEndpoint.includes("localhost");

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
                  className: "text-pink-500 border-b-2 border-pink-500"
                }}
              >
                Inicio
              </Link>
              <Link
                to="/library"
                className="text-lg font-semibold text-gray-400 transition-colors hover:text-pink-500 [&.active]:text-pink-500 [&.active]:border-b-2 [&.active]:border-pink-500 pb-1"
                activeProps={{
                  className: "text-pink-500 border-b-2 border-pink-500"
                }}
              >
                Library
              </Link>
            </nav>

            {/* Right side - User info */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {wallet.address?.slice(0, 2).toUpperCase()}
                </span>
              </div>

              {/* Balance */}
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">
                  {data.isLoading ? "..." : (data.balance / 1e9).toFixed(2)}
                </span>
                <Coins className="w-5 h-5 text-blue-400" />
              </div>

              {/* Deposit Button */}
              <Button
                onClick={() => setDialogOpen(true)}
                size="sm"
              >
                Deposit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Wallet Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Manage your wallet and balance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Wallet Address</label>
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
              <label className="text-sm font-medium text-gray-300">Current Balance</label>
              <div className="bg-gray-800 px-4 py-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-blue-400" />
                  <span className="text-2xl font-bold text-white">
                    {data.isLoading ? "..." : (data.balance / 1e9).toFixed(4)} SOL
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
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshTransition ? "animate-spin" : ""}`} />
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
    </>
  );
}
