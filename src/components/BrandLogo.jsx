export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <span className={('mf-brand ' + (compact ? 'mf-brand--compact ' : '') + className).trim()}>
      <img
        src="/makefy-logo.png"
        alt="Makefy"
        className="mf-brand__image"
        onError={(event) => {
          if (event.currentTarget.src.endsWith('/makefy-logo.png')) {
            event.currentTarget.src = '/makerbot-logo.png';
          }
        }}
      />
      {!compact && <span className="mf-brand__wordmark">Makefy<span>.</span></span>}
    </span>
  );
}
