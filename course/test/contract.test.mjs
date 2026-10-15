import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const spec = parse(readFileSync(new URL('../../contracts/petstore-pets.yaml', import.meta.url), 'utf8'));
const ops = Object.values(spec.paths).flatMap(p => Object.values(p).map(o => o.operationId));

test('contract has exactly the three course operations', () => {
  assert.deepEqual(ops.sort(), ['addPet', 'findPetsByStatus', 'getPetById']);
});

test('pet ids are decimal strings so int64 survives JavaScript', () => {
  const id = spec.components.schemas.PetId;
  assert.equal(id.type, 'string');
  assert.ok(new RegExp(id.pattern).test('9223372036854775807'));
  assert.ok(!new RegExp(id.pattern).test('12a'));
  assert.equal(spec.components.schemas.Pet.properties.id.$ref, '#/components/schemas/PetId');
});

test('contract has no auth', () => {
  assert.equal(spec.components.securitySchemes, undefined);
  assert.equal(spec.security, undefined);
});

test('status enum matches upstream', () => {
  assert.deepEqual(spec.components.schemas.PetStatus.enum, ['available', 'pending', 'sold']);
});
