import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, Input, PageHeader, Section, Select, Skeleton, useToast } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useI18n } from '../i18n';

const ACTIONS = ['member.add', 'member.role', 'member.remove', 'member.leave', 'invite.create', 'invite.accept', 'broadcast.send', 'bot.create'];

export default function Team() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState('');
  const [role, setRole] = useState('moderator');
  const [uid, setUid] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const q = `bot=${encodeURIComponent(username)}`;

  const load = useCallback(() => {
    api.get(`/team/list.php?${q}`).then((r) => { setData(r); setErr(''); }).catch((e) => setErr(e.message));
    api.get(`/team/audit.php?${q}`).then((r) => setAudit(r.items)).catch(() => setAudit([]));
  }, [q]);
  useEffect(() => { load(); }, [load]);

  async function run(fn, okText) {
    setBusy(true); setErr('');
    try { await fn(); toast(okText); load(); return true; } catch (e) { setErr(e instanceof ApiError ? e.message : t('team.fail')); return false; } finally { setBusy(false); }
  }
  const add = async (e) => { e.preventDefault(); if (await run(() => api.post(`/team/set_role.php?${q}`, { user_id: uid.trim(), role }), t('team.saved'))) setUid(''); };
  const changeRole = (m, r) => run(() => api.post(`/team/set_role.php?${q}`, { user_id: m.user_id, role: r }), t('team.roleChanged'));
  const confirmRemove = async () => { const m = removeTarget; setRemoveTarget(null); await run(() => api.post(`/team/remove.php?${q}`, { user_id: m.user_id }), t('team.removed')); };
  async function invite() {
    setBusy(true); setErr(''); setLink('');
    try {
      const r = await api.post(`/team/invite.php?${q}`, { role });
      setLink(`${window.location.origin}/join?token=${r.token}`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : t('team.fail')); } finally { setBusy(false); }
  }
  const copy = async (v) => { try { await navigator.clipboard?.writeText(v); toast(t('common.copied')); } catch { toast(t('team.fail'), { tone: 'error' }); } };

  if (err && !data) return <div className="pg"><ErrorState body={err} onRetry={load} /><Link to="/bots" className="mf-btn mf-btn--ghost" style={{ justifySelf: 'center' }}>← {t('team.backList')}</Link></div>;
  if (!data) return <div className="pg-skeleton" aria-busy="true"><Skeleton className="h-14 w-1/2" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;

  const assignable = data.myRole === 'owner' ? ['admin', 'moderator', 'viewer'] : ['moderator', 'viewer'];
  const nonOwner = data.members.length - 1;
  const canEdit = (m) => m.role !== 'owner' && (m.role !== 'admin' || data.myRole === 'owner');

  return (
    <div className="pg">
      <PageHeader title={t('team.title', { bot: username })}
        actions={<Link to={`/bots/${username}`} className="mf-btn mf-btn--ghost"><i className="fa-solid fa-arrow-left" aria-hidden="true" />{t('team.back')}</Link>} />
      {err && <Alert tone="danger">{err}</Alert>}

      <Section title={t('team.add.title')}>
        <Card>
          <p className="pg-muted" style={{ fontSize: 13, marginBottom: 12 }}>{t('team.add.count', { n: nonOwner, limit: data.limit > 0 ? ` / ${data.limit}` : '' })}</p>
          <form onSubmit={add} className="pg-form">
            <Field label={t('team.add.userAria')} htmlFor="team-uid"><Input id="team-uid" value={uid} onChange={(e) => setUid(e.target.value)} placeholder={t('team.add.placeholder')} autoComplete="off" /></Field>
            <Field label={t('team.role')} htmlFor="team-role" hint={t('team.help.' + role)}>
              <Select id="team-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {assignable.map((r) => <option key={r} value={r}>{t('team.role.' + r)}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="submit" variant="primary" disabled={busy || !uid.trim()} style={{ flex: 1 }}>{t('team.add.btn')}</Button>
              <Button onClick={invite} disabled={busy} style={{ flex: 1 }}><i className="fa-solid fa-link" aria-hidden="true" />{t('team.add.link')}</Button>
            </div>
          </form>
          {link && (
            <Alert tone="info" className="" >
              <b>{t('team.link.title')}</b> {t('team.link.note')}
              <code style={{ display: 'block', marginTop: 8, wordBreak: 'break-all' }}>{link}</code>
              <Button size="sm" style={{ marginTop: 10 }} onClick={() => copy(link)}><i className="fa-regular fa-copy" aria-hidden="true" />{t('common.copy')}</Button>
            </Alert>
          )}
        </Card>
      </Section>

      <Section title={t('team.members')}>
        <Card>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {data.members.map((m) => (
              <li key={m.user_id} className="pg-lb__row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
                <span className="pg-lb__name" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 500 }}>{m.user_id}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {canEdit(m) ? (
                    <div style={{ width: 140 }}>
                      <Select value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label={t('team.memberRoleAria', { id: m.user_id })} disabled={busy}>
                        {assignable.map((r) => <option key={r} value={r}>{t('team.role.' + r)}</option>)}
                      </Select>
                    </div>
                  ) : <Badge>{t('team.role.' + m.role)}</Badge>}
                  {canEdit(m) && <IconButton icon="fa-user-minus" label={t('team.remove')} onClick={() => setRemoveTarget(m)} style={{ color: 'var(--danger)' }} />}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {audit && (
        <Section title={t('team.audit.title')}>
          <Card>
            {audit.length === 0 ? <EmptyState icon="fa-clock-rotate-left" title={t('team.audit.empty')} /> : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {audit.map((a) => (
                  <li key={a.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                    <div className="mf-section__head"><b>{ACTIONS.includes(a.action) ? t('team.action.' + a.action) : a.action}</b><span className="pg-muted pg-num" style={{ fontSize: 12 }}>{a.created_at}</span></div>
                    <div className="pg-muted">{t('team.audit.by')}: <span style={{ fontFamily: 'ui-monospace, monospace' }}>{a.actor_id}</span></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>
      )}

      <ConfirmDialog open={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={confirmRemove} loading={busy}
        title={t('team.removeTitle')} body={t('team.removeBody', { id: removeTarget?.user_id || '' })} confirmLabel={t('team.remove')} />
    </div>
  );
}
