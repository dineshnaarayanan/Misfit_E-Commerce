import { useState, useEffect } from 'react';

const SLIDES = [
  {
    category: 'oversized',
    eyebrow: 'New Drop',
    title: ['Oversized', 'Culture'],
    sub: 'Drop shoulders, drop expectations.',
    bg: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
    accent: '#6366f1',
    img: '/hero1.png',
  },
  {
    category: 'acid-wash',
    eyebrow: 'Street Edit',
    title: ['Acid', 'Washed'],
    sub: 'Every piece tells its own story.',
    bg: 'linear-gradient(135deg, #2d1b4e 0%, #4a1a6e 50%, #6b21a8 100%)',
    accent: '#c084fc',
    img: '/hero2.png',
  },
  {
    category: 'polo',
    eyebrow: 'Classic Series',
    title: ['Polo', 'Redefined'],
    sub: 'Smart casual, sharper edge.',
    bg: 'linear-gradient(135deg, #0f2010 0%, #1a3a1a 50%, #14532d 100%)',
    accent: '#4ade80',
    img: '/hero3.png',
  },
];

export default function HeroSlider({ onFilter }) {
  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState(null);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => {
        setPrev(i);
        return (i + 1) % SLIDES.length;
      });
    }, 4500);
    return () => clearInterval(t);
  }, []);

  function go(dir) {
    setPrev(idx);
    setIdx(i => (i + dir + SLIDES.length) % SLIDES.length);
  }

  const s = SLIDES[idx];

  return (
    <div className="hero-slider" style={{
      position: 'relative', overflow: 'hidden', borderRadius: 20,
      height: 280, background: s.bg, transition: 'background 0.6s ease',
    }}>
      {/* Animated background glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 70% 50%, ${s.accent}22 0%, transparent 70%)`,
        transition: 'background 0.6s ease', pointerEvents: 'none',
      }} />

      {/* Slides */}
      {SLIDES.map((slide, i) => (
        <div key={slide.category}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            padding: '0 3rem',
            opacity: i === idx ? 1 : 0,
            transform: i === idx ? 'translateX(0)' : i === prev ? 'translateX(-30px)' : 'translateX(30px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            pointerEvents: i === idx ? 'auto' : 'none',
          }}>

          {/* Left: text content */}
          <div style={{ flex: 1, zIndex: 2 }}>
            <span style={{
              display: 'inline-block',
              background: `${slide.accent}30`,
              border: `1px solid ${slide.accent}60`,
              color: slide.accent,
              fontSize: '0.65rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.18em',
              padding: '0.3rem 0.85rem', borderRadius: 50,
              marginBottom: '0.85rem',
            }}>{slide.eyebrow}</span>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              lineHeight: 1.05, color: '#fff',
              margin: '0 0 0.75rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {slide.title[0]}<br />
              <span style={{ color: slide.accent }}>{slide.title[1]}</span>
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.875rem',
              margin: '0 0 1.25rem',
              maxWidth: 280,
              lineHeight: 1.5,
            }}>{slide.sub}</p>

            <button
              className="slide-cta"
              onClick={() => onFilter(slide.category)}
              style={{
                background: slide.accent,
                border: 'none',
                color: '#fff',
                padding: '0.55rem 1.4rem',
                borderRadius: 50,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.04em',
                boxShadow: `0 4px 20px ${slide.accent}50`,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Shop {slide.title[0]} →
            </button>
          </div>

          {/* Right: product image */}
          <div style={{
            flexShrink: 0, width: 220, height: 220,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Glow ring behind image */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${slide.accent}30 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }} />
            <img
              src={slide.img}
              alt={slide.title.join(' ')}
              style={{
                width: '100%', height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))',
                transform: i === idx ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)',
                transition: 'transform 0.6s ease',
                position: 'relative', zIndex: 1,
              }}
              onError={e => {
                // Fallback: show styled letter if image fails
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback letter display */}
            <div style={{
              display: 'none', width: 140, height: 140,
              borderRadius: 24, background: `${slide.accent}20`,
              border: `2px solid ${slide.accent}40`,
              alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '3rem',
              fontWeight: 900, color: slide.accent,
              position: 'absolute',
            }}>
              {slide.title[0].charAt(0)}
            </div>
          </div>
        </div>
      ))}

      {/* Controls */}
      <div className="slide-controls" style={{
        position: 'absolute', bottom: '1rem', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <button className="slide-btn" onClick={() => go(-1)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>‹</button>

        <div className="slide-dots" style={{ display: 'flex', gap: 6 }}>
          {SLIDES.map((_, i) => (
            <span key={i} onClick={() => { setPrev(idx); setIdx(i); }}
              style={{
                width: i === idx ? 20 : 6, height: 6,
                borderRadius: 3, cursor: 'pointer',
                background: i === idx ? s.accent : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
              }} />
          ))}
        </div>

        <button className="slide-btn" onClick={() => go(1)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>›</button>
      </div>
    </div>
  );
}
