import { useState } from 'react';
import { Modal } from './ui';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

const NOOP = () => {};

// Ism kiritilmagan foydalanuvchiga (Telegram/Google orqali yangi kirgan) bir marta ko'rsatiladi; yopib bo'lmaydi.
export default function NameModal() {
  const { status, user, saveName } = useAuth();
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const open = status === 'user' && !!user && user.ism_set === false;
  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    const ism = value.trim().replace(/\s+/g, ' ');
    if (ism.length < 2 || ism.length > 40) { setError(t('name.invalid')); return; }
    setBusy(true); setError('');
    const r = await saveName(ism);
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  return (
    <Modal open onClose={NOOP} title={t('name.title')} labelledBy="name-modal-title">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-text-muted text-[14px]">{t('name.hint')}</p>
        <input
          className="w-full rounded-[12px] border border-border bg-bg px-3 py-3 text-[16px] outline-none focus:border-accent"
          value={value} onChange={(e) => setValue(e.target.value)} placeholder={t('name.placeholder')}
          autoComplete="given-name" maxLength={40} aria-label={t('name.label')}
        />
        {error && <div role="alert" className="text-danger text-[13px]">{error}</div>}
        <button type="submit" disabled={busy} className="mf-button mf-button--primary">{t('name.save')}</button>
      </form>
    </Modal>
  );
}
