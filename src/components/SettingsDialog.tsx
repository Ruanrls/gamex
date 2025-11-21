import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/providers/settings.provider";
import { useQueryClient } from "@tanstack/react-query";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CLUSTER_PRESETS = {
  mainnet: "https://api.mainnet-beta.solana.com",
  custom: "",
} as const;

type ClusterPreset = keyof typeof CLUSTER_PRESETS;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const queryClient = useQueryClient();

  // Local form state
  const [clusterPreset, setClusterPreset] = useState<ClusterPreset>("custom");
  const [solanaCluster, setSolanaCluster] = useState(settings.solanaCluster);
  const [apiUrl, setApiUrl] = useState(settings.apiUrl);

  // Update form when dialog opens or settings change
  useEffect(() => {
    setSolanaCluster(settings.solanaCluster);
    setApiUrl(settings.apiUrl);

    // Detect preset
    const preset = Object.entries(CLUSTER_PRESETS).find(
      ([_, url]) => url === settings.solanaCluster
    );
    setClusterPreset(preset ? (preset[0] as ClusterPreset) : "custom");
  }, [settings, open]);

  const handlePresetChange = (preset: ClusterPreset) => {
    setClusterPreset(preset);
    if (preset !== "custom") {
      setSolanaCluster(CLUSTER_PRESETS[preset]);
    }
  };

  const handleSave = () => {
    // Validate URLs
    try {
      new URL(solanaCluster);
      new URL(apiUrl);
    } catch (error) {
      toast.error("Por favor, insira URLs válidas");
      return;
    }

    updateSettings({
      solanaCluster,
      apiUrl,
    });

    // Invalidate all queries to refetch data from new endpoints
    queryClient.invalidateQueries();

    toast.success("Configurações salvas com sucesso");
    onOpenChange(false);
  };

  const handleReset = () => {
    resetToDefaults();

    // Invalidate all queries to refetch data from default endpoints
    queryClient.invalidateQueries();

    toast.info("Configurações restauradas para os padrões");
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form to current settings
    setSolanaCluster(settings.solanaCluster);
    setApiUrl(settings.apiUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configurações
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure seus endpoints de blockchain e API para descentralização
            total
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Info Banner */}
          <div className="flex items-start gap-3 border border-primary rounded-lg p-4">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-input">
              Essas configurações permitem que você se conecte ao seu próprio nó
              blockchain e indexador, tornando o launcher totalmente
              descentralizado. As alterações entram em vigor imediatamente.
            </p>
          </div>

          {/* Blockchain Cluster */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-white">
              Cluster Blockchain
            </Label>

            <div className="space-y-2">
              <Label className="text-sm text-gray-300">Rede Pré-definida</Label>
              <Select value={clusterPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione a rede" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem
                    value="mainnet"
                    className="text-white hover:bg-gray-700"
                  >
                    Mainnet Beta
                  </SelectItem>
                  <SelectItem
                    value="custom"
                    className="text-white hover:bg-gray-700"
                  >
                    RPC Personalizado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-300">
                URL do Endpoint RPC
              </Label>
              <Input
                type="text"
                value={solanaCluster}
                onChange={(e) => {
                  setSolanaCluster(e.target.value);
                  setClusterPreset("custom");
                }}
                placeholder="https://api.mainnet-beta.solana.com"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">
                O endpoint RPC da Solana para conectar
              </p>
            </div>
          </div>

          {/* API/Indexer Server */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-white">
              Servidor API / Indexador
            </Label>

            <div className="space-y-2">
              <Label className="text-sm text-gray-300">URL da API</Label>
              <Input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">
                O servidor API backend para indexação e dados dos jogos
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center mt-6">
          <Button
            onClick={handleReset}
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrões
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="secondary"
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
