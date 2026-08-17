import ProjectForm from "@/components/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="label-text mb-1">New Project</p>
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Add a project</h1>
      <p className="text-brand-muted text-sm mb-8">
        Paste brochure text to auto-fill what we can, then review every field before saving. Once saved, you can run
        "Find Potential Buyers" to see which historical leads are worth reactivating.
      </p>
      <ProjectForm />
    </div>
  );
}
