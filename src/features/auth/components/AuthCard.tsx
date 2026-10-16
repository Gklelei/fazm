/** Every auth page: a heading, a line of help, then the form. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export { FormAlert as FormError } from "@/components/form/FormAlert";
