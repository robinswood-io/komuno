export const SYNTHETIC_MEMBER_COUNT = 10_000;
export function createSyntheticMembers(count = SYNTHETIC_MEMBER_COUNT) {
  return Array.from({ length: count }, (_, index) => ({
    email: `member-${String(index).padStart(5, '0')}@example.test`,
    firstName: `Prenom${index % 200}`, lastName: `Nom${index % 500}`, company: `Entreprise ${index % 137}`,
    status: index % 5 === 0 ? 'proposed' : 'active', engagementScore: (index * 17) % 101,
    lastActivityAt: new Date(Date.UTC(2026, 8, 10) - index * 60_000).toISOString(),
  }));
}
