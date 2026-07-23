"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmarContaPage() {
  const { user, loading, error: sessionError } = useAnonymousSession();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSaved(true);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Não foi possível definir a senha."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container mx-auto max-w-xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Defina sua senha</CardTitle>
          <CardDescription>
            O e-mail foi confirmado. Finalize a conta sem alterar o vínculo com
            suas candidaturas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Confirmando sua sessão...
            </p>
          ) : saved ? (
            <div className="grid gap-4">
              <p className="text-sm">
                Conta concluída. Seu histórico continua vinculado ao mesmo
                usuário.
              </p>
              <Link href="/historico" className={buttonVariants()}>
                Ver histórico
              </Link>
            </div>
          ) : !user ? (
            <p className="text-sm text-destructive">
              {sessionError ??
                "A confirmação não criou uma sessão válida. Abra novamente o link enviado por e-mail."}
            </p>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
