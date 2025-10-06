import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Loader2 } from "lucide-react"

const MAX_IMAGE_SIZE = 5000000 // 5MB
const MAX_EXECUTABLE_SIZE = 100000000 // 100MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

const gameFormSchema = z.object({
  name: z.string().min(1, "Game name is required").max(100, "Game name is too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description is too long"),
  image: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "Image is required")
    .refine(
      (files) => files?.[0]?.size <= MAX_IMAGE_SIZE,
      "Max file size is 5MB"
    )
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported"
    ),
  executable: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "Executable file is required")
    .refine(
      (files) => files?.[0]?.size <= MAX_EXECUTABLE_SIZE,
      "Max executable file size is 100MB"
    ),
})

type GameFormValues = z.infer<typeof gameFormSchema>

type GameFormProps = {
  onSubmit: (values: GameFormValues) => Promise<void>
  isLoading?: boolean
}

export function GameForm({ onSubmit, isLoading = false }: GameFormProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [executableName, setExecutableName] = useState<string | null>(null)

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleExecutableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setExecutableName(file.name)
    }
  }

  const handleSubmit = async (values: GameFormValues) => {
    await onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Game Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter game name" {...field} />
              </FormControl>
              <FormDescription>
                The name of your game
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your game"
                  className="resize-none"
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description of your game (10-500 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <FormLabel>Game Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    onChange(e.target.files)
                    handleImageChange(e)
                  }}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Upload an image for your game (max 5MB, jpg/png/webp)
              </FormDescription>
              <FormMessage />
              {preview && (
                <div className="mt-4">
                  <img
                    src={preview}
                    alt="Game preview"
                    className="max-w-sm rounded-lg border"
                  />
                </div>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="executable"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <FormLabel>Game Executable</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  onChange={(e) => {
                    onChange(e.target.files)
                    handleExecutableChange(e)
                  }}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Upload the game executable file (max 100MB)
              </FormDescription>
              <FormMessage />
              {executableName && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    Selected: <span className="font-medium">{executableName}</span>
                  </p>
                </div>
              )}
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Uploading to IPFS...' : 'Submit Game'}
        </Button>
      </form>
    </Form>
  )
}
