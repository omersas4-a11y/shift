import type { CSSProperties } from 'react';
import { useStore } from '../../StoreContext';
import { TEAM_CHARACTERS } from '../../team';
import './LoginView.css';

export default function LoginView() {
  const { setCurrentUser } = useStore();

  return (
    <main className="character-select" dir="rtl" aria-labelledby="character-heading">
      <div className="character-select__content">
        <img src="/logos/shift logo.png" alt="SHIFT" className="character-select__logo" />
        <div className="character-select__eyebrow" aria-hidden="true"><span /> הצוות של SHIFT <span /></div>
        <h1 id="character-heading">מי נכנס למשחק?</h1>
        <p className="character-select__intro">בחרו את הדמות שלכם ובואו נתחיל.</p>
        <div className="character-select__roster" aria-label="בחירת חבר צוות">
          {TEAM_CHARACTERS.map(({ name, row, color }, index) => (
            <button
              key={name}
              type="button"
              onClick={() => setCurrentUser(name)}
              className="character-choice"
              aria-label={`כניסה בתור ${name}`}
              style={{
                '--character-color': color,
                '--sprite-row': `${row * 100 / 3}%`,
                '--blink-offset': ['6.4cqw', '5.8cqw', '6.1cqw', '5.1cqw'][row],
                '--wave-offset': ['11.5cqw', '10.7cqw', '10.5cqw', '8.2cqw'][row],
                '--center-offset': ['-4.9cqw', '-4.7cqw', '-4.9cqw', '-3.8cqw'][row],
                '--baseline-offset': ['0cqw', '0cqw', '3.2cqw', '4.5cqw'][row],
                '--blink-delay': `${index * -1.6}s`,
              } as CSSProperties}
            >
              <span className="character-choice__stage" aria-hidden="true">
                <span className="character-choice__sprite" />
                <span className="character-choice__blink" />
                <span className="character-choice__wave" />
              </span>
              <span className="character-choice__name">{name}</span>
              <span className="character-choice__action" aria-hidden="true">בואו נשחק <span>←</span></span>
            </button>
          ))}
        </div>
        <p className="character-select__footer"><span aria-hidden="true">✦</span> ארבע דמויות. צוות אחד.</p>
      </div>
    </main>
  );
}
