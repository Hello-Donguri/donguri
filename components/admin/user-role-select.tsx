"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/lib/actions/admin";
import { useTranslations } from "@/components/i18n/locale-provider";
import type { AssignableRole } from "@/lib/definitions";

// One user's role on the admin users page: User or Tester, saved as soon as
// it changes. Admins get a fixed label instead — their role is only ever
// set in the SQL editor.
export function UserRoleSelect({
  userId,
  role,
  label,
}: {
  userId: string;
  role: string;
  // For screen readers: whose role this is.
  label: string;
}) {
  const t = useTranslations();
  const [value, setValue] = useState(role);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  if (role === "admin") {
    return (
      <span className="inline-flex rounded-full bg-sumi px-2.5 py-1 text-xs font-bold text-washi">
        {t("admin_users.role_admin", "Admin")}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label={label}
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as AssignableRole;
          const previous = value;
          setValue(next);
          setStatus(null);
          startTransition(async () => {
            const result = await setUserRole(userId, next);
            if (result.ok) {
              setStatus({ ok: true, message: t("admin_users.saved", "Saved.") });
            } else {
              setValue(previous);
              setStatus({ ok: false, message: result.message });
            }
          });
        }}
        className="cursor-pointer rounded-lg border border-sumi/15 bg-washi px-3 py-1.5 text-sm text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft disabled:opacity-60"
      >
        <option value="user">{t("admin_users.role_user", "User")}</option>
        <option value="tester">{t("admin_users.role_tester", "Tester")}</option>
      </select>
      {status && !pending && (
        <p className={`text-xs ${status.ok ? "text-matcha-dark" : "text-shu"}`}>{status.message}</p>
      )}
    </div>
  );
}
