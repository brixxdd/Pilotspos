import { notFound, redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import { AccountShell, fetchBusiness } from "../shell";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Crear cuenta" };

export default async function CustomerRegisterPage({
  params,
  searchParams,
}: {
  params: { org: string };
  searchParams: { next?: string };
}) {
  const business = await fetchBusiness(params.org);
  if (!business) notFound();

  const backHref = `/m/${params.org}`;
  // Solo se acepta un destino interno del propio menú: un `next` con dominio
  // ajeno convertiría el registro en un redirector abierto.
  const nextHref =
    searchParams.next?.startsWith(backHref) === true ? searchParams.next : backHref;

  if (await getCustomerSession()) redirect(nextHref);

  return (
    <AccountShell
      business={business}
      backHref={backHref}
      eyebrow="Su cuenta"
      title="Crear cuenta"
      subtitle="Sus datos quedan guardados para que no los escriba en cada pedido. El fiado lo autoriza el mostrador."
    >
      <RegisterForm orgSlug={params.org} nextHref={nextHref} />
    </AccountShell>
  );
}
