"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

import {
  APPLICATION_CHANNEL_NAME_MAX_LENGTH,
  cleanApplicationChannelName,
  normalizeApplicationChannelKey,
  type ApplicationChannel,
} from "@/lib/application-channels";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

type ChannelOption = ApplicationChannel & {
  createName?: string;
};

type AssociationVariables = {
  action: "associate" | "remove";
  channel: ApplicationChannel;
  created?: boolean;
};

type ApplicationHistoryCache = {
  applications: Array<
    {
      id: string;
      channels: ApplicationChannel[];
    } & Record<string, unknown>
  >;
  channels: ApplicationChannel[];
};

const EMPTY_CHANNELS: ApplicationChannel[] = [];

function catalogQueryKey(userId: string) {
  return ["application-channels", userId] as const;
}

function applicationChannelsQueryKey(
  userId: string,
  applicationId: string,
) {
  return ["application-channels", userId, applicationId] as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApplicationChannel(value: unknown): value is ApplicationChannel {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

async function readResponseBody(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function responseError(
  response: Response,
  body: unknown,
  fallback: string,
) {
  if (!response.ok) {
    throw new Error(
      isRecord(body) && typeof body.error === "string"
        ? body.error
        : fallback,
    );
  }
}

function channelsFromBody(body: unknown, fallback: string) {
  if (
    !isRecord(body) ||
    !Array.isArray(body.channels) ||
    !body.channels.every(isApplicationChannel)
  ) {
    throw new Error(fallback);
  }

  return body.channels;
}

async function fetchAvailableChannels() {
  const response = await fetch("/api/application-channels", {
    cache: "no-store",
  });
  const body = await readResponseBody(response);
  const fallback = "Não foi possível carregar os canais disponíveis.";

  responseError(response, body, fallback);
  return channelsFromBody(body, fallback);
}

async function fetchApplicationChannels(applicationId: string) {
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/channels`,
    { cache: "no-store" },
  );
  const body = await readResponseBody(response);
  const fallback = "Não foi possível carregar os canais da candidatura.";

  responseError(response, body, fallback);
  return channelsFromBody(body, fallback);
}

async function createChannel(name: string) {
  const response = await fetch("/api/application-channels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const body = await readResponseBody(response);
  const fallback = "Não foi possível criar o canal.";

  responseError(response, body, fallback);

  if (
    !isRecord(body) ||
    !isApplicationChannel(body.channel) ||
    typeof body.created !== "boolean"
  ) {
    throw new Error(fallback);
  }

  return { channel: body.channel, created: body.created };
}

async function updateChannelAssociation(
  applicationId: string,
  { action, channel }: AssociationVariables,
) {
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/channels`,
    {
      method: action === "associate" ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_id: channel.id }),
    },
  );
  const body = await readResponseBody(response);
  const fallback =
    action === "associate"
      ? "Não foi possível associar o canal."
      : "Não foi possível remover o canal.";

  responseError(response, body, fallback);

  if (action === "associate") {
    if (
      !isRecord(body) ||
      !isApplicationChannel(body.channel) ||
      typeof body.associated !== "boolean"
    ) {
      throw new Error(fallback);
    }

    return {
      action,
      channel: body.channel,
      associated: body.associated,
    } as const;
  }

  if (
    !isRecord(body) ||
    typeof body.channel_id !== "string" ||
    typeof body.removed !== "boolean"
  ) {
    throw new Error(fallback);
  }

  return {
    action,
    channelId: body.channel_id,
    removed: body.removed,
  } as const;
}

function sortChannels(channels: ApplicationChannel[]) {
  return [...channels].sort((first, second) =>
    first.name.localeCompare(second.name, "pt-BR", {
      sensitivity: "base",
    }),
  );
}

function mergeChannel(
  channels: ApplicationChannel[] | undefined,
  channel: ApplicationChannel,
) {
  const current = channels ?? EMPTY_CHANNELS;
  const withoutCurrent = current.filter((item) => item.id !== channel.id);
  return sortChannels([...withoutCurrent, channel]);
}

function updateHistoryCache(
  current: ApplicationHistoryCache | undefined,
  applicationId: string,
  applicationChannels: ApplicationChannel[],
  catalogChannel?: ApplicationChannel,
) {
  if (!current) return current;

  return {
    ...current,
    channels: catalogChannel
      ? mergeChannel(current.channels, catalogChannel)
      : current.channels,
    applications: current.applications.map((application) =>
      application.id === applicationId
        ? {
            ...application,
            channels: sortChannels(applicationChannels),
          }
        : application,
    ),
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ApplicationChannelsField({
  applicationId,
  userId,
}: {
  applicationId: string;
  userId: string;
}) {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const anchor = useComboboxAnchor();
  const queryClient = useQueryClient();
  const catalogKey = catalogQueryKey(userId);
  const selectedKey = applicationChannelsQueryKey(userId, applicationId);
  const historyKey = ["application-history", userId] as const;
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const highlightedItemRef = useRef<ChannelOption | undefined>(undefined);
  const pendingCreationKeyRef = useRef<string | null>(null);
  const associationPendingRef = useRef(false);

  const catalogQuery = useQuery({
    queryKey: catalogKey,
    queryFn: fetchAvailableChannels,
    enabled: Boolean(userId),
  });
  const selectedQuery = useQuery({
    queryKey: selectedKey,
    queryFn: () => fetchApplicationChannels(applicationId),
    enabled: Boolean(userId && applicationId),
  });

  const selectedChannels = selectedQuery.data ?? EMPTY_CHANNELS;
  const availableChannels = useMemo(() => {
    const byId = new Map<string, ApplicationChannel>();

    for (const channel of [
      ...(catalogQuery.data ?? EMPTY_CHANNELS),
      ...selectedChannels,
    ]) {
      byId.set(channel.id, channel);
    }

    return sortChannels([...byId.values()]);
  }, [catalogQuery.data, selectedChannels]);
  const channelsByKey = useMemo(() => {
    const byKey = new Map<string, ApplicationChannel>();

    for (const channel of availableChannels) {
      byKey.set(normalizeApplicationChannelKey(channel.name), channel);
    }

    return byKey;
  }, [availableChannels]);

  const associationMutation = useMutation({
    mutationFn: (variables: AssociationVariables) =>
      updateChannelAssociation(applicationId, variables),
    async onMutate(variables) {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: selectedKey, exact: true }),
        queryClient.cancelQueries({ queryKey: historyKey, exact: true }),
      ]);
      const previousSelected =
        queryClient.getQueryData<ApplicationChannel[]>(selectedKey);
      const previousHistory =
        queryClient.getQueryData<ApplicationHistoryCache>(historyKey);
      const optimisticSelected =
        variables.action === "associate"
          ? mergeChannel(previousSelected, variables.channel)
          : (previousSelected ?? EMPTY_CHANNELS).filter(
              (channel) => channel.id !== variables.channel.id,
            );

      queryClient.setQueryData<ApplicationChannel[]>(
        selectedKey,
        optimisticSelected,
      );
      queryClient.setQueryData<ApplicationHistoryCache>(
        historyKey,
        (current) =>
          updateHistoryCache(
            current,
            applicationId,
            optimisticSelected,
            variables.action === "associate" ? variables.channel : undefined,
          ),
      );

      return { previousHistory, previousSelected };
    },
    onError(error, variables, context) {
      if (context) {
        queryClient.setQueryData(selectedKey, context.previousSelected);
        queryClient.setQueryData(historyKey, context.previousHistory);
      }

      toast.error(
        errorMessage(
          error,
          variables.action === "associate"
            ? "Não foi possível associar o canal."
            : "Não foi possível remover o canal.",
        ),
      );
    },
    onSuccess(result, variables) {
      const currentSelected =
        queryClient.getQueryData<ApplicationChannel[]>(selectedKey) ??
        EMPTY_CHANNELS;
      const canonicalSelected =
        result.action === "associate"
          ? mergeChannel(currentSelected, result.channel)
          : currentSelected;

      queryClient.setQueryData(selectedKey, canonicalSelected);
      queryClient.setQueryData<ApplicationHistoryCache>(
        historyKey,
        (current) =>
          updateHistoryCache(
            current,
            applicationId,
            canonicalSelected,
            result.action === "associate" ? result.channel : undefined,
          ),
      );

      if (variables.action === "remove") {
        toast.success("Canal removido da candidatura.");
      } else if (variables.created) {
        toast.success("Canal criado e associado à candidatura.");
      } else if (
        result.action === "associate" &&
        result.associated === false
      ) {
        toast.success("O canal já estava associado à candidatura.");
      } else {
        toast.success("Canal associado à candidatura.");
      }
    },
    onSettled() {
      associationPendingRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: selectedKey,
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: historyKey,
        exact: true,
        refetchType: "all",
      });
    },
  });

  function mutateAssociation(variables: AssociationVariables) {
    if (associationPendingRef.current) return;

    associationPendingRef.current = true;
    setValidationError(null);
    associationMutation.reset();
    associationMutation.mutate(variables);
  }

  const creationMutation = useMutation({
    mutationFn: ({ name }: { name: string; key: string }) =>
      createChannel(name),
    onError(error) {
      toast.error(errorMessage(error, "Não foi possível criar o canal."));
    },
    onSuccess(result) {
      queryClient.setQueryData<ApplicationChannel[]>(catalogKey, (current) =>
        mergeChannel(current, result.channel),
      );
      setInputValue("");
      setValidationError(null);

      const currentSelected =
        queryClient.getQueryData<ApplicationChannel[]>(selectedKey) ??
        EMPTY_CHANNELS;

      if (currentSelected.some((channel) => channel.id === result.channel.id)) {
        queryClient.setQueryData<ApplicationHistoryCache>(
          historyKey,
          (current) =>
            updateHistoryCache(
              current,
              applicationId,
              currentSelected,
              result.channel,
            ),
        );
        void queryClient.invalidateQueries({
          queryKey: historyKey,
          exact: true,
          refetchType: "all",
        });
        toast.success("O canal já estava associado à candidatura.");
        return;
      }

      mutateAssociation({
        action: "associate",
        channel: result.channel,
        created: result.created,
      });
    },
    onSettled() {
      pendingCreationKeyRef.current = null;
      void queryClient.invalidateQueries({
        queryKey: catalogKey,
        exact: true,
      });
    },
  });

  const cleanedInput = cleanApplicationChannelName(inputValue);
  const normalizedInput = normalizeApplicationChannelKey(cleanedInput);
  const matchingChannel = normalizedInput
    ? channelsByKey.get(normalizedInput)
    : undefined;
  const canCreate =
    Boolean(cleanedInput) &&
    cleanedInput.length <= APPLICATION_CHANNEL_NAME_MAX_LENGTH &&
    Boolean(normalizedInput) &&
    !matchingChannel;
  const options = useMemo<ChannelOption[]>(
    () =>
      canCreate
        ? [
            ...availableChannels,
            {
              id: `create:${normalizedInput}`,
              name: cleanedInput,
              createName: cleanedInput,
            },
          ]
        : availableChannels,
    [availableChannels, canCreate, cleanedInput, normalizedInput],
  );

  function requestChannel(rawName: string) {
    const name = cleanApplicationChannelName(rawName);

    if (!name) return;

    if (!creationMutation.isPending) creationMutation.reset();
    if (!associationMutation.isPending) associationMutation.reset();

    if (name.length > APPLICATION_CHANNEL_NAME_MAX_LENGTH) {
      setValidationError(
        `Use no máximo ${APPLICATION_CHANNEL_NAME_MAX_LENGTH} caracteres.`,
      );
      return;
    }

    const key = normalizeApplicationChannelKey(name);

    if (!key) {
      setValidationError("Informe um nome de canal válido.");
      return;
    }

    setValidationError(null);
    const existing = channelsByKey.get(key);

    if (existing) {
      setInputValue("");

      if (!selectedChannels.some((channel) => channel.id === existing.id)) {
        mutateAssociation({ action: "associate", channel: existing });
      }
      return;
    }

    if (
      creationMutation.isPending ||
      pendingCreationKeyRef.current === key
    ) {
      return;
    }

    pendingCreationKeyRef.current = key;
    creationMutation.reset();
    creationMutation.mutate({ name, key });
  }

  function handleValueChange(nextOptions: ChannelOption[]) {
    setValidationError(null);
    if (!creationMutation.isPending) creationMutation.reset();

    const createOption = nextOptions.find((option) => option.createName);

    if (createOption?.createName) {
      requestChannel(createOption.createName);
      return;
    }

    const nextChannels = nextOptions.map(({ id, name }) => ({ id, name }));
    const selectedIds = new Set(selectedChannels.map((channel) => channel.id));
    const nextIds = new Set(nextChannels.map((channel) => channel.id));
    const added = nextChannels.find((channel) => !selectedIds.has(channel.id));
    const removed = selectedChannels.find(
      (channel) => !nextIds.has(channel.id),
    );

    setInputValue("");

    if (added) {
      mutateAssociation({ action: "associate", channel: added });
    } else if (removed) {
      mutateAssociation({ action: "remove", channel: removed });
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      highlightedItemRef.current
    ) {
      return;
    }

    event.preventDefault();
    requestChannel(inputValue);
  }

  const loadError = catalogQuery.error ?? selectedQuery.error;
  const isLoading = catalogQuery.isPending || selectedQuery.isPending;
  const isSaving =
    creationMutation.isPending || associationMutation.isPending;
  const operationError =
    validationError ??
    (creationMutation.error
      ? errorMessage(creationMutation.error, "Não foi possível criar o canal.")
      : associationMutation.error
        ? errorMessage(
            associationMutation.error,
            "Não foi possível salvar os canais.",
          )
        : null);

  if (isLoading) {
    return (
      <div className="grid gap-2">
        <Label>Canais de candidatura</Label>
        <div role="status" aria-live="polite">
          <Skeleton className="h-9 w-full" />
          <span className="sr-only">Carregando canais de candidatura...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="grid gap-2">
        <Label>Canais de candidatura</Label>
        <p role="alert" className="text-sm text-destructive">
          {errorMessage(
            loadError,
            "Não foi possível carregar os canais de candidatura.",
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            void catalogQuery.refetch();
            void selectedQuery.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>Canais de candidatura</Label>
      <Combobox<ChannelOption, true>
        items={options}
        multiple
        locale="pt-BR"
        value={selectedChannels}
        inputValue={inputValue}
        disabled={isSaving}
        isItemEqualToValue={(item, value) => item.id === value.id}
        itemToStringLabel={(item) =>
          item.createName ? `Criar canal ${item.createName}` : item.name
        }
        itemToStringValue={(item) => item.id}
        onInputValueChange={(value) => {
          setInputValue(value);
          setValidationError(null);
          if (!creationMutation.isPending) creationMutation.reset();
          if (!associationMutation.isPending) associationMutation.reset();
          highlightedItemRef.current = undefined;
        }}
        onItemHighlighted={(item) => {
          highlightedItemRef.current = item;
        }}
        onValueChange={handleValueChange}
      >
        <ComboboxChips ref={anchor} aria-busy={isSaving || undefined}>
          <ComboboxValue>
            {(value: ChannelOption[]) => (
              <>
                {value.map((channel) => (
                  <ComboboxChip
                    key={channel.id}
                    aria-label={channel.name}
                    removeAriaLabel={`Remover canal ${channel.name}`}
                  >
                    {channel.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={inputId}
                  value={inputValue}
                  maxLength={APPLICATION_CHANNEL_NAME_MAX_LENGTH}
                  placeholder={
                    value.length > 0
                      ? "Adicionar outro..."
                      : "Digite ou selecione canais..."
                  }
                  aria-describedby={
                    operationError
                      ? `${descriptionId} ${errorId}`
                      : descriptionId
                  }
                  aria-invalid={Boolean(operationError) || undefined}
                  onKeyDown={handleInputKeyDown}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent
          anchor={anchor}
          aria-label="Canais disponíveis"
        >
          <p className="px-3.5 py-2.5 text-xs text-muted-foreground">
            Canais disponíveis
          </p>
          <ComboboxEmpty>
            Digite um nome para criar o primeiro canal.
          </ComboboxEmpty>
          <ComboboxList>
            {(option: ChannelOption) =>
              option.createName ? (
                <ComboboxItem key={option.id} value={option}>
                  <HugeiconsIcon icon={PlusSignIcon} />
                  Criar canal “{option.createName}”
                </ComboboxItem>
              ) : (
                <ComboboxItem key={option.id} value={option}>
                  {option.name}
                </ComboboxItem>
              )
            }
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p
        id={descriptionId}
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {creationMutation.isPending ? (
          <>
            <Spinner aria-hidden="true" />
            Criando canal...
          </>
        ) : associationMutation.isPending ? (
          <>
            <Spinner aria-hidden="true" />
            Salvando canais...
          </>
        ) : (
          "Selecione canais existentes ou digite um novo. As alterações são salvas automaticamente."
        )}
      </p>
      {operationError && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {operationError}
        </p>
      )}
    </div>
  );
}
