import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { ipfs } from "@/lib/file-storage/ipfs"
import { NftCollection } from "@/lib/blockchain/nft-collection"
import { invoke } from "@tauri-apps/api/core"
import { appDataDir } from "@tauri-apps/api/path"
import { join } from "@tauri-apps/api/path"
import { exists, mkdir, writeFile } from "@tauri-apps/plugin-fs"

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
  const [collectionPublicKey, setCollectionPublicKey] = useState("")
  const [metadata, setMetadata] = useState<GameMetadata | null>(null)
  const [isFetching, setIsFetching] = useState(false)
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

      console.log("Fetching collection metadata for PublicKey:", collectionPublicKey)

      const collection = await NftCollection.fetchByPublicKey(collectionPublicKey)
      console.log("Collection fetched:", collection)

      // The metadata is already fetched by NftCollection.fetchByPublicKey
      console.log("Game metadata:", collection.metadata)

      setMetadata(collection.metadata)

      // Check if game is already downloaded
      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, collectionPublicKey)
      const executablePath = await join(gameDir, "game.exe")

      const isDownloaded = await exists(executablePath)
      setDownloadState({ isDownloading: false, progress: 100, isDownloaded })
    } catch (err) {
      console.error("Failed to fetch metadata:", err)
      setError(`Failed to fetch metadata: ${err}`)
    } finally {
      setIsFetching(false)
    }
  }

  const handleDownloadGame = async () => {
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

      // Save to AppData/games/{collectionPublicKey}/
      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, collectionPublicKey)

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

      // Save metadata for caching
      const metadataPath = await join(gameDir, "metadata.json")
      const metadataText = JSON.stringify(metadata, null, 2)
      await writeFile(metadataPath, new TextEncoder().encode(metadataText))

      console.log("Game saved to:", executablePath)

      setDownloadState({ isDownloading: false, progress: 100, isDownloaded: true })
    } catch (err) {
      console.error("Failed to download game:", err)
      setError(`Failed to download game: ${err}`)
      setDownloadState({ isDownloading: false, progress: 0, isDownloaded: false })
    }
  }

  const handleLaunchGame = async () => {
    if (!metadata) return

    try {
      setError(null)
      setIsLaunching(true)

      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, collectionPublicKey)
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
        <Label htmlFor="collectionPublicKey" className="text-gray-300">Collection PublicKey</Label>
        <div className="flex gap-2">
          <Input
            id="collectionPublicKey"
            placeholder="Paste collection PublicKey here"
            value={collectionPublicKey}
            onChange={(e) => setCollectionPublicKey(e.target.value)}
            disabled={isFetching}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <Button onClick={handleFetchMetadata} disabled={!collectionPublicKey || isFetching}>
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
              <Button
                onClick={handleDownloadGame}
                disabled={downloadState.isDownloading}
                className="w-full"
              >
                {downloadState.isDownloading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {downloadState.isDownloading
                  ? `Downloading... ${downloadState.progress}%`
                  : "Download Game"}
              </Button>
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
