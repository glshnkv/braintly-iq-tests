"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CardStack } from "@/components/quiz/CardStack";
import { Button, CheckIcon, ErrorBox, Field, LockIcon, Spinner } from "@/components/ui";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { api, ClientApiError, track } from "@/lib/client/api";
import { useFunnelGuard } from "@/lib/client/use-funnel-guard";
import { routes } from "@/lib/routes";

interface Props {
  locale: Locale;
  dict: Dictionary["email"] & Pick<Dictionary["common"], "loading" | "errorGeneric" | "errorNetwork" | "retry">;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function EmailClient({ locale, dict }: Props) {
  const router = useRouter();
  const guard = useFunnelGuard("email", locale);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (guard.status === "ready") track("email_view");
  }, [guard.status]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError(dict.invalidEmail);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api.submitLead({ email: email.trim(), name: name.trim() || undefined });
      router.push(routes.paywall(locale));
    } catch (err) {
      setPending(false);
      setError(err instanceof ClientApiError && err.code === "invalid_input" ? dict.invalidEmail : dict.errorGeneric);
    }
  }

  if (guard.status === "error") return <ErrorBox message={dict.errorNetwork} onRetry={guard.retry} retryLabel={dict.retry} />;
  if (guard.status === "loading") return <Spinner label={dict.loading} />;

  return (
    <div className="flex flex-col items-center pt-2 sm:pt-8">
      <CardStack cardKey="email" leaving={false}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col">
          <h1 className="text-title">{dict.title}</h1>
          <p className="mt-2 text-[15px] font-medium text-ink/55">{dict.subtitle}</p>

          {/* What's inside the report — a quick, scannable checklist instead of a long sentence. */}
          <ul className="mt-6 flex flex-wrap gap-1.5">
            {dict.contents.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 rounded-full bg-gray-soft py-1.5 pl-1.5 pr-3 text-[13px] font-semibold">
                <span className="grid size-5 place-items-center rounded-full bg-ink text-white">
                  <CheckIcon className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-4">
            <Field
              label={dict.emailLabel}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder={dict.emailPlaceholder}
              aria-invalid={!!error}
            />
            <Field
              label={dict.nameLabel}
              type="text"
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={dict.namePlaceholder}
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-orange-dark">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} arrow={!pending} className="mt-6">
            {pending ? dict.loading : dict.submit}
          </Button>
          <p className="mt-4 text-center text-[13px] font-medium text-ink/45 text-balance">
            <LockIcon className="mr-1.5 inline size-3.5 -translate-y-px" />
            {dict.privacy}
          </p>
        </form>
      </CardStack>
    </div>
  );
}
