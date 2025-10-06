import { createFileRoute } from '@tanstack/react-router'
import { GameForm } from '@/components/GameForm'
import { ipfs } from '@/lib/ipfs'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

type GameMetadata = {
  name: string
  description: string
  image: string
}

function RouteComponent() {
  const [isUploading, setIsUploading] = useState(false)
  const [metadataCid, setMetadataCid] = useState<string | null>(null)

  const handleGameSubmit = async (values: any) => {
    try {
      setIsUploading(true)
      console.log('Starting IPFS upload...')

      // Upload image to IPFS directly (daemon already running from Rust)
      const imageFile = values.image[0] as File
      console.log('Uploading image to IPFS:', imageFile.name)
      const imageResult = await ipfs.addFile(imageFile)
      console.log('Image uploaded! CID:', imageResult.cid)

      // Get image URI
      const imageUri = ipfs.getGatewayUrl(imageResult.cid)
      console.log('Image URI:', imageUri)

      // Create metadata object
      const metadata: GameMetadata = {
        name: values.name,
        description: values.description,
        image: imageUri,
      }
      console.log('Metadata:', metadata)

      // Upload metadata JSON to IPFS
      console.log('Uploading metadata to IPFS...')
      const metadataResult = await ipfs.addJSON(metadata)
      console.log('Metadata uploaded! CID:', metadataResult.cid)

      // Store metadata CID
      setMetadataCid(metadataResult.cid)

      alert(`Success! Metadata CID: ${metadataResult.cid}`)
    } catch (error) {
      console.error('Upload failed:', error)
      alert(`Upload failed: ${error}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Add New Game</h1>

      <GameForm onSubmit={handleGameSubmit} isLoading={isUploading} />

      {metadataCid && (
        <div className="mt-8 max-w-2xl mx-auto p-6 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-2 text-green-800">Upload Successful!</h2>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Metadata CID:</span>{' '}
              <code className="bg-white px-2 py-1 rounded text-xs">{metadataCid}</code>
            </p>
            <p className="text-sm">
              <span className="font-medium">Metadata URL:</span>{' '}
              <a
                href={ipfs.getGatewayUrl(metadataCid)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {ipfs.getGatewayUrl(metadataCid)}
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
