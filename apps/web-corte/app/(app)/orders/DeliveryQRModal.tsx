"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { MenuOrder } from "@pilotspos/types";
import { Button, Modal } from "@pilotspos/ui";
import { DeliveryTicket } from "./DeliveryTicket";

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
    <Modal open={Boolean(order)} onClose={onClose} title={`Ticket de entrega · ${order?.orderNumber ?? ""}`} size="sm">
      {order ? (
        <div className="flex flex-col gap-4">
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div id="delivery-qr-area" className="rounded-md border border-line bg-white p-4">
            <DeliveryTicket order={order} qrUrl={qrUrl} />
          </div>

          <p className="text-center text-xs leading-relaxed text-muted">
            Se imprime al confirmar el pedido: el repartidor lleva este ticket y escanea el QR
            para registrar la entrega. El cliente confirma la recepción con el mismo QR.
          </p>

          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()} disabled={!qrUrl}>
              Imprimir ticket
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
