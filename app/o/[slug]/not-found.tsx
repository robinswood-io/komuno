export default function TenantNotFoundPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <section className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Espace Komuno</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950">Organisation introuvable</h1>
        <p className="mt-5 text-lg leading-relaxed text-gray-600">
          Aucun espace Komuno actif ne correspond à cette adresse. Vérifiez le lien transmis ou contactez l’équipe Komuno.
        </p>
        <a href="/" className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90">
          Revenir à Komuno
        </a>
      </section>
    </main>
  );
}
