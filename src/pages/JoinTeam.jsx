import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, PageHeader } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useI18n } from '../i18n';

const TOKEN_RE = /^[a-f0-9]{40}$/;

export default function JoinTeam() {
  const { t } = useI18n();
  const [sp] = useSearchParams();
  const token = sp.get('token') || '';
  const valid = TOKEN_RE.test(token);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true); setErr('');
    try { setRes(await api.post('/team/accept.php', { token })); }
    catch (e) { setErr(e instanceof ApiError ? e.message : t('team.join.fail')); }
    finally { setBusy(false); }
  }

  return (
    <div className="pg pg-public__narrow" style={{ margin: '0 auto', paddingTop: 24 }}>
      <PageHeader title={t('team.join.title')} subtitle={t('team.join.subtitle')} />
      {!valid && <Alert tone="danger">{t('team.join.invalid')}</Alert>}
      {err && <Alert tone="danger">{err}</Alert>}
      {res ? (
        <Card role="status">
          <p>{t('team.join.joined', { bot: res.bot, role: res.role })}</p>
          <Link to={`/bots/${res.bot}`} className="mf-btn mf-btn--primary" style={{ marginTop: 16 }}>{t('team.join.open')}</Link>
        </Card>
      ) : (
        <Button variant="primary" loading={busy} disabled={!valid} onClick={accept} style={{ width: '100%' }}>
          {busy ? t('team.join.accepting') : t('team.join.accept')}
        </Button>
      )}
    </div>
  );
}
