import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-session";
import { MenuClient, type PublicMenu } from "./MenuClient";

// Los precios se editan desde el mostrador y deben verse en el celular del
// cliente casi enseguida; un minuto es suficiente y evita pegarle a la API en
// cada escaneo del QR.
export const revalidate = 60;

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function fetchMenu(org: string, branch: string): Promise<PublicMenu | null> {
  const response = await fetch(`${API_URL}/public/menu/${org}/${branch}`, {
    next: { revalidate },
  });
  if (!response.ok) return null;
  return response.json() as Promise<PublicMenu>;
}

export async function generateMetadata({
  params,
}: {
  params: { org: string; branch: string };
}): Promise<Metadata> {
  const menu = await fetchMenu(params.org, params.branch);
  if (!menu) return { title: "Menú no disponible" };

  return {
    title: `${menu.business.name} · ${menu.branch.name}`,
    description: `Cortes y precios del día en ${menu.branch.name}. Haga su pedido por WhatsApp.`,
    openGraph: {
      title: `${menu.business.name} · ${menu.branch.name}`,
      description: "Cortes y precios del día. Pida desde su celular.",
    },
  };
}

export default async function MenuPage({ params }: { params: { org: string; branch: string } }) {
  const [menu, customer] = await Promise.all([
    fetchMenu(params.org, params.branch),
    getCustomerSession(),
  ]);
  if (!menu) notFound();

  return (
    <MenuClient
      menu={menu}
      whatsapp={process.env.MENU_WHATSAPP_NUMBER ?? ""}
      customer={customer}
    />
  );
}
