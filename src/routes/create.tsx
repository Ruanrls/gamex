import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { GameForm } from "@/components/GameForm";
import { ipfs } from "@/lib/file-storage/ipfs";
import { useState, Activity, useTransition } from "react";
import { useUser } from "@/providers/user.provider";
import { GamePublishingService } from "@/lib/blockchain/services/game-publishing.service";
import { GameMetadataVO } from "@/lib/blockchain/domain/value-objects/game-metadata.vo";
import { toast } from "sonner";
import { useRegisterGameMutation } from "@/hooks/mutations/use-register-game-mutation";
import { solToLamports } from "@/lib/blockchain/utils/currency";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  const [publishResult, setPublishResult] = useState<PublishResult | undefined>(
    undefined
  );
  const registerGameMutation = useRegisterGameMutation();

  const [uploadTransition, startUploadTransition] = useTransition();
  const handleGameSubmit = async (values: any) => {
    startUploadTransition(async () => {
      if (!wallet) {
        return navigate({
          to: "/login",
        });
      }

      const imageFile = values.image[0] as File;
      const binaries = values.binaries;

      // Upload image and all executables in parallel
      const imageUpload = ipfs.uploadFile(imageFile);
      const executableUploads = binaries.map((binary: any) =>
        ipfs.uploadFile(binary.file)
      );

      const [imageResult, ...executableResults] = await Promise.all([
        imageUpload,
        ...executableUploads,
      ]);

      // Build executables array
      const executables = binaries.map((binary: any, index: number) => ({
        platform: binary.targetTriple,
        url: ipfs.getGatewayUrl(executableResults[index].id),
      }));

      const metadata = GameMetadataVO.create({
        name: values.name,
        description: values.description,
        image: ipfs.getGatewayUrl(imageResult.id, "https://ipfs.io"),
        categories: values.categories,
        executables,
      });

      const metadataResult = await ipfs.uploadJson(metadata.toJSON());

      // Pin all uploaded files to ensure they remain available from publisher's node
      const cidsToPin = [
        imageResult.id,
        ...executableResults.map((result) => result.id),
        metadataResult.id,
      ];
      await ipfs.pinMultipleFiles(cidsToPin);

      const metadataUri = ipfs.getGatewayUrl(metadataResult.id, "https://ipfs.io");

      // Convert price from SOL to lamports
      const priceLamports = solToLamports(values.price);
      console.log("[CREATE] Price conversion:", {
        priceInSOL: values.price,
        priceLamports: priceLamports.toString(),
        priceAsNumber: Number(priceLamports),
      });

      const publishingService = new GamePublishingService();
      const result = await publishingService.publishGame(
        wallet,
        metadata,
        metadataUri,
        priceLamports
      );

      // Register game in database for marketplace indexing
      const gameData = {
        collection_address: result.collection.publicKey.toString(),
        candy_machine_address: result.candyMachine.publicKey.toString(),
        name: values.name,
        description: values.description,
        image_url: metadata.image,
        categories: metadata.categories,
        executables: metadata.executables,
        creator: wallet.address,
        metadata_uri: metadataUri,
        price_lamports: Number(priceLamports),
      };
      console.log("[CREATE] Sending game data to API:", gameData);

      registerGameMutation.mutate(gameData, {
        onSuccess: () => {
          console.log("Game successfully registered in marketplace database");
        },
        onError: (error) => {
          console.error("Failed to register game in database:", error);
          toast.error(
            "Jogo criado na blockchain mas falhou ao indexar no banco de dados. Por favor, contate o suporte."
          );
        },
      });

      setPublishResult({
        collectionAddress: result.collection.publicKey.toString(),
        candyMachineAddress: result.candyMachine.publicKey.toString(),
      });
      toast("Jogo enviado e candy machine criada com sucesso!");
    });
  };

  if (!wallet) {
    return navigate({
      to: "/login",
    });
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Criar Jogo</h1>
            <p className="text-gray-400 mt-2">
              Envie seu jogo e gere uma coleção NFT com Candy Machine na blockchain
              Solana.
            </p>
          </div>
          <Button type="submit" form="game-form" disabled={uploadTransition}>
            {uploadTransition && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploadTransition ? "Enviando para IPFS..." : "Publicar Jogo"}
          </Button>
        </div>
        <div className="mb-8" />

        <Activity mode={publishResult ? "visible" : "hidden"}>
          <div className="mb-8 p-4 bg-gray-900 border border-gray-700 rounded-lg space-y-3">
            <div>
              <h3 className="font-semibold mb-1 text-white">
                Jogo Publicado com Sucesso!
              </h3>
            </div>
            <div>
              <p className="text-sm text-gray-400">
                <span className="font-medium">Endereço da Coleção:</span>{" "}
                <code className="bg-gray-800 px-2 py-1 rounded text-xs text-pink-400 block mt-1">
                  {publishResult?.collectionAddress}
                </code>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">
                <span className="font-medium">Endereço da Candy Machine:</span>{" "}
                <code className="bg-gray-800 px-2 py-1 rounded text-xs text-green-400 block mt-1">
                  {publishResult?.candyMachineAddress}
                </code>
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Os usuários podem adquirir este jogo usando o endereço da Candy
              Machine.
            </p>
          </div>
        </Activity>

        <GameForm onSubmit={handleGameSubmit} />
      </div>
    </div>
  );
}
