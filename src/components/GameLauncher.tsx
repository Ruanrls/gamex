import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { ipfs } from "@/lib/ipfs"
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
  const [cid, setCid] = useState("")
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

      const extractedCid = extractCidFromUrl(cid)
      console.log("Fetching metadata for CID:", extractedCid)

      const data = await ipfs.fetchMetadata(extractedCid)
      console.log("Metadata fetched:", data)

      setMetadata(data)

      // Check if game is already downloaded
      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, extractedCid)
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

      // Save to AppData/games/{cid}/
      const appData = await appDataDir()
      const gamesDir = await join(appData, "games")
      const gameDir = await join(gamesDir, extractCidFromUrl(cid))

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
      const gameDir = await join(gamesDir, extractCidFromUrl(cid))
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
        <Label htmlFor="cid">Game CID</Label>
        <div className="flex gap-2">
          <Input
            id="cid"
            placeholder="Paste IPFS CID or URL here"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            disabled={isFetching}
          />
          <Button onClick={handleFetchMetadata} disabled={!cid || isFetching}>
            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Fetch
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {metadata && (
        <div className="border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{metadata.name}</h3>
            <p className="text-gray-600 mt-2">{metadata.description}</p>
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
