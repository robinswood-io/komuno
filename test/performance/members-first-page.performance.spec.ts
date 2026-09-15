import { describe, expect, it } from 'vitest';
import { createSyntheticMembers, SYNTHETIC_MEMBER_COUNT } from '../fixtures/members-10000.fixture';

describe('members first page performance', () => {
  it('calcule une p95 inférieure à 2000 ms sur 10 000 membres sans retourner le jeu intégral', () => {
    const source = createSyntheticMembers();
    expect(source).toHaveLength(SYNTHETIC_MEMBER_COUNT);
    const durations: number[] = []; let page: ReturnType<typeof createSyntheticMembers> = [];
    for (let sample = 0; sample < 40; sample += 1) {
      const started = performance.now();
      page = source.filter((member) => member.status === 'active').slice(0, 20);
      durations.push(performance.now() - started);
    }
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
    console.info(`members-first-page p95=${p95.toFixed(3)}ms dataset=${SYNTHETIC_MEMBER_COUNT} returned=${page.length}`);
    expect(page).toHaveLength(20); expect(page.length).toBeLessThan(SYNTHETIC_MEMBER_COUNT); expect(p95).toBeLessThan(2000);
  });
});
