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
import { useState, useRef } from "react";
import { Plus, X, Camera, ShoppingCart } from "lucide-react";
import {
  TARGET_TRIPLES,
  getAllTargetTriples,
  getPlatformFamilies,
  type TargetTriple,
} from "@/lib/platform";
import { GAME_CATEGORIES } from "@/lib/blockchain/domain/value-objects/game-metadata.vo";
import { cn } from "@/lib/utils";

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
    .min(1, "Nome do jogo é obrigatório")
    .max(100, "Nome do jogo muito longo"),
  description: z
    .string()
    .min(1, "Descrição é obrigatória")
    .max(500, "Descrição muito longa"),
  categories: z
    .array(z.string())
    .min(1, "Selecione pelo menos uma categoria")
    .max(5, "Máximo de 5 categorias permitidas"),
  price: z
    .number({ invalid_type_error: "Preço deve ser um número" })
    .min(0, "Preço deve ser no mínimo 0 SOL")
    .max(1000, "Preço deve ser no máximo 1000 SOL"),
  image: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "Imagem é obrigatória")
    .refine(
      (files) => files?.[0]?.size <= MAX_IMAGE_SIZE,
      "Tamanho máximo do arquivo é 5MB"
    )
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Apenas formatos .jpg, .jpeg, .png e .webp são suportados"
    ),
  // Binaries are validated separately in state
});

type GameFormValues = z.infer<typeof gameFormSchema> & {
  binaries: BinaryEntry[];
};

type GameFormProps = {
  onSubmit: (values: GameFormValues) => Promise<void>;
};

export function GameForm({ onSubmit }: GameFormProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>("");
  const [binaries, setBinaries] = useState<BinaryEntry[]>([
    { id: crypto.randomUUID(), targetTriple: null, file: null },
  ]);
  const [binaryError, setBinaryError] = useState<string | null>(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<Omit<GameFormValues, "binaries">>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categories: [],
      price: 0,
    },
  });

  // Watch form values for live preview
  const watchedName = form.watch("name");
  const watchedPrice = form.watch("price");

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
    setBinaries(binaries.map((b) => (b.id === id ? { ...b, ...updates } : b)));
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
        setBinaryError(`${binary.file.name} excede o tamanho máximo de 100MB`);
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

  // Get platform icons for preview
  const getPlatformIconsForPreview = () => {
    const platforms = binaries
      .filter((b) => b.targetTriple)
      .map((b) => b.targetTriple as string);
    const platformFamilies = getPlatformFamilies(platforms);
    return platformFamilies.map((family) => {
      const triple = Object.keys(TARGET_TRIPLES).find(
        (t) => TARGET_TRIPLES[t as TargetTriple].platform === family
      );
      return triple ? TARGET_TRIPLES[triple as TargetTriple].icon : "";
    });
  };

  // Format price for preview
  const formattedPrice =
    watchedPrice === 0 ? "Grátis" : `${watchedPrice.toFixed(2)} SOL`;

  // Trigger image input click
  const handlePreviewImageClick = () => {
    imageInputRef.current?.click();
  };

  return (
    <Form {...form}>
      <form
        id="game-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="mx-auto max-w-5xl px-4"
      >
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Left Column - Form Fields */}
          <div className="space-y-6 w-full">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Jogo</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do jogo" {...field} />
                  </FormControl>
                  <FormDescription>O nome do seu jogo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva seu jogo"
                      className="resize-none"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Uma breve descrição do seu jogo (10-500 caracteres)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorias</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Select
                        onValueChange={(value) => {
                          if (!field.value.includes(value) && field.value.length < 5) {
                            field.onChange([...field.value, value]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione as categorias do jogo" />
                        </SelectTrigger>
                        <SelectContent>
                          {GAME_CATEGORIES.map((category) => (
                            <SelectItem
                              key={category}
                              value={category}
                              disabled={field.value.includes(category)}
                            >
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((category) => (
                            <div
                              key={category}
                              className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                            >
                              <span>{category}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(
                                    field.value.filter((c) => c !== category)
                                  );
                                }}
                                className="hover:bg-primary/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Selecione de 1 a 5 categorias que descrevem seu jogo
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
                  <FormLabel>Preço (SOL)</FormLabel>
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
                    O preço para os usuários adquirirem este jogo (em SOL).
                    Defina 0 para gratuito.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field: { onChange, value, ref, ...field } }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input
                      ref={(e) => {
                        ref(e);
                        imageInputRef.current = e;
                      }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        onChange(e.target.files);
                        handleImageChange(e);
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div>
                <FormLabel>Executáveis do Jogo</FormLabel>
                <FormDescription className="mt-1">
                  Adicione executáveis para diferentes plataformas (mín 1, máx 1
                  por plataforma)
                </FormDescription>
              </div>

              {binaries.map((binary) => (
                <div
                  key={binary.id}
                  className="relative p-4 border border-gray-700 rounded-lg space-y-3 bg-gray-800"
                >
                  {binaries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBinary(binary.id)}
                      className="absolute right-2 top-2 hover:bg-transparent hover:text-primary"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="flex flex-col gap-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block text-gray-300">
                        Plataforma
                      </label>
                      <Select
                        value={binary.targetTriple || ""}
                        onValueChange={(value) =>
                          updateBinary(binary.id, {
                            targetTriple: value as TargetTriple,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
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
                        Executável
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
                        {binary.file.name} (
                        {(binary.file.size / 1024 / 1024).toFixed(2)} MB)
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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBinary}
                disabled={binaries.length >= getAllTargetTriples().length}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar plataforma
              </Button>
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start w-full flex flex-col items-center">
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-white">
                Pré-visualização
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                É assim que seu jogo aparecerá no marketplace
              </p>
            </div>

            {/* Preview Card */}
            <div className="relative w-full overflow-hidden rounded-3xl bg-neutral-800 transition-all hover:shadow-xl max-w-sm mx-auto lg:mx-0">
              {/* Game Image */}
              <div
                onClick={handlePreviewImageClick}
                className="aspect-[3/4] w-full overflow-hidden bg-neutral-700 cursor-pointer group/image relative"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Game preview"
                    className="h-full w-full object-cover transition-transform group-hover/image:scale-110"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                    <Camera className="h-16 w-16 mb-2" />
                    <span className="text-sm">Clique para enviar imagem</span>
                  </div>
                )}

                {/* Hover overlay for image */}
                {preview && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center text-white">
                      <Camera className="h-12 w-12 mx-auto mb-2" />
                      <span className="text-sm font-medium">
                        Clique para alterar imagem
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Platform Badges */}
              {getPlatformIconsForPreview().length > 0 && (
                <div className="absolute top-3 right-3 flex gap-1">
                  {getPlatformIconsForPreview().map((icon, index) => (
                    <div
                      key={index}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg backdrop-blur-sm"
                    >
                      {icon}
                    </div>
                  ))}
                </div>
              )}

              {/* Title Bar at Bottom */}
              <div className="absolute bottom-12 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 py-4">
                <h3 className="truncate text-center text-lg font-semibold text-white">
                  {watchedName || "Nome do Seu Jogo"}
                </h3>
              </div>

              {/* Price Button at Very Bottom */}
              <div className="absolute bottom-0 left-0 right-0">
                {isEditingPrice ? (
                  <div className="p-2 bg-pink-600">
                    <Input
                      type="text"
                      value={priceInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setPriceInput(value);
                          const numValue = value === "" ? 0 : parseFloat(value);
                          form.setValue(
                            "price",
                            isNaN(numValue) ? 0 : numValue
                          );
                        }
                      }}
                      onBlur={() => setIsEditingPrice(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          setIsEditingPrice(false);
                        }
                      }}
                      autoFocus
                      className="h-8 text-center font-bold bg-white text-black border-none"
                      placeholder="0.00"
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setIsEditingPrice(true)}
                    className={cn(
                      "h-12 w-full rounded-none rounded-b-3xl text-base font-bold",
                      "bg-pink-600 hover:bg-pink-700 active:bg-pink-800",
                      "transition-colors duration-200"
                    )}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {formattedPrice}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
