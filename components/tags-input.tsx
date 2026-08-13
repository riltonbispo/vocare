"use client";

import {
  forwardRef,
  useState,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import {
  APPLICATION_SKILL_MAX_LENGTH,
  APPLICATION_SKILLS_MAX_COUNT,
  normalizeSkillTags,
} from "@/lib/application-job-details";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxValue,
} from "@/components/ui/combobox";

type TagsInputProps = {
  id: string;
  value: string[];
  onValueChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  onBlur?: () => void;
};

export const TagsInput = forwardRef<HTMLInputElement, TagsInputProps>(
  function TagsInput(
    {
      id,
      value,
      onValueChange,
      disabled = false,
      placeholder = "Digite uma skill...",
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      onBlur,
    },
    ref,
  ) {
    const [inputValue, setInputValue] = useState("");
    const [statusMessage, setStatusMessage] = useState("");

    function addTags(rawValues: string[]) {
      const candidates = rawValues
        .flatMap((rawValue) => rawValue.split(/[,\n]+/))
        .map((skill) => skill.trim())
        .filter(Boolean);

      if (candidates.length === 0) return;

      const invalidSkill = candidates.find(
        (skill) => skill.length > APPLICATION_SKILL_MAX_LENGTH,
      );

      if (invalidSkill) {
        setStatusMessage(
          `Cada skill deve ter no máximo ${APPLICATION_SKILL_MAX_LENGTH} caracteres.`,
        );
        return;
      }

      const normalized = normalizeSkillTags([...value, ...candidates]);
      const nextValue = normalized.slice(0, APPLICATION_SKILLS_MAX_COUNT);
      const ignoredCount = normalized.length - nextValue.length;

      onValueChange(nextValue);
      setInputValue("");
      setStatusMessage(
        ignoredCount > 0
          ? `${ignoredCount} ${ignoredCount === 1 ? "skill foi ignorada" : "skills foram ignoradas"}; o limite é ${APPLICATION_SKILLS_MAX_COUNT}.`
          : nextValue.length >= APPLICATION_SKILLS_MAX_COUNT
            ? `Limite de ${APPLICATION_SKILLS_MAX_COUNT} skills atingido.`
            : "",
      );
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (
        event.nativeEvent.isComposing ||
        (event.key !== "Enter" && event.key !== ",")
      ) {
        return;
      }

      event.preventDefault();
      addTags([inputValue]);
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
      const pastedText = event.clipboardData.getData("text");

      if (!pastedText.includes(",") && !pastedText.includes("\n")) return;

      event.preventDefault();
      addTags([inputValue, pastedText]);
    }

    function handleBlur(event: FocusEvent<HTMLInputElement>) {
      if (event.currentTarget.value.trim()) {
        addTags([event.currentTarget.value]);
      }

      onBlur?.();
    }

    return (
      <>
        <Combobox<string, true>
          items={value}
          multiple
          open={false}
          value={value}
          inputValue={inputValue}
          disabled={disabled}
          onInputValueChange={(nextValue) => {
            setInputValue(nextValue);
            setStatusMessage("");
          }}
          onValueChange={(nextValue) => {
            onValueChange(normalizeSkillTags(nextValue));
            setStatusMessage("");
          }}
        >
          <ComboboxChips className="min-w-0">
            <ComboboxValue>
              {(selectedSkills: string[]) => (
                <>
                  {selectedSkills.map((skill) => (
                    <ComboboxChip
                      key={skill.toLocaleLowerCase("pt-BR")}
                      className="h-auto min-h-5.5 min-w-0 max-w-full whitespace-normal"
                      aria-label={skill}
                      removeAriaLabel={`Remover skill ${skill}`}
                    >
                      <span className="min-w-0 break-all">{skill}</span>
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    ref={ref}
                    id={id}
                    value={inputValue}
                    disabled={disabled}
                    maxLength={APPLICATION_SKILL_MAX_LENGTH}
                    placeholder={
                      value.length > 0 ? "Adicionar outra..." : placeholder
                    }
                    aria-describedby={ariaDescribedBy}
                    aria-invalid={ariaInvalid || undefined}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={handleBlur}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
        </Combobox>
        <span className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </span>
      </>
    );
  },
);
