import type { CSSProperties } from 'react';
import { TEAM_CHARACTERS } from '../team';

export default function TeamAvatar({ name }: { name: string | null }) {
  const character = TEAM_CHARACTERS.find(member => member.name === name);
  if (!character) return <span aria-hidden="true" className="team-avatar team-avatar--fallback" />;
  const offsets = [
    { x: -4, y: -4 },
    { x: -4, y: 1 },
    { x: -4, y: 1 },
    { x: -3, y: 3 },
  ][character.row];

  return <span
    aria-hidden="true"
    className="team-avatar"
    style={{
      '--avatar-row': `${character.row * 100 / 3}%`,
      '--avatar-x': `${offsets.x}px`,
      '--avatar-top': `${offsets.y}px`,
    } as CSSProperties}
  ><span className="team-avatar__sprite" /></span>;
}
