import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, IconButton, Input, PageHeader, Section, Skeleton, useToast } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useI18n } from '../i18n';

export default function Developer() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [keys, setKeys] = useState(null);
  const [hooks, setHooks] = useState(null);
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [evSel, setEvSel] = useState([]);
  const [secret, setSecret] = useState(null); // {title, value}
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // {kind:'key'|'hook', item}

  const load = useCallback(() => {
    api.get('/developer/keys.php').then((r) => setKeys(r.keys)).catch((e) => setErr(e.message));
    api.get('/developer/webhooks.php').then((r) => { setHooks(r.endpoints); setEvents(r.events); }).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    setBusy(true); setErr('');
    try { await fn(); load(); } catch (e) { setErr(e instanceof ApiError ? e.message : t('dev.fail')); } finally { setBusy(false); }
  }
  const createKey = (e) => { e.preventDefault(); act(async () => { const r = await api.post('/developer/keys.php', { name }); setSecret({ title: t('dev.secret.apiKey'), value: r.key }); setName(''); }); };
  const addHook = (e) => { e.preventDefault(); act(async () => { const r = await api.post('/developer/webhooks.php', { url, events: evSel }); setSecret({ title: t('dev.secret.webhook'), value: r.secret }); setUrl(''); setEvSel([]); }); };
  const doConfirm = () => {
    const c = confirm;
    setConfirm(null);
    act(() => (c.kind === 'key' ? api.post('/developer/keys.php', { amal: 'revoke', id: c.item.id }) : api.post('/developer/webhooks.php', { amal: 'delete', id: c.item.id })));
  };
  const copy = async (v) => { try { await navigator.clipboard?.writeText(v); toast(t('common.copied')); } catch { toast(t('dev.fail'), { tone: 'error' }); } };

  return (
    <div className="pg">
      <PageHeader title={t('dev.title')} subtitle={t('dev.subtitle')} />
      {err && <Alert tone="danger">{err}</Alert>}
      {secret && (
        <Alert tone="success">
          <b>{secret.title}</b> — {t('dev.secret.only')}
          <code style={{ display: 'block', marginTop: 8, padding: 10, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>{secret.value}</code>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button size="sm" onClick={() => copy(secret.value)}><i className="fa-regular fa-copy" aria-hidden="true" />{t('common.copy')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSecret(null)}>{t('common.close')}</Button>
          </div>
        </Alert>
      )}

      <Section title={t('dev.keys.title')}>
        <Card>
          <p className="pg-muted" style={{ fontSize: 13, marginBottom: 12 }}>{t('dev.keys.help')} <a href="/v1/docs" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>/v1/docs</a></p>
          <form onSubmit={createKey} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('dev.keys.name')} aria-label={t('dev.keys.name')} maxLength={60} />
            <Button type="submit" variant="primary" disabled={busy || !name.trim()}>{t('dev.keys.create')}</Button>
          </form>
          {keys === null ? <Skeleton className="h-12" /> : keys.length === 0 ? <EmptyState icon="fa-key" title={t('dev.keys.empty')} /> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {keys.map((k) => (
                <li key={k.id} className="pg-lb__row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
                  <div style={{ minWidth: 0 }}><b>{k.name}</b> <code className="pg-muted">{k.prefix}…</code><div className="pg-muted" style={{ fontSize: 12 }}>{t('dev.keys.lastUsed', { when: k.last_used_at || t('dev.keys.never') })}</div></div>
                  <IconButton icon="fa-trash" label={t('dev.keys.revoke') + ': ' + k.name} onClick={() => setConfirm({ kind: 'key', item: k })} style={{ color: 'var(--danger)' }} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

      <Section title={t('dev.hooks.title')}>
        <Card>
          <p className="pg-muted" style={{ fontSize: 13, marginBottom: 12 }}>{t('dev.hooks.help')}</p>
          <form onSubmit={addHook} className="pg-form" style={{ marginBottom: 12 }}>
            <Field label={t('dev.hooks.url')} htmlFor="hook-url"><Input id="hook-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sizning-sayt.uz/webhook" /></Field>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
              {events.map((ev) => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={evSel.includes(ev)} onChange={(e) => setEvSel((s) => (e.target.checked ? [...s, ev] : s.filter((x) => x !== ev)))} />{ev}
                </label>
              ))}
            </div>
            <p className="pg-muted" style={{ fontSize: 12 }}>{t('dev.hooks.all')}</p>
            <Button type="submit" variant="primary" disabled={busy || !url.trim()}>{t('dev.hooks.add')}</Button>
          </form>
          {hooks === null ? <Skeleton className="h-12" /> : hooks.length === 0 ? <EmptyState icon="fa-link" title={t('dev.hooks.empty')} /> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {hooks.map((h) => (
                <li key={h.id} className="pg-lb__row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
                  <div style={{ minWidth: 0 }}><div className="pg-lb__name">{h.url}</div><div className="pg-muted" style={{ fontSize: 12 }}>{h.events}</div></div>
                  <IconButton icon="fa-trash" label={t('dev.hooks.delete')} onClick={() => setConfirm({ kind: 'hook', item: h })} style={{ color: 'var(--danger)' }} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doConfirm}
        title={confirm?.kind === 'key' ? t('dev.keys.revokeTitle') : t('dev.hooks.delete')}
        body={confirm?.kind === 'key' ? t('dev.keys.revokeBody', { name: confirm.item.name }) : t('dev.hooks.deleteBody')}
        confirmLabel={t('dev.keys.revoke')} />
    </div>
  );
}
