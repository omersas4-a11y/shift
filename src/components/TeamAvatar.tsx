import type { CSSProperties } from 'react';
import { TEAM_CHARACTERS } from '../team';

export default function TeamAvatar({ name }: { name: string | null }) {
  const character = TEAM_CHARACTERS.find(member => member.name === name);
  if (!character) return <span aria-hidden="true" className="team-avatar team-avatar--fallback" />;

  return <span
    aria-hidden="true"
    className="team-avatar"
    style={{
      '--avatar-row': `${character.row * 100 / 3}%`,
      '--avatar-top': character.row === 0 ? '-20px' : '-11px',
    } as CSSProperties}
  ><span className="team-avatar__sprite" /></span>;
}
