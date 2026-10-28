import type { Equipment, MeetingEquipment } from '../types';

export const inventoryItemId = (id: string) => `inventory:${id}`;

export function getMeetingEquipment(
  meetingId: string,
  inventory: Equipment[],
  meetingEquipment: MeetingEquipment[],
) {
  const saved = meetingEquipment.filter(item => item.meetingId === meetingId);
  const used = new Set<string>();
  const hiddenDefaults: Equipment[] = [];
  const items: MeetingEquipment[] = [];

  for (const stock of inventory) {
    const normalizedName = stock.name.trim().toLocaleLowerCase('he');
    const override = saved.find(item => item.sourceEquipmentId === stock.id)
      ?? saved.find(item => !item.sourceEquipmentId && item.name.trim().toLocaleLowerCase('he') === normalizedName && !used.has(item.id));
    if (override) used.add(override.id);
    if (override?.excluded) {
      hiddenDefaults.push(stock);
      continue;
    }
    items.push(override
      ? { ...override, sourceEquipmentId: stock.id, name: override.inheritName ? stock.name : override.name, quantity: override.inheritQuantity ? stock.quantity : override.quantity }
      : { id: inventoryItemId(stock.id), meetingId, sourceEquipmentId: stock.id, name: stock.name, quantity: stock.quantity, assignedTo: '' });
  }

  for (const item of saved) {
    if (!used.has(item.id) && !item.excluded) items.push(item);
  }

  return {
    items: items.sort((a, b) => a.name.localeCompare(b.name, 'he')),
    hiddenDefaults,
  };
}
