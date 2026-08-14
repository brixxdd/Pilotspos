"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateChange,
  calculateDiscount,
  calculateSubtotal,
  calculateTotal,
} from "@pilotspos/domain";
import type { PaymentMethod, UserRole } from "@pilotspos/types";
import { Alert, Badge, Button, Input, Modal, PageHeader, Select } from "@pilotspos/ui";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { TicketModal } from "./TicketModal";
import type { CartLine, ProductLookup, SaleTicket, SuspendedSaleRow } from "./types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MIXED: "Pago mixto",
};

export function SalesClient({ role }: { role: UserRole }) {
  const canDiscount = role === "ADMIN" || role === "MANAGER";
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcode, setBarcode] = useState("");
  const [searchResults, setSearchResults] = useState<ProductLookup[]>([]);
  const [discountInput, setDiscountInput] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [receivedCash, setReceivedCash] = useState(0);
  const [mixed, setMixed] = useState({ cash: 0, card: 0, transfer: 0 });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<SaleTicket | null>(null);
  const [suspendedOpen, setSuspendedOpen] = useState(false);
  const [suspendedList, setSuspendedList] = useState<SuspendedSaleRow[]>([]);
  const [note, setNote] = useState("");

  const subtotal = calculateSubtotal(cart.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })));
  const discount = canDiscount ? calculateDiscount(subtotal, discountInput) : 0;
  const total = calculateTotal(subtotal, discount);
  const change = method === "CASH" ? calculateChange(total, receivedCash) : null;

  const mixedTotal = mixed.cash + mixed.card + mixed.transfer;

  function addToCart(product: { id: string; name: string; price: string | number; stock: number }) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      const unitPrice = Number(product.price);
      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          setError(`No hay suficiente stock de ${product.name}`);
          return prev;
        }
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (product.stock < 1) {
        setError(`${product.name} no tiene stock disponible`);
        return prev;
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice, quantity: 1, stock: product.stock }];
    });
  }

  async function handleBarcodeSubmit() {
    const code = barcode.trim();
    if (!code) return;
    setError(null);
    try {
      const { product } = await apiFetch<{ product: ProductLookup }>(
        `/products/barcode/${encodeURIComponent(code)}`,
      );
      addToCart(product);
      setBarcode("");
      setSearchResults([]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo buscar el producto");
    }
  }

  useEffect(() => {
    const query = barcode.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { items } = await apiFetch<{ items: ProductLookup[] }>(
          `/products?search=${encodeURIComponent(query)}&onlyActive=true&pageSize=6`,
        );
        setSearchResults(items);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [barcode]);

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(Math.max(quantity, 1), l.stock) } : l)),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  function resetSale() {
    setCart([]);
    setDiscountInput(0);
    setReceivedCash(0);
    setMixed({ cash: 0, card: 0, transfer: 0 });
    setMethod("CASH");
    setNote("");
  }

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;
    setError(null);

    let payments: { method: PaymentMethod; amount: number; receivedAmount?: number }[];
    if (method === "MIXED") {
      if (Math.round(mixedTotal * 100) !== Math.round(total * 100)) {
        setError("La suma de los pagos mixtos debe coincidir con el total");
        return;
      }
      payments = [
        mixed.cash > 0 ? { method: "CASH" as const, amount: mixed.cash, receivedAmount: mixed.cash } : null,
        mixed.card > 0 ? { method: "CARD" as const, amount: mixed.card } : null,
        mixed.transfer > 0 ? { method: "TRANSFER" as const, amount: mixed.transfer } : null,
      ].filter((p): p is NonNullable<typeof p> => p !== null);
    } else if (method === "CASH") {
      if (receivedCash < total) {
        setError("El efectivo recibido es insuficiente");
        return;
      }
      payments = [{ method: "CASH", amount: total, receivedAmount: receivedCash }];
    } else {
      payments = [{ method, amount: total }];
    }

    setSubmitting(true);
    try {
      const registerId = "00000000-0000-0000-0000-000000000000"; // el servidor deriva la caja real de la sesión abierta
      const { sale } = await apiFetch<{ sale: SaleTicket }>("/sales", {
        method: "POST",
        body: JSON.stringify({
          registerId,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          discount,
          payments,
        }),
      });
      setLastSale(sale);
      resetSale();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo completar la venta");
    } finally {
      setSubmitting(false);
    }
  }, [cart, method, mixed, mixedTotal, receivedCash, total, discount]);

  async function handleSuspend() {
    if (cart.length === 0) return;
    setError(null);
    try {
      const registerId = "00000000-0000-0000-0000-000000000000";
      await apiFetch("/sales/suspend", {
        method: "POST",
        body: JSON.stringify({
          registerId,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          discount,
          note: note || undefined,
        }),
      });
      resetSale();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo suspender la venta");
    }
  }

  async function openSuspended() {
    try {
      const { items } = await apiFetch<{ items: SuspendedSaleRow[] }>("/sales/suspended");
      setSuspendedList(items);
      setSuspendedOpen(true);
    } catch {
      setError("No se pudo cargar la lista de ventas suspendidas");
    }
  }

  async function recoverSuspended(id: string) {
    try {
      const result = await apiFetch<{ items: CartLine[]; discount: number }>(
        `/sales/suspended/${id}/recover`,
        { method: "POST" },
      );
      setCart(result.items);
      setDiscountInput(result.discount);
      setSuspendedOpen(false);
    } catch {
      setError("No se pudo recuperar la venta");
    }
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        barcodeRef.current?.focus();
      } else if (event.key === "F8") {
        event.preventDefault();
        handleCheckout();
      } else if (event.key === "Escape") {
        setSuspendedOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleCheckout]);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Ventas"
        description="F2 escáner · F8 cobrar · ESC cancelar"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={openSuspended}>
              Recuperar venta
            </Button>
            <Button variant="secondary" onClick={handleSuspend} disabled={cart.length === 0}>
              Suspender
            </Button>
          </div>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="relative">
            <Input
              ref={barcodeRef}
              autoFocus
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleBarcodeSubmit();
                }
              }}
              placeholder="Código de barras o nombre del producto..."
            />
            {searchResults.length > 0 ? (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-line bg-white shadow-lg">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      addToCart(product);
                      setBarcode("");
                      setSearchResults([]);
                      barcodeRef.current?.focus();
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-app"
                  >
                    <span>{product.name}</span>
                    <span className="text-muted">${Number(product.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-auto rounded-md border border-line bg-white">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center p-10 text-sm text-muted">
                Escanea o busca un producto para comenzar la venta.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-app text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Precio</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Subtotal</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {cart.map((line) => (
                    <tr key={line.productId}>
                      <td className="px-3 py-2 text-ink">{line.name}</td>
                      <td className="px-3 py-2 text-muted">${line.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={line.quantity}
                          min={1}
                          max={line.stock}
                          onChange={(e) => updateQuantity(line.productId, Number(e.target.value))}
                          className="w-16 rounded border border-line px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2 text-ink">${(line.unitPrice * line.quantity).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId)}
                          className="text-muted hover:text-danger"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Venta actual</h2>

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="text-ink">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Descuento</span>
              {canDiscount ? (
                <input
                  type="number"
                  min={0}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(Number(e.target.value))}
                  className="w-24 rounded border border-line px-2 py-1 text-right"
                />
              ) : (
                <span className="text-ink">${discount.toFixed(2)}</span>
              )}
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <Select
            label="Método de pago"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            options={Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label }))}
          />

          {method === "CASH" ? (
            <div className="flex flex-col gap-2">
              <Input
                label="Recibido"
                type="number"
                step="0.01"
                value={receivedCash}
                onChange={(e) => setReceivedCash(Number(e.target.value))}
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted">Cambio</span>
                <span className={change !== null && change >= 0 ? "text-success" : "text-danger"}>
                  ${change !== null ? change.toFixed(2) : "—"}
                </span>
              </div>
            </div>
          ) : null}

          {method === "MIXED" ? (
            <div className="flex flex-col gap-2">
              <Input
                label="Efectivo"
                type="number"
                value={mixed.cash}
                onChange={(e) => setMixed((m) => ({ ...m, cash: Number(e.target.value) }))}
              />
              <Input
                label="Tarjeta"
                type="number"
                value={mixed.card}
                onChange={(e) => setMixed((m) => ({ ...m, card: Number(e.target.value) }))}
              />
              <Input
                label="Transferencia"
                type="number"
                value={mixed.transfer}
                onChange={(e) => setMixed((m) => ({ ...m, transfer: Number(e.target.value) }))}
              />
              <div className="flex justify-between text-xs text-muted">
                <span>Suma</span>
                <span>
                  ${mixedTotal.toFixed(2)} / ${total.toFixed(2)}
                </span>
              </div>
            </div>
          ) : null}

          <Badge tone="neutral">{cart.reduce((sum, l) => sum + l.quantity, 0)} artículos</Badge>

          <Button
            size="lg"
            className="mt-auto"
            onClick={handleCheckout}
            loading={submitting}
            disabled={cart.length === 0}
          >
            F8 · Cobrar
          </Button>
        </div>
      </div>

      <Modal open={suspendedOpen} onClose={() => setSuspendedOpen(false)} title="Ventas suspendidas">
        {suspendedList.length === 0 ? (
          <p className="text-sm text-muted">No hay ventas suspendidas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {suspendedList.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => recoverSuspended(s.id)}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-left hover:bg-app"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{s.saleNumber}</p>
                  <p className="text-xs text-muted">{s.note || `${s.items.length} producto(s)`}</p>
                </div>
                <span className="text-xs text-muted">{new Date(s.createdAt).toLocaleTimeString("es-MX")}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      <TicketModal sale={lastSale} onClose={() => setLastSale(null)} />
    </div>
  );
}
