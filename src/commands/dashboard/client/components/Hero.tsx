type HeroProps = {
  title?: string;
  description?: string;
};

export function Hero({
  title = 'Tiller Config Dashboard',
  description = 'Review project defaults, local overrides, and the effective configuration side by side. Changes reuse the same save logic as tiller-ai config.',
}: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-badge">⚓ Config</div>
      <h1 className="hero-title">{title}</h1>
      <p className="hero-description">{description}</p>
    </section>
  );
}
