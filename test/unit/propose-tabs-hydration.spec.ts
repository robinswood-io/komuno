import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('Proposer — onglets après hydratation', () => {
  it('bloque les onglets avant hydratation et expose leur état accessible', () => {
    const source = readFileSync('app/(public)/propose/page.tsx', 'utf8');

    expect(source).toContain('const [isHydrated, setIsHydrated] = useState(false)');
    expect(source).toContain('setIsHydrated(true)');
    expect(source).toContain('disabled={!isHydrated}');
    expect(source).toContain("aria-pressed={mode === 'idea'}");
    expect(source).toContain("aria-pressed={mode === 'training'}");
  });

  it('attend l’activation réelle dans le scénario Deep UI', () => {
    const source = readFileSync('tests/e2e/ui-workflows-deep.spec.ts', 'utf8');

    expect(source).toContain("getByRole('button', { name: 'Formation', exact: true })");
    expect(source).toContain("getByRole('button', { name: 'Idée', exact: true })");
    expect(source).toContain('await expect(trainingTab).toBeEnabled()');
    expect(source).toContain("await expect(trainingTab).toHaveAttribute('aria-pressed', 'true')");
    expect(source).toContain("await expect(ideaTab).toHaveAttribute('aria-pressed', 'true')");
  });
});
