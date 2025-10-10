import { createFileRoute, redirect } from "@tanstack/react-router";
import { GameLauncher } from "@/components/GameLauncher";
import { useUser } from "@/providers/user.provider";

export const Route = createFileRoute("/library")({
  component: RouteComponent,
  beforeLoad(ctx) {
    if (!ctx.context.wallet) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

function RouteComponent() {
  const { wallet } = useUser();

  if (!wallet) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-white">Game Library</h1>
        <p className="text-gray-400 mb-8">
          Paste a collection PublicKey below to download and execute the game.
        </p>
        <GameLauncher />
      </div>
    </div>
  );
}
