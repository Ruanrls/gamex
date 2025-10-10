import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { GameForm } from "@/components/GameForm";
import { GameLauncher } from "@/components/GameLauncher";
import { ipfs } from "@/lib/file-storage/ipfs";
import { useState, Activity, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/providers/user.provider";
import { useBalance } from "@/hooks/use-balance";
import { requestAirdrop } from "@/lib/blockchain/utils";
import connection from "@/lib/blockchain/connection";
import { NftCollection } from "@/lib/blockchain/nft-collection";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
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

type GameMetadata = {
  name: string;
  description: string;
  image: string;
  executable: string;
};

function RouteComponent() {
  const navigate = useNavigate({
    from: "/",
  });

  const { wallet } = useUser();
  const {
    data,
    refetch: refetchBalance,
  } = useBalance();

  const [collectionAddress, setCollectionAddress] = useState<string | undefined>(undefined)

  const [uploadTransition, startUploadTransition] = useTransition()
  const handleGameSubmit = async (values: any) => {
    startUploadTransition(async () => {
      if(!wallet) {
        return navigate({
          to: "/login"
        })
      }
      
      const imageFile = values.image[0] as File;
      const executableFile = values.executable[0] as File;

      const [imageResult, executableResult] = await Promise.all([ipfs.uploadFile(imageFile), 
        ipfs.uploadFile(executableFile)
      ]);

      const metadata: GameMetadata = {
        name: values.name,
        description: values.description,
        image: ipfs.getGatewayUrl(imageResult.id),
        executable: ipfs.getGatewayUrl(executableResult.id),
      };

      const metadataResult = await ipfs.uploadJson(metadata);
      const collection = await NftCollection.create(wallet, {
        name: metadata.name,
        uri: ipfs.getGatewayUrl(metadataResult.id)
      });

      setCollectionAddress(collection.collection.publicKey);
      toast("Game uploaded")
    })
  };

  const [airdropTransition, startAirdropTransition] = useTransition();
  const handleAirdrop = async () => {
    startAirdropTransition(async () => {
      if (!wallet) {
        return;
      }
      
      alert("Requesting 1 SOL airdrop");
      await requestAirdrop({
        amount: 1,
        publicKey: wallet?.address,
      });
      await refetchBalance();
      
      alert("Airdrop successful! Received 1 SOL");
   
  })
  }

   
  if (!wallet) {
    return navigate({
      to: "/login",
    });
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">
        GameX - Decentralized Game Platform
      </h1>

      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-x-2 items-center">
            <h3 className="font-semibold mb-2">Solana Wallet</h3>
            <p className="text-sm mb-1">
              <span className="font-medium">Address:</span>{" "}
              <code className="bg-white px-2 py-1 rounded text-xs">
                {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-8)}
              </code>
              <span>
                Balance:{" "}
                {data.isLoading ? (
                  <strong>loading...</strong>
                ) : (
                  <strong>{data.balance / 1e9} SOL</strong>
                )}
              </span>
            </p>

            <Activity
              mode={
                connection.rpcEndpoint.includes("localhost")
                  ? "visible"
                  : "hidden"
              }
            >
              <Button onClick={handleAirdrop}>{airdropTransition ? "Aidropping..." : "Airdrop"}</Button>
            </Activity>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Network & Collection</h3>
            <div className="space-y-2">
              <Activity mode={collectionAddress ? "visible" : "hidden"}>
                <p className="text-sm">
                  <span className="font-medium">Collection:</span>{" "}
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {collectionAddress?.slice(0, 8)}...
                  </code>
                </p>
              </Activity>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Upload Game</h2>
          <GameForm onSubmit={handleGameSubmit} isLoading={uploadTransition} />
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Play Game</h2>
          <GameLauncher />
        </div>
      </div>
    </div>
  );
}
