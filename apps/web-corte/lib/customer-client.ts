"use client";

import type { SessionCustomer } from "@pilotspos/types";
import { apiFetch } from "./api-client";

export interface CustomerRegisterFields {
  organizationSlug: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  addressReferences: string;
  password: string;
}

export async function registerCustomer(fields: CustomerRegisterFields) {
  const body = await apiFetch<{ customer: SessionCustomer }>("/customers/register", {
    method: "POST",
    body: JSON.stringify(fields),
  });
  return body.customer;
}

export async function loginCustomer(fields: {
  organizationSlug: string;
  phone: string;
  password: string;
}) {
  const body = await apiFetch<{ customer: SessionCustomer }>("/customers/login", {
    method: "POST",
    body: JSON.stringify(fields),
  });
  return body.customer;
}

export async function updateCustomerProfile(fields: {
  firstName?: string;
  lastName?: string;
  addressLine?: string;
  addressReferences?: string;
}) {
  const body = await apiFetch<{ customer: SessionCustomer }>("/customers/me", {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return body.customer;
}

export async function logoutCustomer() {
  await apiFetch("/customers/logout", { method: "POST" });
}
