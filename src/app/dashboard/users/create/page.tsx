import { Shield, Table as TableIcon } from "lucide-react";

import { BackLink } from "./_components/back-link";
import { RoleChooserCard } from "./_components/role-chooser-card";

/**
 * Create-user chooser. Both entry points in the Users list link here; this
 * screen lets the admin pick which kind of user to create and routes to a
 * dedicated, purpose-built flow. No client state — renders on the server.
 */
export default function CreateUserChooserPage() {
  return (
    <div className="users-create-v2 space-y-0">
      <BackLink href="/dashboard/users" label="Users" />

      <div className="mb-7">
        <h1 className="mb-1.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
          Create a user
        </h1>
        <p className="text-[13.5px] tracking-[-0.003em] text-[var(--text-3)]">
          Choose the kind of user to add. Admins have platform-wide access and
          log in with a one-time code; Venue Managers are scoped to assigned
          venues and log in with a temporary password.
        </p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:max-w-[760px]">
        <RoleChooserCard
          href="/dashboard/users/create/admin"
          accent="teal"
          icon={Shield}
          title="Create Admin"
          description="Full platform access across all venues, invoices, and users."
          perks={[
            "Manage all venues and invoices",
            "Create other admins and managers",
            "OTP login via email (no password)",
          ]}
        />
        <RoleChooserCard
          href="/dashboard/users/create/venue-manager"
          accent="amber"
          icon={TableIcon}
          title="Create Venue Manager"
          description="Scoped to assigned venues. Manages courts, bookings, and invoices."
          perks={[
            "Manage assigned venues only",
            "Add courts and set pricing",
            "Login with email + temporary password",
          ]}
        />
      </div>
    </div>
  );
}
