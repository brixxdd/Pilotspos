import { notFound, redirect } from "next/navigation";
import { fetchBusiness } from "./cuenta/shell";

/**
 * Enlace corto del negocio: `/m/carniceria-guerras` manda a la primera
 * sucursal. Es la URL que conviene imprimir en el QR cuando hay una sola
 * sucursal, y la que usan los botones "volver" de las pantallas de cuenta.
 */
export default async function BusinessIndexPage({ params }: { params: { org: string } }) {
  const business = await fetchBusiness(params.org);
  const firstBranch = business?.branches[0];
  if (!firstBranch) notFound();

  redirect(`/m/${params.org}/${firstBranch.slug}`);
}
