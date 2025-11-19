import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  TARGET_TRIPLES,
  getAllTargetTriples,
  type TargetTriple,
} from "@/lib/platform";

const MAX_IMAGE_SIZE = 5000000; // 5MB
const MAX_EXECUTABLE_SIZE = 100000000; // 100MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export type BinaryEntry = {
  id: string;
  targetTriple: TargetTriple | null;
  file: File | null;
};

const gameFormSchema = z.object({
  name: z
    .string()
    .min(1, "Game name is required")
    .max(100, "Game name is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description is too long"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price must be at least 0 SOL")
    .max(1000, "Price must be at most 1000 SOL"),
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
  // Binaries are validated separately in state
});

type GameFormValues = z.infer<typeof gameFormSchema> & {
  binaries: BinaryEntry[];
};

type GameFormProps = {
  onSubmit: (values: GameFormValues) => Promise<void>;
  isLoading?: boolean;
};

export function GameForm({ onSubmit, isLoading = false }: GameFormProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>("");
  const [binaries, setBinaries] = useState<BinaryEntry[]>([
    { id: crypto.randomUUID(), targetTriple: null, file: null },
  ]);
  const [binaryError, setBinaryError] = useState<string | null>(null);

  const form = useForm<Omit<GameFormValues, "binaries">>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addBinary = () => {
    setBinaries([
      ...binaries,
      { id: crypto.randomUUID(), targetTriple: null, file: null },
    ]);
  };

  const removeBinary = (id: string) => {
    if (binaries.length > 1) {
      setBinaries(binaries.filter((b) => b.id !== id));
    }
  };

  const updateBinary = (id: string, updates: Partial<BinaryEntry>) => {
    setBinaries(
      binaries.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    setBinaryError(null);
  };

  const validateBinaries = (): boolean => {
    // Check at least one binary
    const validBinaries = binaries.filter((b) => b.targetTriple && b.file);
    if (validBinaries.length === 0) {
      setBinaryError("Pelo menos um executável é necessário");
      return false;
    }

    // Check no duplicates
    const triples = validBinaries.map((b) => b.targetTriple);
    const uniqueTriples = new Set(triples);
    if (uniqueTriples.size !== triples.length) {
      setBinaryError("Plataformas duplicadas não são permitidas");
      return false;
    }

    // Check file sizes
    for (const binary of validBinaries) {
      if (binary.file && binary.file.size > MAX_EXECUTABLE_SIZE) {
        setBinaryError(
          `${binary.file.name} excede o tamanho máximo de 100MB`
        );
        return false;
      }
    }

    setBinaryError(null);
    return true;
  };

  const getAvailableTriples = (currentId: string): TargetTriple[] => {
    const usedTriples = binaries
      .filter((b) => b.id !== currentId && b.targetTriple)
      .map((b) => b.targetTriple);
    return getAllTargetTriples().filter((t) => !usedTriples.includes(t));
  };

  const handleSubmit = async (values: Omit<GameFormValues, "binaries">) => {
    if (!validateBinaries()) {
      return;
    }

    const validBinaries = binaries.filter((b) => b.targetTriple && b.file);
    await onSubmit({ ...values, binaries: validBinaries });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 max-w-2xl mx-auto"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Game Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter game name" {...field} />
              </FormControl>
              <FormDescription>The name of your game</FormDescription>
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
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (SOL)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={priceInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty, digits, and single decimal point
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setPriceInput(value);
                      // Convert to number for form state, or 0 if empty
                      const numValue = value === "" ? 0 : parseFloat(value);
                      field.onChange(isNaN(numValue) ? 0 : numValue);
                    }
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>
                The price for users to mint this game (in SOL). Set to 0 for free.
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
                    onChange(e.target.files);
                    handleImageChange(e);
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
                    className="w-48 h-auto rounded-lg border border-gray-700"
                  />
                </div>
              )}
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <FormLabel>Executáveis do Jogo</FormLabel>
              <FormDescription className="mt-1">
                Adicione executáveis para diferentes plataformas (mín 1, máx 1 por plataforma)
              </FormDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBinary}
              disabled={binaries.length >= getAllTargetTriples().length}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Binário
            </Button>
          </div>

          {binaries.map((binary, index) => (
            <div
              key={binary.id}
              className="p-4 border border-gray-700 rounded-lg space-y-3 bg-gray-800"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">
                  Binário {index + 1}
                </span>
                {binaries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBinary(binary.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-300">
                    Plataforma Alvo
                  </label>
                  <Select
                    value={binary.targetTriple || ""}
                    onValueChange={(value) =>
                      updateBinary(binary.id, {
                        targetTriple: value as TargetTriple,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTriples(binary.id).map((triple) => (
                        <SelectItem key={triple} value={triple}>
                          <div className="flex items-center gap-2">
                            <span>{TARGET_TRIPLES[triple].icon}</span>
                            <span>{TARGET_TRIPLES[triple].label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-300">
                    Arquivo Executável
                  </label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        updateBinary(binary.id, { file });
                      }
                    }}
                  />
                </div>
              </div>

              {binary.file && (
                <div className="p-2 bg-blue-900/20 border border-blue-700 rounded text-sm">
                  <span className="text-blue-300">
                    {binary.file.name} ({(binary.file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
          ))}

          {binaryError && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
              {binaryError}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Uploading to IPFS..." : "Submit Game"}
        </Button>
      </form>
    </Form>
  );
}
