import { useEffect, useRef, useState } from 'react';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

let gsiScriptPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('GSI yuklanmadi')));
        return;
      }
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('GSI yuklanmadi'));
      document.head.appendChild(script);
    });
  }
  return gsiScriptPromise;
}

/**
 * Google bilan kirish/ro'yxatdan o'tish — doim Google'ning HAQIQIY,
 * o'zining akkaunt tanlash oynasini (renderButton) ko'rsatadi.
 *
 * ESLATMA: avvalgi versiya "One Tap" (prompt()) usulidan foydalangan edi —
 * bu ba'zi brauzerlarda sukut ko'rsatilmay qolar, avtomatik bitta hisobni
 * tanlab yuborar yoki umuman ko'rinmas edi. Google'ning o'zi tavsiya
 * qiladigan, har doim barqaror ishlaydigan yo'l — renderButton: u bosilganda
 * to'g'ridan-to'g'ri Google akkauntlar ro'yxatini ochadi.
 */
export default function GoogleSignInButton({ onCredential, disabled }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const onCredentialRef = useRef(onCredential);
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) {
      setFailed(true);
      return undefined;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;

        if (!initializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => onCredentialRef.current?.(response.credential),
            auto_select: false,
            itp_support: true,
          });
          initializedRef.current = true;
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(containerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: 320,
            locale: 'uz',
          });
        }

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId || failed) {
    return <div className="makefy-google-signin-error">Google orqali kirish hozircha mavjud emas.</div>;
  }

  return (
    <div className="makefy-google-signin-wrap" aria-busy={disabled || !ready}>
      <div ref={containerRef} className="makefy-google-signin-native" />
      {!ready && <div className="makefy-google-signin-skeleton">Yuklanmoqda…</div>}
      {disabled && <div className="makefy-google-signin-overlay" />}
    </div>
  );
}
