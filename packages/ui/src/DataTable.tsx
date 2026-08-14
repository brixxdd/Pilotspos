import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "./Table";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle = "Sin resultados",
  emptyDescription,
}: DataTableProps<T>) {
  if (loading) return <LoadingState label="Cargando datos..." />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <TableHead>
        <tr>
          {columns.map((column) => (
            <TableHeaderCell key={column.key} className={column.className}>
              {column.header}
            </TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {column.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
