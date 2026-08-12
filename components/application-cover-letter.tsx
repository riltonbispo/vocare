import { CopyButton } from "@/components/copy-button";
import { PdfDownloadButton } from "@/components/pdf-download-button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ApplicationCoverLetter({
  coverLetter,
}: {
  coverLetter: string | null;
}) {
  const hasCoverLetter = Boolean(coverLetter?.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carta de apresentação</CardTitle>
        <CardDescription>
          Texto profissional gerado para acompanhar a candidatura.
        </CardDescription>
        {hasCoverLetter && (
          <CardAction className="col-span-2 col-start-1 row-span-1 row-start-3 justify-self-stretch sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <CopyButton
                text={coverLetter ?? ""}
                size="sm"
                variant="outline"
                aria-label="Copiar carta de apresentação"
              />
              <PdfDownloadButton
                content={coverLetter ?? ""}
                documentType="cover-letter"
                filename="carta-de-apresentacao"
                label="Baixar PDF"
                size="sm"
                variant="outline"
                successMessage="Carta exportada em PDF."
              />
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {hasCoverLetter ? (
          <div className="whitespace-pre-wrap leading-7">
            {coverLetter}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Esta análise antiga não possui carta de apresentação.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
