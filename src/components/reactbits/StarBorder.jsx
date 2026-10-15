import './StarBorder.css';

export default function StarBorder({
  as: Component = 'button',
  className = '',
  color = '#00f5a0',
  speed = '6s',
  thickness = 1,
  backgroundColor = 'var(--surface)',
  textColor = 'var(--text)',
  borderColor = 'rgba(0,245,160,.25)',
  children,
  ...rest
}) {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{ padding: `${thickness}px 0`, ...rest.style }}
      {...rest}
    >
      <span
        className="border-gradient-bottom"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <span
        className="border-gradient-top"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <span className="inner-content" style={{ background: backgroundColor, color: textColor, borderColor }}>
        {children}
      </span>
    </Component>
  );
}