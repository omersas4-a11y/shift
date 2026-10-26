export const TEAM_CHARACTERS = [
  { name: 'אליאור', row: 0, color: '#ff7a32' },
  { name: 'יוגב', row: 1, color: '#23b6bb' },
  { name: 'עומר', row: 2, color: '#a580e2' },
  { name: 'טל', row: 3, color: '#e5ad38' },
];

export const TEAM_MEMBERS = TEAM_CHARACTERS.map(character => character.name);

export function normalizeTeamMember(value: unknown): string | null {
  if (value === "טל ג'וניור" || value === 'טל ג׳וניור' || value === 'טל גוניור') return 'טל';
  return typeof value === 'string' && TEAM_MEMBERS.includes(value) ? value : null;
}
