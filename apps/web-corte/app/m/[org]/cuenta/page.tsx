import { notFound, redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import { AccountShell, fetchBusiness } from "./shell";
import { AccountForm } from "./AccountForm";

export const metadata = { title: "Mi cuenta" };

export default async function CustomerAccountPage({ params }: { params: { org: string } }) {
  const business = await fetchBusiness(params.org);
  if (!business) notFound();

  const customer = await getCustomerSession();
  if (!customer) redirect(`/m/${params.org}/cuenta/entrar`);

  return (
    <AccountShell
      business={business}
      backHref={`/m/${params.org}`}
      eyebrow="Su cuenta"
      title={`Hola, ${customer.firstName}`}
      subtitle="Sus datos viajan con cada pedido, para que no los tenga que escribir otra vez."
    >
      <AccountForm customer={customer} orgSlug={params.org} />
    </AccountShell>
  );
}
