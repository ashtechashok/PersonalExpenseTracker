"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveUser, rejectUser, setUserAdmin } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, XIcon, InboxIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format";
import { useSettings } from "@/lib/settings-context";

export type ClientUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

function statusTone(status: ClientUser["status"]): BadgeTone {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  return "warning";
}

export default function UsersClient({ users, currentUserId }: { users: ClientUser[]; currentUserId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const settings = useSettings();
  const formatDate = (iso: string) => formatDateTime(iso, settings);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<{ error?: string }>, successMessage: string) {
    setPendingId(id);
    const result = await fn();
    setPendingId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success(successMessage);
      router.refresh();
    }
  }

  async function handleReject(u: ClientUser) {
    const ok = await confirm({
      title: `Decline ${u.email}?`,
      description: "They'll be signed out and won't be able to log back in unless approved again.",
      confirmLabel: "Decline",
      tone: "danger",
    });
    if (!ok) return;
    run(u.id, () => rejectUser(u.id), "Account declined");
  }

  async function handleAdminToggle(u: ClientUser) {
    const next = !u.isAdmin;
    if (next) {
      const ok = await confirm({
        title: `Make ${u.email} an admin?`,
        description: "They'll be able to approve/decline signups and manage other admins.",
        confirmLabel: "Make Admin",
      });
      if (!ok) return;
    }
    run(u.id, () => setUserAdmin(u.id, next), next ? "Promoted to admin" : "Admin access removed");
  }

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const otherUsers = users.filter((u) => u.status !== "PENDING");

  return (
    <div className="space-y-6">
      {pendingUsers.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-primary">
            Pending Approval <span className="text-sm font-normal text-tertiary">({pendingUsers.length})</span>
          </h2>
          <div className="space-y-2.5">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-subtle bg-surface-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{u.email}</p>
                  <p className="text-xs text-tertiary">Requested {formatDate(u.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={pendingId === u.id}
                    onClick={() => run(u.id, () => approveUser(u.id), "Account approved")}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => handleReject(u)}>
                    <XIcon className="h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-primary">All Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-subtle text-left text-xs font-semibold tracking-wide text-tertiary uppercase">
                <th className="py-2.5 pr-4">Email</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 pr-4">Role</th>
                <th className="py-2.5 pr-4">Joined</th>
                <th className="py-2.5 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {otherUsers.map((u) => (
                <tr key={u.id} className="border-b border-subtle/60 transition-colors hover:bg-[rgb(var(--tint-rgb)/0.025)]">
                  <td className="py-3 pr-4 text-primary">
                    {u.email}
                    {u.id === currentUserId && <span className="ml-1.5 text-xs text-tertiary">(you)</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge tone={statusTone(u.status)}>{u.status[0] + u.status.slice(1).toLowerCase()}</Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge tone={u.isAdmin ? "violet" : "neutral"}>{u.isAdmin ? "Admin" : "Member"}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-secondary">{formatDate(u.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {u.status === "REJECTED" && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={pendingId === u.id}
                          onClick={() => run(u.id, () => approveUser(u.id), "Account approved")}
                        >
                          Approve
                        </Button>
                      )}
                      {u.status === "APPROVED" && u.id !== currentUserId && (
                        <Button type="button" variant="danger" size="sm" onClick={() => handleReject(u)}>
                          Decline
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        loading={pendingId === u.id}
                        onClick={() => handleAdminToggle(u)}
                      >
                        {u.isAdmin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {otherUsers.length === 0 && (
            <EmptyState icon={<InboxIcon className="h-6 w-6" />} title="No other users yet" />
          )}
        </div>
      </Card>
    </div>
  );
}
