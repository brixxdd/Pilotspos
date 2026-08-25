import type { SaleTicket } from "./types";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  MIXED: "Pago mixto",
};

export function Ticket({ sale }: { sale: SaleTicket }) {
  return (
    <div className="mx-auto w-full max-w-[300px] font-mono text-xs text-ink print:max-w-none">
      <div className="text-center">
        <p className="text-sm font-bold">{sale.organizationName}</p>
        <p>{sale.branchName}</p>
        <p>{new Date(sale.createdAt).toLocaleString("es-MX")}</p>
        <p>Cajero: {sale.cashierName}</p>
        <p>Venta: {sale.saleNumber}</p>
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
          {sale.items.map((item, index) => (
            <tr key={index}>
              <td>{item.productName}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">${Number(item.subtotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed border-ink" />

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>${Number(sale.subtotal).toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Descuento</span>
        <span>${Number(sale.discount).toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm font-bold">
        <span>Total</span>
        <span>${Number(sale.total).toFixed(2)}</span>
      </div>

      <div className="my-2 border-t border-dashed border-ink" />

      {sale.payments.map((payment, index) => (
        <div key={index}>
          <div className="flex justify-between">
            <span>{METHOD_LABELS[payment.method] ?? payment.method}</span>
            <span>${Number(payment.amount).toFixed(2)}</span>
          </div>
          {payment.receivedAmount ? (
            <div className="flex justify-between text-[11px] text-muted">
              <span>Recibido</span>
              <span>${Number(payment.receivedAmount).toFixed(2)}</span>
            </div>
          ) : null}
          {payment.changeAmount ? (
            <div className="flex justify-between text-[11px] text-muted">
              <span>Cambio</span>
              <span>${Number(payment.changeAmount).toFixed(2)}</span>
            </div>
          ) : null}
        </div>
      ))}

      <div className="my-2 border-t border-dashed border-ink" />
      <p className="text-center">¡Gracias por su compra!</p>
    </div>
  );
}
