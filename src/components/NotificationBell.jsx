import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import { EmptyState, Skeleton } from './ui';

const TONE = { info: 'text-info', success: 'text-success', warning: 'text-warn', error: 'text-danger' };
const ICON = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark' };

export default function NotificationBell() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const wrap = useRef(null);

  const load = () =>
    api.get('/notifications/list.php')
      .then((d) => {
        setData(d);
        setErr(false);
      })
      .catch(() => setErr(true));

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  async function markAll() {
    try {
      await api.post('/notifications/read.php', { id: 0 });
      load();
    } catch {
      /* ignore */
    }
  }

  async function openItem(n) {
    if (!n.is_read) {
      try {
        await api.post('/notifications/read.php', { id: n.id });
        load();
      } catch {
        /* ignore */
      }
    }
    if (n.link) {
      setOpen(false);
      nav(n.link);
    }
  }

  const unread = Number(data?.unread || 0);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }} ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t('notif.title')}${unread ? ', ' + t('notif.unread', { n: unread }) : ''}`}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '1px solid var(--border-light, rgba(255,255,255,0.08))',
          background: 'var(--surface, #1e2433)',
          color: 'var(--text-muted, #94a3b8)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontSize: 15,
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        title="Bildirishnomalar"
      >
        <i className="fa-solid fa-bell" aria-hidden="true" />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              borderRadius: 9999,
              background: '#ef4444',
              color: '#ffffff',
              fontSize: 10.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--bg, #0b0f17)',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
              pointerEvents: 'none',
              lineHeight: 1,
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label={t('notif.title')}
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 'min(360px, calc(100vw - 24px))',
            zIndex: 50,
            borderRadius: 16,
            background: 'var(--surface, #1e2433)',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
            padding: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {t('notif.title')}
            </h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                style={{ fontSize: 12, color: 'var(--accent, #6366f1)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t('notif.markAll')}
              </button>
            )}
          </div>

          {!data && !err && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          )}

          {err && (
            <p style={{ fontSize: 13, color: '#ef4444', padding: '10px 0', margin: 0 }}>
              {t('notif.error')}
            </p>
          )}

          {data && data.items.length === 0 && (
            <EmptyState icon="fa-bell-slash" title={t('notif.empty')} body={t('notif.emptyHint')} />
          )}

          {data && data.items.length > 0 && (
            <ul style={{ maxHeight: '60vh', overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      gap: 10,
                      padding: '10px 12px',
                      background: n.is_read ? 'transparent' : 'var(--surface-2, rgba(255,255,255,0.04))',
                      border: '1px solid var(--border-light, rgba(255,255,255,0.05))',
                      borderRadius: 10,
                      cursor: 'pointer',
                      opacity: n.is_read ? 0.75 : 1,
                    }}
                  >
                    <i className={'fa-solid mt-0.5 ' + ICON[n.kind] + ' ' + TONE[n.kind]} aria-hidden="true" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{n.title}</b>
                      {n.body && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>{n.body}</span>}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{n.created_at}</span>
                    </span>
                    {!n.is_read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent, #6366f1)', marginTop: 6 }} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
