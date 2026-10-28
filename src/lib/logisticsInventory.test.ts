import assert from 'node:assert/strict';
import test from 'node:test';
import { getMeetingEquipment, inventoryItemId } from './logisticsInventory';
import type { Equipment, MeetingEquipment } from '../types';

const stock: Equipment[] = [{ id: 'projector', name: 'מקרן', quantity: 2, status: 'available' }];
const item = (overrides: Partial<MeetingEquipment>): MeetingEquipment => ({
  id: 'override', meetingId: 'meeting-a', name: 'מקרן', quantity: 1, assignedTo: 'טל', ...overrides,
});

test('inventory appears as the default in every meeting and follows general changes', () => {
  const first = getMeetingEquipment('meeting-a', stock, []);
  const second = getMeetingEquipment('meeting-b', stock, []);
  assert.equal(first.items[0].id, inventoryItemId('projector'));
  assert.equal(second.items[0].quantity, 2);
  assert.equal(getMeetingEquipment('meeting-a', [{ ...stock[0], quantity: 4 }], []).items[0].quantity, 4);
});

test('a meeting override changes only that meeting', () => {
  const override = item({ sourceEquipmentId: 'projector', quantity: 1 });
  assert.deepEqual(getMeetingEquipment('meeting-a', stock, [override]).items.map(entry => entry.quantity), [1]);
  assert.deepEqual(getMeetingEquipment('meeting-b', stock, [override]).items.map(entry => entry.quantity), [2]);
});

test('assigning a person keeps the general name and quantity live until either is changed for that meeting', () => {
  const assigned = item({ sourceEquipmentId: 'projector', inheritName: true, inheritQuantity: true });
  const changedStock = [{ ...stock[0], name: 'מקרן חדש', quantity: 4 }];
  assert.deepEqual(getMeetingEquipment('meeting-a', changedStock, [assigned]).items.map(entry => [entry.name, entry.quantity, entry.assignedTo]), [['מקרן חדש', 4, 'טל']]);
  const customized = { ...assigned, quantity: 1, inheritQuantity: false };
  assert.equal(getMeetingEquipment('meeting-a', changedStock, [customized]).items[0].quantity, 1);
});

test('excluded defaults stay hidden only in their meeting and can be restored by removing the override', () => {
  const excluded = item({ sourceEquipmentId: 'projector', excluded: true });
  assert.equal(getMeetingEquipment('meeting-a', stock, [excluded]).items.length, 0);
  assert.deepEqual(getMeetingEquipment('meeting-a', stock, [excluded]).hiddenDefaults.map(entry => entry.id), ['projector']);
  assert.equal(getMeetingEquipment('meeting-b', stock, [excluded]).items.length, 1);
  assert.equal(getMeetingEquipment('meeting-a', stock, []).items.length, 1);
});

test('older meeting entries with the same name replace the default without duplication', () => {
  const result = getMeetingEquipment('meeting-a', stock, [item({}), item({ id: 'custom', name: 'כבל', quantity: 3 })]);
  assert.equal(result.items.length, 2);
  assert.equal(result.items.find(entry => entry.name === 'מקרן')?.sourceEquipmentId, 'projector');
  assert.equal(result.items.find(entry => entry.name === 'כבל')?.quantity, 3);
});
