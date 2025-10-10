import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useUser } from "@/providers/user.provider";
import { useBalance } from "@/hooks/use-balance";
import { Coins } from "lucide-react";

export function Header() {
  const { wallet } = useUser();
  const { data } = useBalance();

  if (!wallet) {
    return null;
  }

  return (
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
              className="bg-pink-600 hover:bg-pink-700 text-white font-semibold"
              size="sm"
            >
              Deposit
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
