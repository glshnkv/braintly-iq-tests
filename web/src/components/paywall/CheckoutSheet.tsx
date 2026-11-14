"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, CloseIcon, Field, LockIcon, MonoLabel } from "@/components/ui";
import { LegalText } from "@/components/legal/LegalLink";
import { STATEMENT_DESCRIPTOR } from "@/config/legal";
import { CHECKOUT } from "@/config/product";
import type { Dictionary } from "@/i18n";
import type { CheckoutResponse, PaymentMethod } from "@/lib/api-types";
import { api, ClientApiError, track } from "@/lib/client/api";
import { fmt } from "@/lib/format";
import { formatCardNumber, formatExpiry, isCvcValid, isExpiryValid, isLuhnValid } from "@/lib/payments/card";

interface Props {
  dict: Dictionary["checkout"] & { errorGeneric: string; errorNetwork: string; demo: string; legal: Dictionary["legal"]["checkout"] };
  priceLabel: string;
  /** Auto-renewal facts for the disclosure under the pay button. */
  renewal: { days: number; price: string; period: number };
  onClose: () => void;
  onSuccess: (res: CheckoutResponse) => void;
}

type ErrorKey = keyof Dictionary["checkout"]["errors"];

/** Bottom sheet on phones, centred dialog on larger screens. Simulates a payment provider. */
export function CheckoutSheet({ dict, priceLabel, renewal, onClose, onSuccess }: Props) {
  const [number, setNumber] = useState<string>(CHECKOUT.demoCardNumber);
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [pending, setPending] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("checkout_open");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    // Keep the page behind the sheet still.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, pending]);

  async function pay(body: Parameters<typeof api.checkout>[0]) {
    setPending(body.method);
    setError(null);
    try {
      onSuccess(await api.checkout(body));
    } catch (err) {
      setPending(null);
      if (err instanceof ClientApiError && err.code in dict.errors) setError(dict.errors[err.code as ErrorKey]);
      else if (err instanceof ClientApiError && err.code === "network") setError(dict.errorNetwork);
      else setError(dict.errorGeneric);
    }
  }

  function onCardSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLuhnValid(number) || !isExpiryValid(expiry) || !isCvcValid(cvc)) {
      setError(dict.errors.invalid_card);
      return;
    }
    void pay({ method: "card", card: { number, expiry, cvc } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/45 backdrop-blur-[2px] animate-fade-in sm:p-6" onClick={() => !pending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict.title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] max-h-[94svh] overflow-y-auto rounded-t-card sm:rounded-card bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7 animate-sheet-up"
      >
        <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-gray sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-[-0.025em]">{dict.title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!!pending}
            aria-label={dict.close}
            className="grid size-9 place-items-center rounded-full bg-gray-soft text-ink/55 hover:bg-gray hover:text-ink transition-colors disabled:opacity-40"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-5 flex items-end justify-between rounded-tile bg-gray-soft px-5 py-4">
          <MonoLabel muted className="pb-1">{dict.total}</MonoLabel>
          <span className="text-3xl font-extrabold tracking-[-0.04em] leading-none">{priceLabel}</span>
        </div>

        <div className="mt-4 grid gap-2">
          <Button variant="ink" disabled={!!pending} onClick={() => pay({ method: "apple_pay" })}>
            {pending === "apple_pay" ? dict.processing : dict.applePay}
          </Button>
          <Button variant="soft" disabled={!!pending} onClick={() => pay({ method: "google_pay" })}>
            {pending === "google_pay" ? dict.processing : dict.googlePay}
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3 text-ink/35">
          <span className="h-px flex-1 bg-ink/10" />
          <span className="text-label">{dict.orCard}</span>
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <form onSubmit={onCardSubmit} noValidate className="flex flex-col gap-3">
          <Field
            label={dict.cardNumber}
            inputMode="numeric"
            autoComplete="cc-number"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={dict.expiry}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="12/30"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            />
            <Field
              label={dict.cvc}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-orange-dark">
              {error}
            </p>
          )}
          <Button type="submit" variant="accent" disabled={!!pending} className="mt-2">
            <LockIcon />
            {pending === "card" ? dict.processing : fmt(dict.pay, { price: priceLabel })}
          </Button>
        </form>

        {/* Auto-renewal disclosure: the full terms, right at the point of payment. */}
        <p className="mt-4 text-[11.5px] font-medium leading-relaxed text-ink/45 text-pretty">
          <LegalText template={dict.legal.text} labels={dict.legal.labels} vars={renewal} />
        </p>
        <div className="mt-3 flex gap-2.5 rounded-control bg-gray-soft px-3.5 py-3 text-[11.5px] font-medium leading-relaxed text-ink/50">
          <LockIcon className="mt-px size-3.5 shrink-0" />
          <p>
            {dict.legal.secure} {fmt(dict.legal.descriptor, { descriptor: STATEMENT_DESCRIPTOR })}
          </p>
        </div>

        <p className="mt-4 text-center text-[12px] font-medium leading-relaxed text-ink/40">{fmt(dict.testHint, { card: CHECKOUT.demoCardNumber })}</p>
        <p className="mt-1 text-center text-[12px] font-semibold text-orange-dark">{dict.demo}</p>
      </div>
    </div>
  );
}
