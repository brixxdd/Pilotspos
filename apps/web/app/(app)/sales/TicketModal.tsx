"use client";

import { Button, Modal } from "@pilotspos/ui";
import { Ticket } from "./Ticket";
import type { SaleTicket } from "./types";

export function TicketModal({ sale, onClose }: { sale: SaleTicket | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(sale)} onClose={onClose} title="Venta completada" size="sm">
      {sale ? (
        <div className="flex flex-col gap-4">
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
