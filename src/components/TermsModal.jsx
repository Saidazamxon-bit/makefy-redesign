import { useEffect, useState } from 'react';
import { Modal } from './ui';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

const NOOP = () => {};

// Ism kiritilgach ko'rsatiladi: shartlar + javobgarlik. «Roziman» bosilmaguncha davom etib bo'lmaydi.
export default function TermsModal() {
  const { status, user, acceptTerms } = useAuth();
  const { t } = useI18n();
  const [terms, setTerms] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const open = status === 'user' && !!user && user.ism_set === true && user.terms_ok === false;

  useEffect(() => {
    if (!open || terms) return;
    api.get('/terms.php').then(setTerms).catch(() => setError(t('terms.loadError')));
  }, [open, terms, t]);

  if (!open) return null;

  async function accept() {
    if (!terms) return;
    setBusy(true); setError('');
    const r = await acceptTerms(terms.version);
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  return (
    <Modal open onClose={NOOP} title={terms?.title || t('terms.title')} labelledBy="terms-modal-title">
      <div className="flex flex-col gap-3">
        {!terms && !error && <div className="h-40 rounded-[12px] bg-surface-2 animate-pulse" />}
        {terms && (
          <ol className="list-decimal pl-5 flex flex-col gap-2 text-[13.5px] text-text-muted max-h-[52vh] overflow-y-auto pr-1">
            {terms.clauses.map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        )}
        {terms && <p className="text-[12px] text-text-dim">{t('terms.version')}: {terms.version}</p>}
        {error && <div role="alert" className="text-danger text-[13px]">{error}</div>}
        <button type="button" disabled={busy || !terms} onClick={accept} className="mf-button mf-button--primary">{t('terms.accept')}</button>
      </div>
    </Modal>
  );
}
