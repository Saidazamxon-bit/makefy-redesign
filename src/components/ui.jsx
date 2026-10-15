import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';

// ===== MAKEFY UI KUTUBXONASI — barcha sahifalar shu primitivlardan foydalanadi (uslub: design/primitives.css) =====
const cx = (...a) => a.filter(Boolean).join(' ');

/* ---------- Tugmalar ---------- */
const BTN_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
export function Button({ variant = 'secondary', size, loading = false, disabled, className, children, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('mf-btn', 'mf-btn--' + (BTN_VARIANTS.includes(variant) ? variant : 'secondary'), size === 'sm' && 'mf-btn--sm', className)}
    >
      {loading && <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// Faqat belgi bo'lgan tugma: `label` majburiy (ekran o'qigich va tooltip uchun)
export function IconButton({ icon, label, className, ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cx('mf-iconbtn', className)}>
      <i className={'fa-solid ' + icon} aria-hidden="true" />
    </button>
  );
}

/* ---------- Yuzalar ---------- */
export function Card({ variant, interactive, className, children, ...rest }) {
  return (
    <section {...rest} className={cx('mf-card', variant === 'flat' && 'mf-card--flat', variant === 'muted' && 'mf-card--muted', interactive && 'mf-card--interactive', className)}>
      {children}
    </section>
  );
}

const BADGE_TONES = ['success', 'warning', 'danger', 'info'];
export function Badge({ tone = 'neutral', dot, children }) {
  return (
    <span className={cx('mf-badge', BADGE_TONES.includes(tone) && 'mf-badge--' + tone)}>
      {dot && <span className="mf-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Alert({ tone = 'info', icon, children, className }) {
  const icons = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', danger: 'fa-circle-exclamation' };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('mf-alert', tone !== 'info' && 'mf-alert--' + tone, className)}>
      <i className={'fa-solid ' + (icon || icons[tone] || icons.info)} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Progress({ value = 0, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="mf-progress" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span style={{ width: v + '%' }} /></div>;
}

/* ---------- Holatlar: yuklanish / bo'sh / xato ---------- */
export function Skeleton({ className = 'h-16' }) {
  return <div className={cx('mf-skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({ icon = 'fa-inbox', title, body, action }) {
  return (
    <div className="mf-empty">
      <div className="mf-empty__icon"><i className={'fa-solid ' + icon} aria-hidden="true" /></div>
      <h3 className="mf-empty__title">{title}</h3>
      {body && <p className="mf-empty__body">{body}</p>}
      {action && <div className="mf-empty__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="mf-empty" role="alert">
      <div className="mf-empty__icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /></div>
      <h3 className="mf-empty__title">{title || t('common.error.title')}</h3>
      <p className="mf-empty__body">{body || t('common.error.body')}</p>
      {onRetry && <div className="mf-empty__action"><Button onClick={onRetry}><i className="fa-solid fa-rotate-right" aria-hidden="true" />{t('common.retry')}</Button></div>}
    </div>
  );
}

/* ---------- Sahifa tuzilishi ---------- */
export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <header className={cx('mf-pagehead', className)}>
      <div>
        <h1 className="mf-h1">{title}</h1>
        {subtitle && <p className="mf-pagehead__sub">{subtitle}</p>}
      </div>
      {actions && <div className="mf-pagehead__actions">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, className, children }) {
  return (
    <section className={cx('mf-section', className)}>
      {(title || action) && (
        <div className="mf-section__head">
          {title && <h2 className="mf-section__title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon, className }) {
  return (
    <div className={cx('mf-stat', className)}>
      <div className="mf-stat__label">
        {icon && <span className="mf-stat__icon"><i className={'fa-solid ' + icon} aria-hidden="true" /></span>}
        {label}
      </div>
      <div className="mf-stat__value">{value}</div>
      {hint && <div className="mf-stat__hint">{hint}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="mf-crumbs">
        {items.map((c, i) => <li key={i}>{c.href && i < items.length - 1 ? <a href={c.href}>{c.label}</a> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{c.label}</span>}</li>)}
      </ol>
    </nav>
  );
}

/* ---------- Shakl elementlari ---------- */
export function Field({ label, hint, error, htmlFor, className, children }) {
  return (
    <div className={cx('mf-field', className)}>
      {label && <label className="mf-field__label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <div className="mf-field__hint">{hint}</div>}
      {error && <div className="mf-field__error" role="alert">{error}</div>}
    </div>
  );
}
export const Input = forwardRef(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx('mf-input', className)} {...rest} />;
});
export const Textarea = forwardRef(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cx('mf-textarea', className)} {...rest} />;
});
export const Select = forwardRef(function Select({ invalid, className, children, ...rest }, ref) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={cx('mf-select', className)} {...rest}>{children}</select>;
});
export function Switch({ checked, onChange, label, disabled, ...rest }) {
  return (
    <label className="mf-switch">
      <input type="checkbox" role="switch" checked={!!checked} disabled={disabled} aria-label={label} onChange={(e) => onChange?.(e.target.checked)} {...rest} />
      <i aria-hidden="true" />
    </label>
  );
}

/* ---------- Tablar (←/→ bilan boshqariladi) ---------- */
export function Tabs({ items, value, onChange, ariaLabel }) {
  const onKey = (e) => {
    const i = items.findIndex((x) => x.id === value);
    const next = e.key === 'ArrowRight' ? (i + 1) % items.length : e.key === 'ArrowLeft' ? (i - 1 + items.length) % items.length : null;
    if (next === null) return;
    e.preventDefault();
    onChange(items[next].id);
    e.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  return (
    <div className="mf-tabs" role="tablist" aria-label={ariaLabel} onKeyDown={onKey}>
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} tabIndex={value === it.id ? 0 : -1} className="mf-tab" onClick={() => onChange(it.id)}>{it.label}</button>
      ))}
    </div>
  );
}

export function Tooltip({ text, children }) {
  return <span className="mf-tip" data-tip={text}>{children}</span>;
}

/* ---------- Jadval: mobilda kartalarga aylanadi ---------- */
export function Table({ columns, rows, rowKey = 'id', empty, cards = true }) {
  if (!rows?.length) return empty || null;
  return (
    <div className="mf-tablewrap">
      <table className={cx('mf-table', cards && 'mf-table--cards')}>
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" style={c.align ? { textAlign: c.align } : undefined}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[rowKey] ?? i}>
              {columns.map((c) => <td key={c.key} data-label={typeof c.header === 'string' ? c.header : undefined} style={c.align ? { textAlign: c.align } : undefined}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const { t } = useI18n();
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mf-pager">
      <span>{from}–{to} / {total}</span>
      <div className="mf-pager__btns">
        <Button size="sm" disabled={page <= 0} onClick={() => onChange(page - 1)}><i className="fa-solid fa-chevron-left" aria-hidden="true" />{t('common.prev')}</Button>
        <Button size="sm" disabled={to >= total} onClick={() => onChange(page + 1)}>{t('common.next')}<i className="fa-solid fa-chevron-right" aria-hidden="true" /></Button>
      </div>
    </div>
  );
}

/* ---------- Dialog / Drawer / Tasdiqlash ---------- */
function useDialog(open, onClose, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => ref.current?.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])') || [];
    (focusables()[0] || ref.current)?.focus();
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = [...focusables()];
      if (!f.length) { e.preventDefault(); return; }
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open, onClose, ref]);
}

export function Modal({ open, onClose, title, children, labelledBy }) {
  const ref = useRef(null);
  const auto = useId();
  const titleId = labelledBy || auto;
  useDialog(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <div className="mf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1} className="mf-modal">
        {title && <h2 id={titleId} className="mf-modal__title">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useDialog(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <>
      <div className="mf-modal-backdrop" onMouseDown={onClose} />
      <aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1} className="mf-drawer">
        {title && <h2 id={titleId} className="mf-modal__title">{title}</h2>}
        {children}
      </aside>
    </>,
    document.body,
  );
}

// Xavfli amallar oldidan tasdiqlash (o'chirish, bekor qilish va h.k.)
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, cancelLabel, tone = 'danger', loading = false }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {body && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>{body}</p>}
      <div className="mf-modal__actions">
        <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel || t('common.cancel')}</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel || t('common.confirm')}</Button>
      </div>
    </Modal>
  );
}

/* ---------- Toast ---------- */
const ToastCtx = createContext({ toast: () => {} });
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((text, { tone = 'success', action, onAction } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, text, tone, action, onAction }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="mf-toasts" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} role="status" className={cx('mf-toast', i.tone === 'error' && 'mf-toast--error', i.tone === 'success' && 'mf-toast--success')}>
            <span>{i.text}</span>
            {i.action && <button type="button" onClick={() => { i.onAction?.(); setItems((s) => s.filter((x) => x.id !== i.id)); }}>{i.action}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
