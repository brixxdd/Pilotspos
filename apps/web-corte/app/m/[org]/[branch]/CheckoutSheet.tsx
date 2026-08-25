"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SessionCustomer } from "@pilotspos/types";
import type { PublicMenuItem } from "./MenuClient";

export type PaymentChoice = "CASH" | "CREDIT" | "MIXED";

export interface SelectionEntry {
  item: PublicMenuItem;
  quantity: number;
}

/** Redondeo a centavos: el crédito se parte en quetzales, no en fracciones. */
function toCents(value: number) {
  return Math.round(value * 100) / 100;
}

export function CheckoutSheet({
  selection,
  total,
  customer,
  orgSlug,
  loginHref,
  registerHref,
  formatQ,
  formatQuantity,
  onAdjust,
  onEmpty,
  onClose,
  onSend,
}: {
  selection: SelectionEntry[];
  total: number;
  customer: SessionCustomer | null;
  orgSlug: string;
  loginHref: string;
  registerHref: string;
  formatQ: (value: number) => string;
  formatQuantity: (quantity: number, unit: PublicMenuItem["unit"]) => string;
  onAdjust: (item: PublicMenuItem, direction: 1 | -1) => void;
  onEmpty: () => void;
  onClose: () => void;
  onSend: (payment: { choice: PaymentChoice; creditAmount: number; cashAmount: number }) => void;
}) {
  const availableCredit = customer?.availableCredit ?? 0;
  const hasCredit = availableCredit > 0;
  /** Lo máximo que este pedido puede cargar a la cuenta. */
  const maxCredit = toCents(Math.min(availableCredit, total));
  const creditCoversAll = hasCredit && availableCredit >= total;

  /**
   * La hoja no acepta toques durante su entrada. "Revisar pedido" está abajo,
   * y justo ahí aparece "Enviar pedido por WhatsApp": sin esta guarda, el clic
   * que abre la hoja podía caer sobre el de enviar y mandar el pedido solo.
   */
  const [armed, setArmed] = useState(false);
  const [choice, setChoice] = useState<PaymentChoice>("CASH");
  const [creditAmount, setCreditAmount] = useState(maxCredit);

  // El total se mueve mientras se editan cantidades dentro de la hoja; la
  // parte a crédito nunca puede quedar por encima de lo que se puede fiar.
  useEffect(() => {
    setCreditAmount((current) => Math.min(current, maxCredit));
  }, [maxCredit]);

  useEffect(() => {
    if (!hasCredit && choice !== "CASH") setChoice("CASH");
  }, [hasCredit, choice]);

  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), 380);
    return () => window.clearTimeout(timer);
  }, []);

  // Cerrar con Escape: en escritorio es el reflejo de cualquiera.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const split = useMemo(() => {
    if (choice === "CREDIT") {
      const credit = toCents(Math.min(availableCredit, total));
      return { credit, cash: toCents(total - credit) };
    }
    if (choice === "MIXED") {
      const credit = toCents(Math.min(creditAmount, maxCredit));
      return { credit, cash: toCents(total - credit) };
    }
    return { credit: 0, cash: toCents(total) };
  }, [choice, creditAmount, maxCredit, availableCredit, total]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${
        armed ? "" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-navy/50 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar pedido"
        className="animate-sheet relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-app shadow-2xl sm:max-h-[88vh] sm:max-w-lg sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-ink">Su pedido</h2>
            <p className="text-xs text-muted">
              {selection.length} {selection.length === 1 ? "producto" : "productos"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-line/60 hover:text-ink"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {selection.map(({ item, quantity }, index) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 p-3.5 ${index > 0 ? "border-t border-line" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatQuantity(quantity, item.unit)} × {formatQ(item.price)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center rounded-full border border-line bg-app p-0.5">
                  <button
                    type="button"
                    onClick={() => onAdjust(item, -1)}
                    aria-label={`Quitar ${item.name}`}
                    className="h-9 w-9 rounded-full text-lg font-semibold text-ink transition-transform hover:bg-surface active:scale-90"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjust(item, 1)}
                    aria-label={`Agregar ${item.name}`}
                    className="h-9 w-9 rounded-full text-lg font-semibold text-accent transition-transform hover:bg-surface active:scale-90"
                  >
                    +
                  </button>
                </div>

                <p className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-ink">
                  {formatQ(item.price * quantity)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-2 px-1">
            <button
              type="button"
              onClick={onEmpty}
              className="text-xs font-medium text-muted underline-offset-2 transition-colors hover:text-danger hover:underline"
            >
              Vaciar el pedido
            </button>
          </div>

          <div className="mt-3 flex items-baseline justify-between px-1">
            <span className="text-sm text-muted">Total aproximado</span>
            <span className="font-heading text-2xl font-bold tabular-nums text-ink">
              {formatQ(total)}
            </span>
          </div>
          <p className="mt-1 px-1 text-xs leading-relaxed text-muted">
            Es un estimado. El total real se calcula sobre el peso al momento de cortar.
          </p>

          <h3 className="mb-2 mt-6 px-1 font-heading text-base font-semibold text-ink">
            ¿Cómo va a pagar?
          </h3>

          <div className="space-y-2">
            <PaymentOption
              selected={choice === "CASH"}
              onSelect={() => setChoice("CASH")}
              title="Efectivo al repartidor"
              detail={`Paga ${formatQ(total)} cuando reciba`}
            />

            {hasCredit ? (
              <>
                <PaymentOption
                  selected={choice === "CREDIT"}
                  onSelect={() => setChoice("CREDIT")}
                  title="A mi cuenta (fiado)"
                  detail={
                    creditCoversAll
                      ? `Tiene ${formatQ(availableCredit)} disponibles`
                      : `Solo alcanza para ${formatQ(availableCredit)} — el resto en efectivo`
                  }
                />

                <PaymentOption
                  selected={choice === "MIXED"}
                  onSelect={() => setChoice("MIXED")}
                  title="Una parte fiada y otra en efectivo"
                  detail="Usted decide cuánto va a su cuenta"
                />

                {choice === "MIXED" && (
                  <div className="animate-rise rounded-2xl border border-accent/25 bg-accent/[0.05] p-4">
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">
                        A mi cuenta: {formatQ(split.credit)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={maxCredit}
                        step={0.5}
                        value={Math.min(creditAmount, maxCredit)}
                        onChange={(event) => setCreditAmount(Number(event.target.value))}
                        className="mt-3 w-full accent-[oklch(0.53_0.15_27)]"
                        aria-label="Cuánto cargar a su cuenta"
                      />
                    </label>
                    <div className="mt-1 flex justify-between text-xs text-muted">
                      <span>Q0</span>
                      <span>máximo {formatQ(maxCredit)}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
                {customer ? (
                  <>
                    Todavía no tiene crédito autorizado, así que este pedido va en efectivo. El fiado
                    lo aprueba el mostrador de la carnicería.
                  </>
                ) : (
                  <>
                    <Link
                      href={`/m/${orgSlug}/cuenta/entrar`}
                      className="font-semibold text-accent hover:text-accent-hover"
                    >
                      Entre a su cuenta
                    </Link>{" "}
                    para poder pagar con su crédito, si el mostrador ya se lo autorizó.
                  </>
                )}
              </p>
            )}
          </div>

          {split.credit > 0 && (
            <div className="mt-3 rounded-2xl border border-warning/30 bg-warning/[0.08] p-4">
              <p className="text-sm font-semibold text-ink">
                {formatQ(split.credit)} a su cuenta + {formatQ(split.cash)} en efectivo
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                El crédito todavía no queda apartado: el mostrador lo confirma cuando pesa el
                pedido, y ahí puede cambiar el monto.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-heading text-base font-semibold text-ink">
              Antes de enviar, dos cosas
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              En el chat de WhatsApp que se va a abrir, mande también:
            </p>

            <ol className="mt-3 space-y-3">
              <Instruction
                icon="📍"
                title="Su ubicación en tiempo real"
                detail="En WhatsApp toque el clip 📎 → Ubicación → Ubicación en tiempo real."
              />
              <Instruction
                icon="📷"
                title="Una foto de su casa"
                detail="Así el repartidor la reconoce de lejos y no anda preguntando."
              />
            </ol>
          </div>
        </div>

        <footer
          className="border-t border-line bg-surface px-5 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {!customer ? (
            <div className="space-y-3">
              <p className="text-center text-xs leading-relaxed text-muted">
                Para enviar el pedido necesitamos su nombre y cómo llegar a su casa. Se guardan una
                sola vez y viajan solos en cada pedido.
              </p>
              <Link
                href={registerHref}
                className="block w-full rounded-2xl bg-accent px-6 py-4 text-center text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
              >
                Crear mi cuenta
              </Link>
              <Link
                href={loginHref}
                className="block w-full rounded-2xl border border-line px-6 py-3.5 text-center text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
              >
                Ya tengo cuenta, entrar
              </Link>
              <p className="text-center text-xs text-muted">
                Su pedido queda guardado mientras tanto.
              </p>
            </div>
          ) : (
          <button
            type="button"
            onClick={() => onSend({ choice, creditAmount: split.credit, cashAmount: split.cash })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-[15px] font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.25.69-1.45 1.32-1.99 1.36-.53.05-1.03.24-3.47-.72-2.92-1.15-4.78-4.14-4.93-4.33-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.25.58.83 2.01.9 2.16.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.37-.42.49-.14.14-.28.29-.12.57.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.19-.29.37-.24.63-.14.25.09 1.61.76 1.89.9.28.14.46.21.53.33.07.12.07.69-.18 1.38Z" />
            </svg>
            Enviar pedido por WhatsApp
          </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function PaymentOption({
  selected,
  onSelect,
  title,
  detail,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
        selected
          ? "border-accent bg-accent/[0.06] shadow-sm"
          : "border-line bg-surface hover:border-accent/40"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? "border-accent" : "border-line"
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{detail}</span>
      </span>
    </button>
  );
}

function Instruction({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="text-lg leading-none">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{detail}</span>
      </span>
    </li>
  );
}
