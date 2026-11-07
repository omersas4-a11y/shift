const leaves = Array.from({ length: 4 }, (_, index) => index);

function Tree({ side }: { side: 'left' | 'right' }) {
  return (
    <span className={`pixel-world__tree pixel-world__tree--${side}`}>
      {leaves.map(index => <span key={index} className={`pixel-world__leaf pixel-world__leaf--${index}`} />)}
    </span>
  );
}

export default function PixelWorld() {
  return (
    <div className="pixel-world" aria-hidden="true">
      <Tree side="left" />
      <Tree side="right" />
      <span className="pixel-world__heart pixel-world__heart--one" />
      <span className="pixel-world__heart pixel-world__heart--two" />
      <span className="pixel-world__gem pixel-world__gem--one" />
      <span className="pixel-world__gem pixel-world__gem--two" />
      <span className="pixel-world__gem pixel-world__gem--three" />
    </div>
  );
}
