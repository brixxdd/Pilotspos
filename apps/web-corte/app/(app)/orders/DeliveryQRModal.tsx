"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { MenuOrder } from "@pilotspos/types";
import { Button, Modal } from "@pilotspos/ui";

export function DeliveryQRModal({ order, onClose }: { order: MenuOrder | null; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!order?.deliveryToken) return;
    let cancelled = false;
    QRCode.toDataURL(`${window.location.origin}/d/${order.deliveryToken}`, {
      margin: 1,
      width: 480,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo generar el QR");
      });
    return () => {
      cancelled = true;
    };
  }, [order]);

  return (
    <Modal open={Boolean(order)} onClose={onClose} title={`Entrega · ${order?.orderNumber ?? ""}`} size="sm">
      {order ? (
        <div className="flex flex-col items-center gap-4">
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div id="delivery-qr-area" className="flex flex-col items-center gap-3 rounded-md border border-line bg-white p-4">
            {qrUrl ? (
              <img src={qrUrl} alt="QR de entrega" width={240} height={240} className="h-56 w-56" />
            ) : (
              <div className="h-56 w-56 animate-pulse rounded-md bg-app" />
            )}
            <p className="font-mono text-sm font-bold text-ink">{order.orderNumber}</p>
            <p className="text-center text-xs leading-relaxed text-muted">
              {order.customerName} · {order.customerPhone}
              {order.addressLine ? <br /> : null}
              {order.addressLine}
              {order.addressReferences ? <span className="block">{order.addressReferences}</span> : null}
            </p>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted">
            El repartidor escanea este QR al recoger el pedido y confirma la entrega con su
            teléfono. Así queda registrado quién entregó y a qué hora.
          </p>

          <div className="flex w-full justify-end gap-2 print:hidden">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()} disabled={!qrUrl}>
              Imprimir QR
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
