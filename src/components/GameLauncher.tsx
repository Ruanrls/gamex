import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { ipfs } from "@/lib/file-storage/ipfs"
import { GameMintingService } from "@/lib/blockchain/services/game-minting.service"
import { CollectionRepository } from "@/lib/blockchain/domain/repositories/collection.repository"
import { AssetOwnershipService } from "@/lib/blockchain/services/asset-ownership.service"
import { useUser } from "@/providers/user.provider"
import { invoke } from "@tauri-apps/api/core"
import { appDataDir } from "@tauri-apps/api/path"
import { join } from "@tauri-apps/api/path"
import { exists, mkdir, writeFile, readTextFile } from "@tauri-apps/plugin-fs"

type GameMetadata = {
  name: string
  description: string
  image: string
  executable: string
}

type DownloadState = {
  isDownloading: boolean
  progress: number
  isDownloaded: boolean
}

export function GameLauncher() {
  const { wallet } = useUser()
  const [candyMachinePublicKey, setCandyMachinePublicKey] = useState("")
  const [metadata, setMetadata] = useState<GameMetadata | null>(null)
  const [assetPublicKey, setAssetPublicKey] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
    isDownloaded: false,
  })
  const [isLaunching, setIsLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractCidFromUrl = (input: string): string => {
    // Extract CID from IPFS URLs or return as-is if it's already a CID
    const patterns = [
      /ipfs\/([a-zA-Z0-9]+)/,
      /^(Qm[a-zA-Z0-9]{44}|bafybei[a-z2-7]{52}|bafy[a-z2-7]+)$/,
      /([a-zA-Z0-9]+)\.ipfs/,
    ]

    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        return match[1] || match[0]
      }
    }

    return input.trim()
  }

  const getLocalImageUrl = (imageUrl: string): string => {
    // Extract CID and use gateway on port 8080
    const cid = extractCidFromUrl(imageUrl)
    return `http://127.0.0.1:8080/ipfs/${cid}`
  }

  const handleFetchMetadata = async () => {
    try {
      setError(null)
      setIsFetching(true)
      setMetadata(null)
      setDownloadState({ isDownloading: false, progress: 0, isDownloaded: false })

      console.log("Fetching candy machine info for PublicKey:", candyMachinePublicKey)

      const mintingService = new GameMintingService()
      const candyMachine = await mintingService.getCandyMachineInfo(candyMachinePublicKey)

      console.log("Candy machine fetched:", candyMachine)

      // Fetch collection metadata to display game info
      const collectionRepository = new CollectionRepository()
      const collection = await collectionRepository.findByPublicKey(
        candyMachine.collection.toString()
      )

      console.log("Game metadata:", collection.metadata)
      setMetadata(collection.metadata.toJSON())

      // Check if game is already downloaded and load cached asset public key
      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, candyMachinePublicKey)
      const executablePath = await join(gameDir, "game.exe")
      const metadataPath = await join(gameDir, "metadata.json")

      const isDownloaded = await exists(executablePath)

      // Load cached asset public key if available
      if (isDownloaded && (await exists(metadataPath))) {
        try {
          const cachedMetadataText = await readTextFile(metadataPath)
          const cachedMetadata = JSON.parse(cachedMetadataText)
          if (cachedMetadata.assetPublicKey) {
            setAssetPublicKey(cachedMetadata.assetPublicKey)
            console.log("Loaded cached asset public key:", cachedMetadata.assetPublicKey)
          }
        } catch (err) {
          console.warn("Failed to load cached asset public key:", err)
        }
      }

      setDownloadState({ isDownloading: false, progress: 100, isDownloaded })
    } catch (err) {
      console.error("Failed to fetch metadata:", err)
      setError(`Failed to fetch metadata: ${err}`)
    } finally {
      setIsFetching(false)
    }
  }

  const handleMintGame = async () => {
    if (!wallet) {
      setError("Wallet not connected")
      return
    }

    try {
      setError(null)
      setIsMinting(true)

      console.log("Minting game from candy machine:", candyMachinePublicKey)

      const mintingService = new GameMintingService()
      const result = await mintingService.mintFromCandyMachine(
        candyMachinePublicKey,
        wallet
      )

      const mintedAssetPublicKey = result.asset.publicKey.toString()
      console.log("Game minted successfully:", mintedAssetPublicKey)

      // Store the asset public key
      setAssetPublicKey(mintedAssetPublicKey)

      // Automatically start download after minting
      await handleDownloadGame(mintedAssetPublicKey)
    } catch (err) {
      console.error("Failed to mint game:", err)
      setError(`Failed to mint game: ${err}`)
    } finally {
      setIsMinting(false)
    }
  }

  const handleDownloadGame = async (mintedAssetPublicKey: string) => {
    if (!metadata) return

    try {
      setError(null)
      setDownloadState({ isDownloading: true, progress: 0, isDownloaded: false })

      // Extract executable CID from metadata
      const executableUrl = metadata.executable
      const executableCid = extractCidFromUrl(executableUrl)
      console.log("Downloading executable CID:", executableCid)

      // Download the file from IPFS
      const blob = await ipfs.downloadFile(executableCid, (loaded, total) => {
        const progress = total > 0 ? Math.round((loaded / total) * 100) : 0
        setDownloadState((prev) => ({ ...prev, progress }))
      })

      console.log("Download complete, saving to disk...")

      // Save to AppData/games/{candyMachinePublicKey}/
      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, candyMachinePublicKey)

      // Create directories if they don't exist
      if (!(await exists(gamesDir))) {
        await mkdir(gamesDir)
      }
      if (!(await exists(gameDir))) {
        await mkdir(gameDir)
      }

      // Save executable
      const executablePath = await join(gameDir, "game.exe")
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      await writeFile(executablePath, uint8Array)

      // Save metadata with asset public key for ownership validation
      const metadataPath = await join(gameDir, "metadata.json")
      const metadataWithAsset = {
        ...metadata,
        assetPublicKey: mintedAssetPublicKey,
      }
      const metadataText = JSON.stringify(metadataWithAsset, null, 2)
      await writeFile(metadataPath, new TextEncoder().encode(metadataText))

      console.log("Game saved to:", executablePath)
      console.log("Asset public key saved:", mintedAssetPublicKey)

      setDownloadState({ isDownloading: false, progress: 100, isDownloaded: true })
    } catch (err) {
      console.error("Failed to download game:", err)
      setError(`Failed to download game: ${err}`)
      setDownloadState({ isDownloading: false, progress: 0, isDownloaded: false })
    }
  }

  const handleLaunchGame = async () => {
    if (!metadata || !wallet) return

    try {
      setError(null)
      setIsLaunching(true)

      // Verify ownership before launching
      if (!assetPublicKey) {
        throw new Error(
          "Asset public key not found. Please re-download the game."
        )
      }

      console.log("Verifying ownership for asset:", assetPublicKey)
      console.log("Wallet address:", wallet.address)

      const ownershipService = new AssetOwnershipService()
      const isOwner = await ownershipService.verifyOwnership(
        assetPublicKey,
        wallet.address
      )

      if (!isOwner) {
        throw new Error(
          "You do not own this game NFT. You must own the NFT to play the game."
        )
      }

      console.log("Ownership verified! Launching game...")

      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, candyMachinePublicKey)
      const executablePath = await join(gameDir, "game.exe")

      console.log("Launching game:", executablePath)

      await invoke("execute_game", { path: executablePath })

      console.log("Game launched successfully!")
    } catch (err) {
      console.error("Failed to launch game:", err)
      setError(`Failed to launch game: ${err}`)
    } finally {
      setIsLaunching(false)
    }
  }


  console.log("Metadata:", metadata)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="candyMachinePublicKey" className="text-gray-300">Candy Machine PublicKey</Label>
        <div className="flex gap-2">
          <Input
            id="candyMachinePublicKey"
            placeholder="Paste candy machine PublicKey here"
            value={candyMachinePublicKey}
            onChange={(e) => setCandyMachinePublicKey(e.target.value)}
            disabled={isFetching}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <Button onClick={handleFetchMetadata} disabled={!candyMachinePublicKey || isFetching}>
            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Fetch
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900 border border-red-700 rounded-lg">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {metadata && (
        <div className="border border-gray-700 bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{metadata.name}</h3>
            <p className="text-gray-400 mt-2">{metadata.description}</p>
          </div>

          {metadata.image && (
            <img
              src={getLocalImageUrl(metadata.image)}
              alt={metadata.name}
              className="w-full max-w-md rounded-lg border"
            />
          )}

          <div className="space-y-2">
            {!downloadState.isDownloaded ? (
              <>
                <Button
                  onClick={handleMintGame}
                  disabled={isMinting || downloadState.isDownloading}
                  className="w-full"
                  variant="default"
                >
                  {isMinting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isMinting ? "Minting Game..." : "Mint & Download Game"}
                </Button>
                {downloadState.isDownloading && (
                  <div className="text-center text-sm text-gray-400">
                    Downloading... {downloadState.progress}%
                  </div>
                )}
              </>
            ) : (
              <Button
                onClick={handleLaunchGame}
                disabled={isLaunching}
                className="w-full"
                variant="default"
              >
                {isLaunching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLaunching ? "Launching..." : "Launch Game"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
