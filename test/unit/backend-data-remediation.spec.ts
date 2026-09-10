import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');

describe('backend data remediation contracts', () => {
  it('supprime les préchargements 500/1000/10000 et utilise recherche/agrégats serveur', () => {
    const network = read('components/network/NetworkSection.tsx'); const page = read('app/(protected)/admin/members/page.tsx'); const stats = read('app/(protected)/admin/members/stats/page.tsx');
    expect(network).not.toMatch(/limit=(500|1000)/); expect(network).toContain('/api/admin/members/search'); expect(network).toContain('searchEnabled');
    expect(page).not.toMatch(/limit:\s*500/); expect(page).toContain("projection: 'kanban'");
    expect(stats).not.toContain('10000'); expect(stats).toContain('/api/admin/members/stats'); expect(stats).not.toContain('calculateStatistics');
  });
  it('impose des plafonds et projections minimales dans le stockage', () => {
    const storage = read('server/storage.ts');
    expect(storage).toContain('list: 100, directory: 20, kanban: 60, export: 1000'); expect(storage).toContain('nextCursor'); expect(storage).toContain("projection === 'directory'");
    expect(storage).toContain('getMemberStats'); expect(storage).toContain('anonymizeMember');
  });
  it('audite export/effacement et documente la conservation sans validation juridique', () => {
    const service = read('server/src/members/members.service.ts'); const doc = read('docs/data-governance-members.md');
    expect(service).toContain("action: 'members.export'"); expect(service).toContain("action: 'members.erasure'"); expect(service).toContain('AuditService');
    expect(doc).toContain('pas une validation juridique'); expect(doc).toContain('ne supprime pas physiquement'); expect(doc).toContain('CNIL');
  });
});
