import "../styles/Pwa.css";

export default function PwaSplash() {
  return (
    <div className="pwaSplash" role="status" aria-live="polite">
      <div className="pwaSplash__card">
        <div className="pwaSplash__pack" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <p className="pwaSplash__eyebrow">Wankul TCG</p>
          <h1>Chargement de ta collection</h1>
          <p className="pwaSplash__text">
            On reveille les boosters, le market et tes cartes cachees.
          </p>
        </div>
        <div className="pwaSplash__bar" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
