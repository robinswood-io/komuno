'use client';

import { useState, useRef, useCallback } from 'react';
import { Building2, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface SiretCompanyData {
  company: string;
  city?: string;
  postalCode?: string;
  department?: string;
  sector?: string;
  siren?: string;
}

interface SiretSearchProps {
  onSelect: (data: SiretCompanyData) => void;
  disabled?: boolean;
}

interface ApiResult {
  nom_complet?: string;
  siege?: {
    libelle_commune?: string;
    code_postal?: string;
    departement?: string;
    activite_principale_registre_metier?: string;
  };
  siren?: string;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SiretSearch({ onSelect, disabled }: SiretSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SiretCompanyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&per_page=8`,
      );
      if (!res.ok) throw new Error('Erreur API');
      const json = await res.json() as { results?: ApiResult[] };
      const mapped: SiretCompanyData[] = (json.results ?? [])
        .filter((r): r is ApiResult & { nom_complet: string } => Boolean(r.nom_complet))
        .map((r) => ({
          company: toTitleCase(r.nom_complet),
          city: r.siege?.libelle_commune ? toTitleCase(r.siege.libelle_commune) : undefined,
          postalCode: r.siege?.code_postal,
          department: r.siege?.departement ?? undefined,
          sector: r.siege?.activite_principale_registre_metier
            ? toTitleCase(r.siege.activite_principale_registre_metier)
            : undefined,
          siren: r.siren,
        }));
      setResults(mapped);
    } catch {
      setError('Impossible de contacter l\'API SIRET');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 350);
  };

  const handleSelect = (item: SiretCompanyData) => {
    onSelect(item);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2 text-xs h-8"
        >
          <Building2 className="h-3.5 w-3.5" />
          Chercher via SIRET
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Rechercher une entreprise (registre national)
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Nom de l'entreprise, SIRET, SIREN..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-8 pr-8 h-8 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Recherche en cours...
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {!loading && results.length === 0 && query.length >= 2 && !error && (
            <p className="text-xs text-muted-foreground py-2">Aucun résultat pour "{query}"</p>
          )}

          {results.length > 0 && (
            <ul className="max-h-[280px] overflow-y-auto space-y-1 border rounded-md divide-y">
              {results.map((item, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                  >
                    <div className="font-medium">{item.company}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                      {item.postalCode && item.city && (
                        <span>{item.postalCode} {item.city}</span>
                      )}
                      {item.sector && (
                        <span className="italic">{item.sector}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
