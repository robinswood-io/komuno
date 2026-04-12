'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SectionKey =
  | 'majeurs'
  | 'nouveautes'
  | 'corrections'
  | 'ameliorations'
  | 'securite'
  | 'maintenance';

type Sections = Record<SectionKey, string[]>;

interface ChangelogEntry {
  version: string;
  releasedAt: string;
  summary: string;
  sections: Sections;
  commitCount: number;
}

interface ChangelogPayload {
  latest?: ChangelogEntry;
  history?: ChangelogEntry[];
  generatedAt?: string;
}

const SECTION_ORDER: SectionKey[] = [
  'majeurs',
  'nouveautes',
  'corrections',
  'ameliorations',
  'securite',
  'maintenance',
];

const SECTION_LABELS: Record<SectionKey, string> = {
  majeurs: 'Changements importants',
  nouveautes: 'Nouveautes',
  corrections: 'Corrections',
  ameliorations: 'Ameliorations',
  securite: 'Securite',
  maintenance: 'Maintenance',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function ChangelogPage() {
  const [payload, setPayload] = useState<ChangelogPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch('/changelog.json', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as ChangelogPayload;
        if (mounted) {
          setPayload(data);
        }
      })
      .catch(async () => {
        try {
          const response = await fetch('/api/version', { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = (await response.json()) as { version?: string };
          if (mounted && data.version) {
            const fallbackEntry: ChangelogEntry = {
              version: data.version,
              releasedAt: new Date().toISOString(),
              summary:
                "Cette version est en cours de publication. Les details complets arrivent automatiquement.",
              sections: {
                majeurs: [],
                nouveautes: [],
                corrections: [],
                ameliorations: [],
                securite: [],
                maintenance: [],
              },
              commitCount: 0,
            };

            setPayload({
              latest: fallbackEntry,
              history: [fallbackEntry],
              generatedAt: new Date().toISOString(),
            });
            return;
          }
        } catch {
          // Garde le message d'erreur utilisateur ci-dessous.
        }

        if (mounted) {
          setError('Les notes de version ne sont pas encore disponibles.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const history = payload?.history ?? [];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Mises a jour</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">
            Notes de version
          </h1>
          <p className="text-gray-600 mt-3">
            Retrouvez ici les evolutions de l&apos;application en langage clair.
          </p>
        </div>

        {!payload && !error && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
            Chargement des mises a jour...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
            {error}
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-6">
            {history.map((release) => (
              <article
                key={release.version}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Version {release.version}
                  </h2>
                  <div className="text-sm text-gray-500">
                    {formatDate(release.releasedAt)}
                  </div>
                </div>

                <p className="mt-3 text-gray-700">{release.summary}</p>

                <div className="mt-4 space-y-4">
                  {SECTION_ORDER.map((key) => {
                    const items = release.sections?.[key] ?? [];
                    if (!items.length) return null;
                    return (
                      <section key={key}>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                          {SECTION_LABELS[key]}
                        </h3>
                        <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
                          {items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center text-primary hover:underline text-sm font-medium"
          >
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
