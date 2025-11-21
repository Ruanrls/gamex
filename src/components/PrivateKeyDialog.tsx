import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/providers/user.provider";

type PrivateKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PrivateKeyDialog({ open, onOpenChange }: PrivateKeyDialogProps) {
  const { wallet } = useUser();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const privateKey = wallet?.getPrivateKey() || "";

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(privateKey);
    setCopied(true);
    toast.success("Private key copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleShow = () => {
    setShowKey(!showKey);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Private Key</DialogTitle>
          <DialogDescription className="text-gray-400">
            Your wallet's private key
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Warning Message */}
          <div className="flex items-start gap-3 bg-red-950 border border-red-800 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">
              <strong>Never share your private key with anyone!</strong> Anyone with access to your private key can control your wallet and steal your assets.
            </p>
          </div>

          {/* Private Key Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Private Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-xs text-pink-400 break-all font-mono overflow-hidden">
                {showKey ? privateKey : "•".repeat(88)}
              </code>
              <Button
                onClick={handleToggleShow}
                variant="secondary"
                size="icon"
                className="shrink-0"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={handleCopyKey}
                variant="secondary"
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {!showKey && (
              <p className="text-xs text-gray-500">Click the eye icon to reveal your private key</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
