"use client";

import { Alert, Button, Modal } from "@pilotspos/ui";
import { Ticket } from "./Ticket";
import type { SaleTicket } from "./types";

export function TicketModal({ sale, onClose }: { sale: SaleTicket | null; onClose: () => void }) {
  const pending = sale?.saleNumber === "PENDIENTE";

  return (
    <Modal open={Boolean(sale)} onClose={onClose} title="Venta completada" size="sm">
      {sale ? (
        <div className="flex flex-col gap-4">
          {pending ? (
            <Alert tone="warning" title="Guardada sin conexión">
              Se sincronizará automáticamente y recibirá su folio real cuando vuelva la conexión.
            </Alert>
          ) : null}
          <div id="ticket-print-area" className="rounded-md border border-line bg-white p-4">
            <Ticket sale={sale} />
          </div>
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>Imprimir ticket</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
