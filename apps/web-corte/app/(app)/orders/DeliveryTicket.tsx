import type { MenuOrder } from "@pilotspos/types";
import { formatQuantity } from "@pilotspos/domain";

function formatQ(value: number): string {
  return value.toLocaleString("es-GT", { style: "currency", currency: "GTQ" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ticket de entrega (80mm): el mostrador lo imprime al confirmar el pedido.
 * Lleva lo que necesita el repartidor — cliente, dirección, renglones — y el
 * QR para confirmar la entrega con su teléfono.
 */
export function DeliveryTicket({ order, qrUrl }: { order: MenuOrder; qrUrl: string | null }) {
  const delivered = Boolean(order.deliveredAt);
  const customerConfirmed = Boolean(order.customerConfirmedAt);

  return (
    <div className="mx-auto w-full max-w-[300px] font-mono text-xs text-ink print:max-w-none">
      <div className="text-center">
        <p className="text-sm font-bold">{order.organizationName ?? ""}</p>
        <p>{order.branchName}</p>
        <p>{formatTime(order.createdAt)}</p>
      </div>

      <div className="my-2 border-t border-dashed border-ink" />

      <p className="text-center text-sm font-bold">Entrega {order.orderNumber}</p>

      <div className="mt-2">
        <p className="font-semibold">{order.customerName}</p>
        <p>{order.customerPhone}</p>
        {order.addressLine ? <p>{order.addressLine}</p> : null}
        {order.addressReferences ? <p>{order.addressReferences}</p> : null}
      </div>

      <div className="my-2 border-t border-dashed border-ink" />

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">Producto</th>
            <th className="text-right">Cant.</th>
            <th className="text-right">Subt.</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td className="text-right">{formatQuantity(item.quantity, item.unit)}</td>
              <td className="text-right">{formatQ(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-1 flex justify-between text-sm font-bold">
        <span>Total</span>
        <span>{formatQ(order.estimatedTotal)}</span>
      </div>
      {order.requestedCredit > 0 ? (
        <div className="flex justify-between">
          <span>A su cuenta</span>
          <span>{formatQ(order.requestedCredit)}</span>
        </div>
      ) : null}

      <div className="my-2 border-t border-dashed border-ink" />

      {qrUrl ? (
        <div className="flex justify-center py-2">
          <img src={qrUrl} alt="QR de entrega" width={180} height={180} className="h-44 w-44" />
        </div>
      ) : (
        <div className="mx-auto h-44 w-44 animate-pulse rounded-md bg-app" />
      )}
      <p className="text-center text-[11px] leading-relaxed text-muted">
        El repartidor escanea y confirma con su teléfono.
      </p>

      <div className="my-2 border-t border-dashed border-ink" />

      {delivered ? (
        <div className="text-center">
          <p className="font-semibold text-success">✓ Entregado por {order.driverName ?? "repartidor"}</p>
          <p className="text-[11px] text-muted">{order.deliveredAt ? formatTime(order.deliveredAt) : ""}</p>
        </div>
      ) : (
        <p className="text-center text-[11px] text-muted">Sin entregar</p>
      )}
      {customerConfirmed ? (
        <p className="mt-1 text-center font-semibold text-success">✓ Confirmado por el cliente</p>
      ) : null}
    </div>
  );
}
