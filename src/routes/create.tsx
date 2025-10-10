import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { GameForm } from "@/components/GameForm";
import { ipfs } from "@/lib/file-storage/ipfs";
import { useState, Activity, useTransition } from "react";
import { useUser } from "@/providers/user.provider";
import { NftCollection } from "@/lib/blockchain/nft-collection";
import { toast } from "sonner";

export const Route = createFileRoute("/create")({
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
    from: "/create",
  });

  const { wallet } = useUser();
  const [collectionAddress, setCollectionAddress] = useState<string | undefined>(undefined);

  const [uploadTransition, startUploadTransition] = useTransition();
  const handleGameSubmit = async (values: any) => {
    startUploadTransition(async () => {
      if (!wallet) {
        return navigate({
          to: "/login"
        });
      }

      const imageFile = values.image[0] as File;
      const executableFile = values.executable[0] as File;

      const [imageResult, executableResult] = await Promise.all([
        ipfs.uploadFile(imageFile),
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
      toast("Game uploaded successfully!");
    });
  };

  if (!wallet) {
    return navigate({
      to: "/login",
    });
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-white">Create Game</h1>
        <p className="text-gray-400 mb-8">
          Upload your game and generate an NFT collection on Solana blockchain.
        </p>

        <Activity mode={collectionAddress ? "visible" : "hidden"}>
          <div className="mb-8 p-4 bg-gray-900 border border-gray-700 rounded-lg">
            <div>
              <h3 className="font-semibold mb-1 text-white">Collection Created</h3>
              <p className="text-sm text-gray-400">
                <span className="font-medium">Address:</span>{" "}
                <code className="bg-gray-800 px-2 py-1 rounded text-xs text-pink-400">
                  {collectionAddress}
                </code>
              </p>
            </div>
          </div>
        </Activity>

        <GameForm onSubmit={handleGameSubmit} isLoading={uploadTransition} />
      </div>
    </div>
  );
}
