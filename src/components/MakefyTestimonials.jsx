// Render testimonials as a premium horizontal marquee carousel
import '../styles/testimonials.css';

const MAKEFY_REVIEWS = [
  {
    name: 'Sardorbek K.',
    username: '@sardor_dev',
    role: 'Kino Bot Admini',
    badge: 'Tasdiqlangan',
    avatar: 'S',
    comment:
      'Kino botimni 2 daqiqada ishga tushirdim. Kod yozish shart emasligi va to\'lovlar avtomatik ekani juda qulay!',
  },
  {
    name: 'Javohir Elmurodov',
    username: '@javohir_shop',
    role: 'Onlayn Do\'kon Ega',
    badge: 'Tasdiqlangan',
    avatar: 'J',
    comment:
      'Telegram Mini App do\'konim tayyor bo\'ldi. Buyurtmalarni va balansni kuzatish bitta paneldan qilinyapti.',
  },
  {
    name: 'Madina Aliyeva',
    username: '@madina_edu',
    role: 'Yopiq Kanal Admini',
    badge: 'Tasdiqlangan',
    avatar: 'M',
    comment:
      'Yopiq klubim uchun obuna botini uladim. Kunlik ijarasi va avto-yechib olinishi juda shaffof.',
  },
  {
    name: 'Bekzod Rustamov',
    username: '@bekzod_promo',
    role: 'Konkurs & Quiz Bot',
    badge: 'Tasdiqlangan',
    avatar: 'B',
    comment:
      'Referal va pul ishlash bo\'limi orqali obunachilarim soni 5 baravarga oshdi. Ajoyib platforma!',
  },
  {
    name: "Ulug'bek T.",
    username: '@ulugbek_stars',
    role: 'Digital Mahsulotlar',
    badge: 'Tasdiqlangan',
    avatar: 'U',
    comment:
      'Telegram Stars va karta orqali balansni to\'ldirish juda tez ishlaydi. Qo\'llab-quvvatlash xizmatiga rahmat!',
  },
  {
    name: 'Dilnoza Karimova',
    username: '@dilnoza_growth',
    role: 'Bot Marketing Boshqaruvchisi',
    badge: 'Tasdiqlangan',
    avatar: 'D',
    comment:
      'Makefy orqali kanal obunalari, balans va kunlik ijara boshqaruvi bir joyga yig\'ildi. Boshqaruv osonlashdi.',
  },
];

function ReviewCard({ review }) {
  return (
    <article className="testimonial-card" aria-label={`Testimonial by ${review.name}`}>
      <header className="testimonial-header">
        <div className="testimonial-avatar" aria-hidden>
          {review.avatar}
        </div>

        <div className="testimonial-meta">
          <h4 className="testimonial-name">{review.name}</h4>
          <div className="testimonial-username">{review.username}</div>
        </div>
      </header>

      <div className="testimonial-rating" aria-hidden="true">
        <span className="stars" title="5.0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.556L18.835 24 12 20.01 5.165 24l1.135-8.694L.6 9.75l7.732-1.732z" />
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.556L18.835 24 12 20.01 5.165 24l1.135-8.694L.6 9.75l7.732-1.732z" />
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.556L18.835 24 12 20.01 5.165 24l1.135-8.694L.6 9.75l7.732-1.732z" />
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.556L18.835 24 12 20.01 5.165 24l1.135-8.694L.6 9.75l7.732-1.732z" />
          </svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.556L18.835 24 12 20.01 5.165 24l1.135-8.694L.6 9.75l7.732-1.732z" />
          </svg>
        </span>
        <span className="rating-value">5.0</span>
      </div>

      <div className="testimonial-content">
        <p>“{review.comment}”</p>
      </div>

      <footer className="testimonial-footer">
        <div className="testimonial-role">{review.role}</div>
        <div className="testimonial-badge" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </footer>
    </article>
  );
}

import { useEffect, useRef } from 'react';

export default function MakefyHeroReviews() {
  const duration = Math.max(22, Math.min(40, MAKEFY_REVIEWS.length * 6));
  const maskRef = useRef(null);
  const lastCenterRef = useRef(null);

  useEffect(() => {
    const root = maskRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll('.testimonial-item'));
    if (!items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // choose the entry with the largest intersectionRatio
        let best = null;
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (!best) return;

        // remove previous
        if (lastCenterRef.current && lastCenterRef.current !== best.target) {
          const prevCard = lastCenterRef.current.querySelector('.testimonial-card');
          prevCard?.classList.remove('is-center');
        }

        const card = best.target.querySelector('.testimonial-card');
        if (card) {
          card.classList.add('is-center');
          lastCenterRef.current = best.target;
        }
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    items.forEach((it) => observer.observe(it));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative w-full bg-slate-950 py-16 text-white">
      <div className="mx-auto mb-10 max-w-3xl px-4 text-center">
        <h2 className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          Minglab bot yaratuvchilar Makefy'ni tanlamoqda
        </h2>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          Kod yozmasdan Telegram bot, Mini App va biznesingizni avtomatlashtiring.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div className="relative testimonials-glow">
          <div className="testimonials-mask" ref={maskRef}>
            <div
              className="testimonials-track"
              style={{ ['--marquee-duration']: `${duration}s` }}
            >
              <div className="testimonial-sequence" aria-hidden="false">
                {MAKEFY_REVIEWS.map((rev, i) => (
                  <div key={`seq1-${i}`} className="testimonial-item">
                    <ReviewCard review={rev} />
                  </div>
                ))}
              </div>

              <div className="testimonial-sequence" aria-hidden="true">
                {MAKEFY_REVIEWS.map((rev, i) => (
                  <div key={`seq2-${i}`} className="testimonial-item" aria-hidden>
                    <ReviewCard review={rev} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
