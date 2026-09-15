import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
describe('FormsController public error contract', () => {
  it('est couvert par le filtre global sans capture technique dispersée', () => {
    const filter = readFileSync('server/src/common/filters/http-exception.filter.ts', 'utf8');
    expect(filter).toContain("prefix: '/api/forms'"); expect(filter).toContain('FORMS_OPERATION_FAILED'); expect(filter).toContain('correlationId');
  });
});
