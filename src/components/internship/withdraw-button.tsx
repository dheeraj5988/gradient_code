"use client";
import { ActionButton } from "@/components/admin/form";
import { withdrawApplication } from "@/app/dashboard/applications/actions";

export function WithdrawButton({ id }: { id: string }) {
  return <ActionButton action={withdrawApplication.bind(null, id)} variant="outline" size="sm" confirm="Withdraw this application? You can't undo this.">Withdraw</ActionButton>;
}
