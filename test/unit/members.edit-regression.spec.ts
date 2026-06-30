import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

import { updateMemberSchema } from '../../shared/schema.ts';

describe('Membres — édition fiche', () => {
  it('permet de vider les champs facultatifs d’une fiche membre', () => {
    const parsed = updateMemberSchema.parse({
      firstName: '  Jean  ',
      lastName: ' Dupont ',
      company: '',
      phone: null,
      role: '   ',
      cjdRole: 'Président',
      notes: '<b>note</b>',
      soncasProfile: null,
      assignedTo: null,
    });

    expect(parsed).toMatchObject({
      firstName: 'Jean',
      lastName: 'Dupont',
      company: null,
      phone: null,
      role: null,
      cjdRole: 'Président',
      notes: 'bnote/b',
      soncasProfile: null,
      assignedTo: null,
    });
  });

  it('protège la route PATCH membre avec admin.edit et non admin.view', () => {
    const source = readFileSync('server/src/members/members.controller.ts', 'utf8');
    const patchBlock = source.match(/@Patch\(':email'\)[\s\S]*?@ApiOperation/)?.[0] ?? '';
    expect(patchBlock).toContain("@Permissions('admin.edit')");
    expect(patchBlock).not.toContain("@Permissions('admin.view')");
  });
});
