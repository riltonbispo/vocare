"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CopyButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick"
> & {
  text: string;
  label?: string;
  copiedLabel?: string;
  errorMessage?: string;
};

export function CopyButton({
  text,
  label = "Copiar",
  copiedLabel = "Copiado!",
  errorMessage = "Não foi possível copiar o conteúdo.",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
      }

      resetTimer.current = setTimeout(() => {
        setCopied(false);
        resetTimer.current = null;
      }, 1500);
    } catch {
      toast.error(errorMessage);
    }
  }

  return (
    <Button
      type="button"
      aria-live="polite"
      {...props}
      onClick={() => void copyToClipboard()}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
