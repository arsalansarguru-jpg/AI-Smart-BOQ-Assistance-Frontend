import { redirect } from "next/navigation";
import AppToaster from "@/components/ui/toaster";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./_components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-950">
      <Sidebar userEmail={user.email ?? "Unknown user"} />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <AppToaster />
    </div>
  );
}
