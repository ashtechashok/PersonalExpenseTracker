import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import UsersClient, { type ClientUser } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const clientUsers: ClientUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    isAdmin: u.isAdmin,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
  }));

  return <UsersClient users={clientUsers} currentUserId={admin.id} />;
}
