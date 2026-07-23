import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

export function ConversionBanner() {
  return (
    <Alert className="items-center gap-y-2 sm:grid-cols-[1fr_auto]">
      <div>
        <AlertTitle>Proteja seu histórico</AlertTitle>
        <AlertDescription>
          Crie uma conta para acessar estas candidaturas em outros dispositivos
          e mesmo depois de limpar o navegador.
        </AlertDescription>
      </div>
      <Link href="/conta" className={buttonVariants({ size: "sm" })}>
        Criar conta
      </Link>
    </Alert>
  );
}
