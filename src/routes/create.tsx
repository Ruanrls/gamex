import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { GameForm } from "@/components/GameForm";
import { ipfs } from "@/lib/file-storage/ipfs";
import { useState, Activity, useTransition } from "react";
import { useUser } from "@/providers/user.provider";
import { GamePublishingService } from "@/lib/blockchain/services/game-publishing.service";
import { GameMetadataVO } from "@/lib/blockchain/domain/value-objects/game-metadata.vo";
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

type PublishResult = {
  collectionAddress: string;
  candyMachineAddress: string;
};

function RouteComponent() {
  const navigate = useNavigate({
    from: "/create",
  });

  const { wallet } = useUser();
  const [publishResult, setPublishResult] = useState<PublishResult | undefined>(undefined);

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

      const metadata = GameMetadataVO.create({
        name: values.name,
        description: values.description,
        image: ipfs.getGatewayUrl(imageResult.id),
        executable: ipfs.getGatewayUrl(executableResult.id),
      });

      const metadataResult = await ipfs.uploadJson(metadata.toJSON());
      const metadataUri = ipfs.getGatewayUrl(metadataResult.id);

      const publishingService = new GamePublishingService();
      const result = await publishingService.publishGame(wallet, metadata, metadataUri);

      setPublishResult({
        collectionAddress: result.collection.publicKey.toString(),
        candyMachineAddress: result.candyMachine.publicKey.toString(),
      });
      toast("Game uploaded and candy machine created successfully!");
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
          Upload your game and generate an NFT collection with Candy Machine on Solana blockchain.
        </p>

        <Activity mode={publishResult ? "visible" : "hidden"}>
          <div className="mb-8 p-4 bg-gray-900 border border-gray-700 rounded-lg space-y-3">
            <div>
              <h3 className="font-semibold mb-1 text-white">Game Published Successfully!</h3>
            </div>
            <div>
              <p className="text-sm text-gray-400">
                <span className="font-medium">Collection Address:</span>{" "}
                <code className="bg-gray-800 px-2 py-1 rounded text-xs text-pink-400 block mt-1">
                  {publishResult?.collectionAddress}
                </code>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">
                <span className="font-medium">Candy Machine Address:</span>{" "}
                <code className="bg-gray-800 px-2 py-1 rounded text-xs text-green-400 block mt-1">
                  {publishResult?.candyMachineAddress}
                </code>
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Users can mint this game by using the Candy Machine address.
            </p>
          </div>
        </Activity>

        <GameForm onSubmit={handleGameSubmit} isLoading={uploadTransition} />
      </div>
    </div>
  );
}
