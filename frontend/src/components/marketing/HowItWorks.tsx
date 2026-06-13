const STEPS = [
  {
    step: "01",
    title: "Describe it",
    description: "Tell Posterly your idea, event or message in plain language.",
  },
  {
    step: "02",
    title: "Generate",
    description: "Our AI creates layout, imagery and typography in seconds.",
  },
  {
    step: "03",
    title: "Refine & export",
    description: "Tweak the result and download a high-resolution poster.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-border/60 bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From idea to poster in three steps
          </h2>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((item) => (
            <li key={item.step} className="flex flex-col gap-3">
              <span className="text-4xl font-bold text-primary/30">
                {item.step}
              </span>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
