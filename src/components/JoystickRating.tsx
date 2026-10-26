const GAMEPAD_IMAGE = '/feedback/gamepad-orange.png';

function Gamepad({ fill, compact }: { fill: number; compact: boolean }) {
  const visibleFraction = Math.min(1, Math.max(0, fill));
  return <span className={compact ? 'relative block w-9 shrink-0' : 'relative block w-full max-w-[82px]'} aria-hidden="true">
    <img src={GAMEPAD_IMAGE} alt="" draggable={false} className="block h-auto w-full select-none grayscale opacity-45" />
    {visibleFraction > 0 && <img
      src={GAMEPAD_IMAGE}
      alt=""
      draggable={false}
      className="absolute inset-0 block h-full w-full select-none"
      style={{ clipPath: `inset(0 0 0 ${(1 - visibleFraction) * 100}%)` }}
    />}
  </span>;
}

export default function JoystickRating({ value, onChange, compact = false }: { value: number; onChange?: (value: number) => void; compact?: boolean }) {
  return <div className={compact ? 'flex items-center gap-0.5' : 'grid grid-cols-5 gap-1 sm:gap-2'} role={onChange ? 'radiogroup' : 'img'} aria-label={`דירוג ${Number(value.toFixed(2))} מתוך 5 ג'ויסטיקים`}>
    {Array.from({ length: 5 }, (_, index) => {
      const point = index + 1;
      return onChange ? <button key={point} type="button" role="radio" aria-checked={value === point} aria-label={`${point} מתוך 5`} onClick={() => onChange(point)} className="flex min-h-14 min-w-0 items-center justify-center rounded-lg bg-transparent p-0.5 transition duration-150 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A00] sm:min-h-[72px]"><Gamepad fill={point <= value ? 1 : 0} compact={false} /></button>
        : <Gamepad key={point} fill={value - index} compact={compact} />;
    })}
  </div>;
}
