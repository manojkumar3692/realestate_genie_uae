import { requireSession } from "@/lib/auth/requireSession";
import NavBar from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <>
      <NavBar userName={session.name} userEmail={session.email} />
      <main className="flex-1 w-full pb-24 md:pb-0">{children}</main>
    </>
  );
}
