import { notFound, redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import { AccountShell, fetchBusiness } from "../shell";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function CustomerLoginPage({
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
  // ajeno convertiría el login en un redirector abierto.
  const nextHref =
    searchParams.next?.startsWith(backHref) === true ? searchParams.next : `${backHref}/cuenta`;

  if (await getCustomerSession()) redirect(nextHref);

  return (
    <AccountShell
      business={business}
      backHref={backHref}
      eyebrow="Su cuenta"
      title="Entrar"
      subtitle="Con su cuenta puede pedir sin volver a escribir su dirección, y ver cuánto tiene disponible de fiado."
    >
      <LoginForm orgSlug={params.org} nextHref={nextHref} />
    </AccountShell>
  );
}
