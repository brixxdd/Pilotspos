"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SessionCustomer } from "@pilotspos/types";
import { CheckoutSheet, type PaymentChoice } from "./CheckoutSheet";
import { clearCart, loadCart, reconcileCart, saveCart, type RestoredCart } from "@/lib/menu-cart";

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: "UNIT" | "LB";
  available: boolean;
}

export interface PublicMenu {
  business: { name: string; slug: string };
  branch: { name: string; slug: string; address: string | null };
  branches: Array<{ name: string; slug: string }>;
  updatedAt: string;
  categories: Array<{ name: string; items: PublicMenuItem[] }>;
}

/** Todo se muestra en la zona horaria del negocio, no en la del celular. */
const TIME_ZONE = "America/Guatemala";

const decimals = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * `Q52.00`, pegado, como se escribe en Guatemala. `Intl` con
 * `currency: "GTQ"` inserta un espacio duro entre la Q y el número.
 */
const quetzales = {
  format: (value: number) => `Q${decimals.format(value)}`,
};

const longDate = new Intl.DateTimeFormat("es-GT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

/** La carne se pide en medias libras; lo que se vende por pieza, de una en una. */
function stepFor(unit: PublicMenuItem["unit"]) {
  return unit === "LB" ? 0.5 : 1;
}

function formatQuantity(quantity: number, unit: PublicMenuItem["unit"]) {
  if (unit === "UNIT") return `${quantity}`;
  // 1 lb y 1.5 lb, nunca 1.000 lb: el cliente no lee decimales de báscula.
  return `${Number.isInteger(quantity) ? quantity : quantity.toFixed(1)} lb`;
}

function unitLabel(unit: PublicMenuItem["unit"]) {
  return unit === "LB" ? "libra" : "pieza";
}

function anchorFor(categoryName: string) {
  return `cat-${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/**
 * Un ícono por categoría. La carnicería no tiene fotos de sus cortes y pedirle
 * que las tome es pedirle que no use el sistema; el ícono da color y hace
 * escaneable la lista sin depender de que suban nada.
 */
const CATEGORY_ICONS: Array<[RegExp, string]> = [
  [/res|bistec|lomo/i, "🥩"],
  [/cerdo|marrano|chicharr/i, "🐖"],
  [/pollo|ave|gallina/i, "🍗"],
  [/embutido|chorizo|salchich|longaniza|jam/i, "🌭"],
  [/v[ií]scera|menudo|h[ií]gado|moronga/i, "🫀"],
  [/queso|crema|l[áa]cteo|huevo/i, "🧀"],
];

function iconFor(categoryName: string) {
  return CATEGORY_ICONS.find(([pattern]) => pattern.test(categoryName))?.[1] ?? "🧺";
}

/** Quita acentos para que "vísceras" se encuentre escribiendo "visceras". */
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function MenuClient({
  menu,
  whatsapp,
  customer,
}: {
  menu: PublicMenu;
  whatsapp: string;
  customer: SessionCustomer | null;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // El carrito guardado se lee después de montar, nunca durante el render: el
  // servidor no puede ver `localStorage` y pintarlo en el HTML rompería la
  // hidratación de React.
  // La barra fija no acepta toques durante su entrada. Sin esto, el clic que
  // el navegador despacha tras tocar "Pedir" aterriza sobre "Revisar pedido",
  // que acaba de aparecer en ese mismo punto de la pantalla, y el pedido se
  // abre solo en el primer producto que agregas.
  const [barArmed, setBarArmed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState<RestoredCart | null>(null);
  // Cambia en cada toque para reiniciar la animación del contador.
  const [pulse, setPulse] = useState(0);

  const cartScope = useRef({ org: menu.business.slug, branch: menu.branch.slug });

  const itemsById = useMemo(() => {
    const map = new Map<string, PublicMenuItem>();
    for (const category of menu.categories) {
      for (const item of category.items) map.set(item.id, item);
    }
    return map;
  }, [menu]);

  /**
   * Sin catálogo no se toca el carrito guardado. Si el menú llega vacío
   * —API caída, señal mala— reconciliar contra él concluiría que todos los
   * productos dejaron de venderse, y el efecto de guardado escribiría ese
   * vacío encima: el pedido del cliente borrado para siempre por un bache de
   * red. Ante la duda, no se escribe.
   */
  const catalogReady = itemsById.size > 0;

  useEffect(() => {
    if (!catalogReady) return;

    const { org, branch } = cartScope.current;
    const stored = loadCart(org, branch);
    if (stored) {
      const result = reconcileCart(stored, itemsById);
      setQuantities(result.quantities);
      // Solo vale la pena avisar si el carrito no es de este mismo rato.
      const worthMentioning =
        result.ageDays >= 1 || result.removedCount > 0 || result.repricedNames.length > 0;
      if (worthMentioning && Object.keys(result.quantities).length > 0) setRestored(result);
    }
    setHydrated(true);
  }, [itemsById, catalogReady]);

  useEffect(() => {
    if (!hydrated || !catalogReady) return;
    const { org, branch } = cartScope.current;
    const lines = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .reduce<Record<string, { quantity: number; price: number }>>((acc, [id, quantity]) => {
        const item = itemsById.get(id);
        if (item) acc[id] = { quantity, price: item.price };
        return acc;
      }, {});
    saveCart(org, branch, lines);
  }, [quantities, hydrated, itemsById, catalogReady]);

  useEffect(() => {
    if (!hydrated) return;
    if (new URLSearchParams(window.location.search).get("pedido") !== "1") return;
    setCheckoutOpen(true);
    // Se limpia el parámetro para que recargar no vuelva a abrirla sola.
    window.history.replaceState({}, "", window.location.pathname);
  }, [hydrated]);

  const visibleCategories = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return menu.categories;

    return menu.categories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            normalize(item.name).includes(term) ||
            normalize(item.description ?? "").includes(term) ||
            normalize(category.name).includes(term),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [menu.categories, search]);

  const selection = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([id, quantity]) => ({ item: itemsById.get(id), quantity }))
        .filter((entry): entry is { item: PublicMenuItem; quantity: number } => Boolean(entry.item)),
    [quantities, itemsById],
  );

  const total = selection.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  function adjust(item: PublicMenuItem, direction: 1 | -1) {
    setQuantities((current) => {
      const step = stepFor(item.unit);
      const next = Math.max(0, (current[item.id] ?? 0) + step * direction);
      // Se redondea porque 0.1 + 0.2 en punto flotante no da 0.3.
      return { ...current, [item.id]: Math.round(next * 1000) / 1000 };
    });
    setPulse((n) => n + 1);
  }

  function handleSend(payment: { choice: PaymentChoice; creditAmount: number; cashAmount: number }) {
    const url = buildOrderUrl(payment);
    if (!url) return;
    // `noopener` explícito: `window.open` sin él deja al sitio destino con una
    // referencia a esta pestaña.
    window.open(url, "_blank", "noopener,noreferrer");
    setCheckoutOpen(false);
    setQuantities({});
    setRestored(null);
    clearCart(menu.business.slug, menu.branch.slug);
  }

  function emptyCart() {
    setQuantities({});
    setRestored(null);
    clearCart(menu.business.slug, menu.branch.slug);
  }

  function buildOrderUrl(payment: {
    choice: PaymentChoice;
    creditAmount: number;
    cashAmount: number;
  }) {
    // Sin cuenta no se arma el pedido. La carnicería necesita saber a nombre
    // de quién es y cómo llegar; los renglones en blanco que se dejaban antes
    // casi nadie los llenaba, y llegaban pedidos imposibles de entregar.
    if (!whatsapp || !customer || selection.length === 0) return null;

    const lines = selection.map(
      ({ item, quantity }) =>
        `• ${formatQuantity(quantity, item.unit)} — ${item.name} (${quetzales.format(item.price)}/${
          item.unit === "LB" ? "lb" : "pieza"
        })`,
    );

    const delivery = [
      `Soy ${customer.firstName} ${customer.lastName} (${customer.phone}).`,
      customer.addressLine ? `Dirección: ${customer.addressLine}` : null,
      customer.addressReferences ? `Cómo llegar: ${customer.addressReferences}` : null,
    ].filter((line): line is string => Boolean(line));

    const payLine =
      payment.choice === "CASH"
        ? `Pago: efectivo al repartidor (${quetzales.format(payment.cashAmount)}).`
        : payment.creditAmount >= total
          ? `Pago: a mi cuenta / fiado (${quetzales.format(payment.creditAmount)}), si el mostrador lo autoriza.`
          : `Pago: ${quetzales.format(payment.creditAmount)} a mi cuenta (fiado) y ${quetzales.format(
              payment.cashAmount,
            )} en efectivo, si el mostrador lo autoriza.`;

    const message = [
      `Hola, quiero hacer un pedido en ${menu.business.name} — sucursal ${menu.branch.name}:`,
      "",
      ...lines,
      "",
      `Total aproximado: ${quetzales.format(total)}`,
      "(el total final se ajusta al pesar)",
      "",
      payLine,
      "",
      ...delivery,
      "",
      "Enseguida les mando mi ubicación en tiempo real y una foto de mi casa.",
    ].join("\n");

    return `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  }

  const hasOrder = selection.length > 0;

  // Al volver de crear cuenta se retoma justo donde se quedó: el carrito sigue
  // en el navegador y `?pedido=1` reabre la hoja para que solo confirme.
  const returnTo = encodeURIComponent(
    `/m/${menu.business.slug}/${menu.branch.slug}?pedido=1`,
  );
  const loginHref = `/m/${menu.business.slug}/cuenta/entrar?next=${returnTo}`;
  const registerHref = `/m/${menu.business.slug}/cuenta/registro?next=${returnTo}`;

  useEffect(() => {
    if (!hasOrder) {
      setBarArmed(false);
      return;
    }
    // Un poco más que la animación de entrada (0.32s).
    const timer = window.setTimeout(() => setBarArmed(true), 420);
    return () => window.clearTimeout(timer);
  }, [hasOrder]);

  useEffect(() => {
    if (!hasOrder) {
      setBarArmed(false);
      return;
    }
    // Un poco más que la animación de entrada (0.32s).
    const timer = window.setTimeout(() => setBarArmed(true), 420);
    return () => window.clearTimeout(timer);
  }, [hasOrder]);
  const accountHref = customer ? `/m/${menu.business.slug}/cuenta` : `/m/${menu.business.slug}/cuenta/entrar`;

  const categoryNav = (
    <>
      {menu.categories.map((category) => (
        <a
          key={category.name}
          href={`#${anchorFor(category.name)}`}
          className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-all duration-200 hover:border-accent hover:text-accent active:scale-95 lg:w-full lg:rounded-2xl lg:border-transparent lg:bg-transparent lg:px-3 lg:hover:bg-surface"
        >
          <span aria-hidden="true">{iconFor(category.name)}</span>
          {category.name}
          <span className="ml-auto hidden text-xs tabular-nums text-muted lg:inline">
            {category.items.length}
          </span>
        </a>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-app">
      <header className="menu-hero px-5 pb-8 pt-7 text-white sm:px-8 sm:pb-10 sm:pt-9">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="animate-rise text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-secondary">
                Precios de hoy
              </p>
              <h1 className="animate-rise mt-1.5 font-heading text-[2rem] font-bold leading-[1.1] sm:text-[2.75rem]">
                {menu.business.name}
              </h1>
              <p
                className="animate-rise mt-1.5 text-sm capitalize text-white/55"
                style={{ animationDelay: "60ms" }}
              >
                {longDate.format(new Date(menu.updatedAt))}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                disabled={!hasOrder}
                aria-label={
                  hasOrder
                    ? `Ver el pedido: ${selection.length} ${
                        selection.length === 1 ? "producto" : "productos"
                      }`
                    : "Su pedido está vacío"
                }
                className="animate-rise relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:hover:bg-white/10"
                style={{ animationDelay: "90ms" }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M7 4V3a1 1 0 0 1 2 0v1h6V3a1 1 0 1 1 2 0v1h1.6a2 2 0 0 1 1.99 2.2l-1.2 12A2 2 0 0 1 17.4 20H6.6a2 2 0 0 1-1.99-1.8l-1.2-12A2 2 0 0 1 5.4 4H7Zm-1.6 2 1.2 12h10.8l1.2-12H5.4Z" />
                </svg>
                {hasOrder && (
                  <span
                    key={pulse}
                    className="animate-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-white shadow-md shadow-black/40"
                  >
                    {selection.length}
                  </span>
                )}
              </button>

              <Link
                href={accountHref}
                className="animate-rise flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 active:scale-95"
                style={{ animationDelay: "110ms" }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold"
                >
                  {customer ? customer.firstName.charAt(0).toUpperCase() : "?"}
                </span>
                <span className="hidden sm:inline">{customer ? customer.firstName : "Entrar"}</span>
              </Link>
            </div>
          </div>

          {menu.branches.length > 1 && (
            <nav
              className="animate-rise mt-6 flex flex-wrap gap-2"
              style={{ animationDelay: "110ms" }}
              aria-label="Sucursales"
            >
              {menu.branches.map((branch) => {
                const isCurrent = branch.slug === menu.branch.slug;
                return (
                  <Link
                    key={branch.slug}
                    href={`/m/${menu.business.slug}/${branch.slug}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm transition-all duration-200 active:scale-95 ${
                      isCurrent
                        ? "bg-accent font-semibold text-white shadow-lg shadow-black/25"
                        : "bg-white/10 font-medium text-white/75 hover:bg-white/20"
                    }`}
                  >
                    {branch.name}
                  </Link>
                );
              })}
            </nav>
          )}

          {menu.branch.address && (
            <p
              className="animate-rise mt-4 text-sm leading-relaxed text-white/45"
              style={{ animationDelay: "150ms" }}
            >
              {menu.branch.address}
            </p>
          )}

          <div className="animate-rise relative mt-6" style={{ animationDelay: "180ms" }}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
            >
              <path
                fill="currentColor"
                d="M10 2a8 8 0 1 0 4.9 14.32l5.39 5.39 1.42-1.42-5.39-5.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar un corte…"
              aria-label="Buscar en el menú"
              className="w-full rounded-2xl border border-white/10 bg-surface py-4 pl-12 pr-4 text-[15px] text-ink shadow-xl shadow-black/20 outline-none transition-all duration-200 placeholder:text-muted/70 focus:ring-4 focus:ring-accent/30"
            />
          </div>
        </div>
      </header>

      {menu.categories.length > 1 && (
        <div className="sticky top-0 z-20 border-b border-line/70 bg-app/85 backdrop-blur-md lg:hidden">
          <div className="no-scrollbar mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {categoryNav}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-5xl gap-8 px-4 py-6 sm:px-6">
        {menu.categories.length > 1 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-6 space-y-1">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Categorías
              </p>
              {categoryNav}

              <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
                {customer ? (
                  <>
                    <p className="text-sm font-semibold text-ink">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {customer.creditLimit > 0
                        ? `${quetzales.format(customer.availableCredit)} de fiado disponible`
                        : "Sin crédito autorizado"}
                    </p>
                    <Link
                      href={`/m/${menu.business.slug}/cuenta`}
                      className="mt-3 block text-sm font-semibold text-accent hover:text-accent-hover"
                    >
                      Mi cuenta →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-ink">Pida más rápido</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Con cuenta, su dirección y sus referencias viajan solas en cada pedido.
                    </p>
                    <Link
                      href={`/m/${menu.business.slug}/cuenta/entrar`}
                      className="mt-3 block text-sm font-semibold text-accent hover:text-accent-hover"
                    >
                      Entrar o registrarse →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}

        <main className={`min-w-0 flex-1 ${hasOrder ? "pb-40" : "pb-16"}`}>
          {restored && (
            <div className="animate-rise mb-5 rounded-2xl border border-warning/30 bg-warning/[0.08] p-4">
              <p className="text-sm font-semibold text-ink">
                {restored.ageDays >= 1
                  ? `Le guardamos el pedido que armó ${
                      restored.ageDays === 1 ? "ayer" : `hace ${restored.ageDays} días`
                    }`
                  : "Le guardamos el pedido que había armado"}
              </p>

              {(restored.repricedNames.length > 0 || restored.removedCount > 0) && (
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted">
                  {restored.repricedNames.length > 0 && (
                    <li>
                      Cambió el precio de{" "}
                      <span className="font-medium text-ink">
                        {restored.repricedNames.slice(0, 3).join(", ")}
                      </span>
                      {restored.repricedNames.length > 3 &&
                        ` y ${restored.repricedNames.length - 3} más`}
                      . El total ya está actualizado.
                    </li>
                  )}
                  {restored.removedCount > 0 && (
                    <li>
                      {restored.removedCount === 1
                        ? "Un producto ya no está en el menú y se quitó."
                        : `${restored.removedCount} productos ya no están en el menú y se quitaron.`}
                    </li>
                  )}
                </ul>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRestored(null)}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Seguir con este pedido
                </button>
                <button
                  type="button"
                  onClick={emptyCart}
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger"
                >
                  Empezar de nuevo
                </button>
              </div>
            </div>
          )}

          {visibleCategories.length === 0 ? (
            <div className="rounded-3xl border border-line bg-surface p-10 text-center">
              <p className="font-heading text-lg font-semibold text-ink">
                {search.trim() ? `Nada con “${search.trim()}”` : "Todavía no hay cortes publicados"}
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
                {search.trim()
                  ? "Pruebe con otra palabra, o pregunte en el mostrador."
                  : "Pregunte en el mostrador por los precios de hoy."}
              </p>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-4 rounded-full border border-accent px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
                >
                  Ver todo el menú
                </button>
              )}
            </div>
          ) : (
            visibleCategories.map((category, categoryIndex) => (
              <section key={category.name} id={anchorFor(category.name)} className="mb-8 scroll-mt-20">
                <h2 className="mb-3 flex items-center gap-2.5 px-1 font-heading text-lg font-semibold tracking-tight text-ink">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-lg shadow-sm ring-1 ring-line"
                  >
                    {iconFor(category.name)}
                  </span>
                  {category.name}
                </h2>

                <ul className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm shadow-black/[0.03]">
                  {category.items.map((item, index) => {
                    const quantity = quantities[item.id] ?? 0;
                    const isSelected = quantity > 0;

                    return (
                      <li
                        key={item.id}
                        className={`animate-rise flex items-center gap-3 p-4 transition-colors duration-300 sm:gap-4 sm:p-5 ${
                          index > 0 ? "border-t border-line" : ""
                        } ${isSelected ? "bg-accent/[0.04]" : ""}`}
                        style={{
                          animationDelay: `${Math.min(categoryIndex * 60 + index * 45, 500)}ms`,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug text-ink">
                            {item.name}
                            {!item.available && (
                              <span className="ml-2 rounded-full bg-app px-2 py-0.5 align-middle text-[11px] font-medium text-muted">
                                Sin existencia
                              </span>
                            )}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
                              {item.description}
                            </p>
                          )}
                          <p className="mt-1.5 text-[15px] font-bold tabular-nums text-accent">
                            {quetzales.format(item.price)}
                            <span className="text-sm font-normal text-muted">
                              {" "}
                              / {unitLabel(item.unit)}
                            </span>
                          </p>
                        </div>

                        {isSelected ? (
                          <div className="flex shrink-0 items-center rounded-full border border-accent/30 bg-surface p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={() => adjust(item, -1)}
                              aria-label={`Quitar ${item.name}`}
                              className="h-11 w-11 rounded-full text-xl font-semibold text-ink transition-transform duration-150 hover:bg-app active:scale-90"
                            >
                              −
                            </button>
                            <span
                              key={pulse}
                              className="animate-pop min-w-[3.75rem] text-center text-sm font-bold tabular-nums text-ink"
                            >
                              {formatQuantity(quantity, item.unit)}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjust(item, 1)}
                              aria-label={`Agregar ${item.name}`}
                              className="h-11 w-11 rounded-full text-xl font-semibold text-accent transition-transform duration-150 hover:bg-app active:scale-90"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => adjust(item, 1)}
                            className="h-11 shrink-0 rounded-full border border-accent px-5 text-sm font-semibold text-accent transition-all duration-200 hover:bg-accent hover:text-white active:scale-95"
                          >
                            Pedir
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}

          <p className="px-1 text-xs leading-relaxed text-muted">
            Los precios pueden cambiar durante el día. El total se calcula sobre el peso real al
            momento de cortar.
          </p>
        </main>
      </div>

      {hasOrder && (
        <div
          className={`animate-slide-up fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md ${
            barArmed ? "" : "pointer-events-none"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto max-w-5xl px-4 py-3.5 sm:px-6">
            {!customer && (
              <p className="mb-2.5 text-xs leading-relaxed text-muted">
                <Link
                  href={`/m/${menu.business.slug}/cuenta/entrar`}
                  className="font-semibold text-accent hover:text-accent-hover"
                >
                  Entre a su cuenta
                </Link>{" "}
                y su dirección y referencias van solas en el pedido.
              </p>
            )}

            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  {selection.length} {selection.length === 1 ? "producto" : "productos"} · aproximado
                </p>
                <p
                  key={pulse}
                  className="animate-pop font-heading text-2xl font-bold tabular-nums leading-tight text-ink"
                >
                  {quetzales.format(total)}
                </p>
              </div>

              {whatsapp ? (
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover active:scale-95"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.25.69-1.45 1.32-1.99 1.36-.53.05-1.03.24-3.47-.72-2.92-1.15-4.78-4.14-4.93-4.33-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.25.58.83 2.01.9 2.16.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.37-.42.49-.14.14-.28.29-.12.57.16.29.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.19.7-.81.88-1.09.19-.29.37-.24.63-.14.25.09 1.61.76 1.89.9.28.14.46.21.53.33.07.12.07.69-.18 1.38Z" />
                  </svg>
                  Revisar pedido
                </button>
              ) : (
                <span className="shrink-0 rounded-full bg-app px-6 py-4 text-sm font-semibold text-muted">
                  WhatsApp no configurado
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && hasOrder && (
        <CheckoutSheet
          selection={selection}
          total={total}
          customer={customer}
          orgSlug={menu.business.slug}
          loginHref={loginHref}
          registerHref={registerHref}
          formatQ={quetzales.format}
          formatQuantity={formatQuantity}
          onAdjust={adjust}
          onEmpty={() => {
            emptyCart();
            setCheckoutOpen(false);
          }}
          onClose={() => setCheckoutOpen(false)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
