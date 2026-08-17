import Link from "next/link";
import { Plus } from "lucide-react";

export default function NewProjectButton({ large = false }: { large?: boolean }) {
  return (
    <Link
      href="/projects/new"
      className={`btn-accent flex items-center justify-center gap-2 w-fit ${large ? "mx-auto" : ""}`}
    >
      <Plus size={16} />
      New Project
    </Link>
  );
}
