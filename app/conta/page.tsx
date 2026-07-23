"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { createClient } from "@/lib/supabase/client";

function isEmailConflict(error: { code?: string; message: string }) {
  return (
    ["email_exists", "identity_already_exists", "user_already_exists"].includes(
      error.code ?? ""
    ) || /already|registered|exists|utilizado|cadastrado/i.test(error.message)
  );
}

export default function ContaPage() {
  const router = useRouter();
  const { session, user, isAnonymous, loading, error: sessionError } =
    useAnonymousSession();
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [anonymousCount, setAnonymousCount] = useState(0);
  const [acknowledgeNoMerge, setAcknowledgeNoMerge] = useState(false);
  const [busyAction, setBusyAction] = useState<"convert" | "login" | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("erro")) {
      const timeout = window.setTimeout(() => {
        setError(
          "Não foi possível confirmar o e-mail. Solicite um novo link e tente novamente."
        );
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    if (!session || !isAnonymous) {
      return;
    }

    let active = true;

    async function loadCount() {
      const supabase = createClient();
      const { count, error: countError } = await supabase
        .from("candidaturas")
        .select("id", { count: "exact", head: true });

      if (!active) return;

      if (countError) {
        console.error(
          "[candidaturas] Não foi possível contar o histórico anônimo.",
          countError
        );
        return;
      }

      setAnonymousCount(count ?? 0);
    }

    void loadCount();

    return () => {
      active = false;
    };
  }, [isAnonymous, session]);

  async function handleConvert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("convert");
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/conta/confirmar`;
      const { error: updateError } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: redirectTo }
      );

      if (updateError) {
        if (isEmailConflict(updateError)) {
          // TODO(candidaturas-merge): definir se o histórico anônimo deve ser
          // movido, mesclado ou descartado antes de autenticar a conta existente.
          setError(
            "Este e-mail já pertence a uma conta. Entre nela abaixo. O histórico anônimo atual não será mesclado automaticamente."
          );
          setLoginEmail(email.trim());
          return;
        }

        throw updateError;
      }

      setMessage(
        "Enviamos um link de confirmação. Abra-o neste navegador para preservar o histórico e definir sua senha."
      );
    } catch (convertError) {
      setError(
        convertError instanceof Error
          ? convertError.message
          : "Não foi possível iniciar a criação da conta."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("login");
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      // TODO(candidaturas-merge): este login troca a sessão anônima pela conta
      // existente. Não migrar registros até a regra de conflitos ser decidida.
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (loginError) throw loginError;

      router.push("/historico");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível entrar na conta."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOut() {
    setError(null);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      window.location.assign("/");
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Não foi possível sair da conta."
      );
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-muted-foreground">Carregando sua conta...</p>
      </main>
    );
  }

  if (!isAnonymous && user) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Minha conta</CardTitle>
            <CardDescription>
              Seu histórico está protegido e disponível em outros dispositivos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-sm">
              Conectado como <strong>{user.email}</strong>
            </p>
            {(error || sessionError) && (
              <p className="text-sm text-destructive">
                {error ?? sessionError}
              </p>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              Sair
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Proteja seu histórico</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Sua sessão anônima já mantém as candidaturas neste navegador. Vincule
          um e-mail para acessá-las em qualquer dispositivo.
        </p>
      </div>

      {(error || sessionError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{error ?? sessionError}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className="mb-6">
          <AlertTitle>Confira seu e-mail</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Criar conta</CardTitle>
            <CardDescription>
              O usuário anônimo atual será convertido, preservando o mesmo ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleConvert}>
              <div className="grid gap-2">
                <Label htmlFor="conversion-email">E-mail</Label>
                <Input
                  id="conversion-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={busyAction !== null}>
                {busyAction === "convert"
                  ? "Enviando confirmação..."
                  : "Continuar com e-mail"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Já tenho conta</CardTitle>
            <CardDescription>
              Entre para carregar o histórico vinculado à conta existente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleLogin}>
              <div className="grid gap-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </div>

              {anonymousCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <Checkbox
                    id="acknowledge-no-merge"
                    checked={acknowledgeNoMerge}
                    onCheckedChange={(checked) =>
                      setAcknowledgeNoMerge(checked === true)
                    }
                  />
                  <Label
                    htmlFor="acknowledge-no-merge"
                    className="font-normal leading-relaxed"
                  >
                    Entendo que as {anonymousCount} candidatura(s) desta sessão
                    anônima não serão mescladas à conta existente.
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                variant="outline"
                disabled={
                  busyAction !== null ||
                  (anonymousCount > 0 && !acknowledgeNoMerge)
                }
              >
                {busyAction === "login" ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
