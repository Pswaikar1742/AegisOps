import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Floating Orb component ──────────────────── */
function Orb({ size, color, top, left, delay }) {
    return (
        <div
            className={`orb animate-float`}
            style={{
                width: size,
                height: size,
                background: color,
                top,
                left,
                animationDelay: delay || '0s',
                animationDuration: `${6 + Math.random() * 4}s`,
            }}
        />
    );
}

/* ── Particle Grid ───────────────────────────── */
function ParticleGrid() {
    const [particles] = useState(() =>
        Array.from({ length: 40 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 2 + Math.random() * 3,
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 4,
        }))
    );

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full animate-pulse"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        background: p.id % 3 === 0 ? '#09D8C7' : '#411E3A',
                        opacity: 0.4,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                    }}
                />
            ))}
        </div>
    );
}

/* ── Hexagon decorative element ──────────────── */
function HexGrid() {
    return (
        <svg
            className="absolute bottom-0 right-0 w-96 h-96 opacity-[0.06]"
            viewBox="0 0 400 400"
            fill="none"
        >
            {[...Array(6)].map((_, row) =>
                [...Array(6)].map((_, col) => {
                    const x = col * 65 + (row % 2 === 0 ? 0 : 32);
                    const y = row * 56;
                    return (
                        <polygon
                            key={`${row}-${col}`}
                            points={`${x + 30},${y} ${x + 60},${y + 17} ${x + 60},${y + 51} ${x + 30},${y + 68} ${x},${y + 51} ${x},${y + 17}`}
                            stroke="#09D8C7"
                            strokeWidth="1"
                            fill="none"
                        />
                    );
                })
            )}
        </svg>
    );
}

/* ── Stats counter ───────────────────────────── */
function AnimatedCounter({ end, label, suffix = '' }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const duration = 2000;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [end]);

    return (
        <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold font-mono text-aegis-accent text-glow">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-[0.25em] mt-1">{label}</div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════ */
export default function LandingPage() {
    const navigate = useNavigate();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setLoaded(true), 100);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="relative min-h-screen bg-aegis-bg grid-bg flex flex-col overflow-hidden">
            {/* ── Ambient orbs ── */}
            <Orb size="400px" color="#411E3A" top="-10%" left="-5%" delay="0s" />
            <Orb size="300px" color="#09D8C7" top="60%" left="75%" delay="2s" />
            <Orb size="200px" color="#411E3A" top="30%" left="50%" delay="4s" />

            <ParticleGrid />
            <HexGrid />

            {/* ── Top nav bar ── */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-aegis-accent/20 border border-aegis-accent/40 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-aegis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold tracking-widest text-gray-200 font-mono">
                        AEGIS<span className="text-aegis-accent">OPS</span>
                    </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-400">
                    <span className="flex items-center gap-2">
                        <span className="status-dot healthy"></span>
                        <span className="font-mono text-xs">SYSTEMS NOMINAL</span>
                    </span>
                </div>
            </nav>

            {/* ── Hero section ── */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div
                    className={`transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-aegis-accent/30 bg-aegis-accent/5 mb-8">
                        <span className="w-2 h-2 rounded-full bg-aegis-accent animate-pulse"></span>
                        <span className="text-xs text-aegis-accent font-mono tracking-widest">AI-POWERED DEFENSE SYSTEM v2.0</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-6">
                        <span className="block text-gray-100">NEXT-GEN</span>
                        <span className="block gradient-text">CYBER DEFENSE</span>
                        <span className="block text-gray-100">PLATFORM</span>
                    </h1>

                    {/* Subheading */}
                    <p className="max-w-2xl mx-auto text-gray-400 text-base md:text-lg mb-10 leading-relaxed">
                        Autonomous threat detection, real-time incident response, and intelligent
                        infrastructure orchestration — powered by multi-agent AI.
                    </p>

                    {/* CTA Button */}
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-glow group relative inline-flex items-center gap-3 px-8 py-4 bg-aegis-accent/10 border border-aegis-accent/50 rounded-xl text-aegis-accent font-bold font-mono text-sm tracking-[0.2em] uppercase cursor-pointer"
                        id="cta-initialize"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        INITIALIZE SYSTEM
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Stats row */}
                <div
                    className={`mt-20 grid grid-cols-3 gap-12 md:gap-20 transition-all duration-1000 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    <AnimatedCounter end={2847} label="Threats Blocked" suffix="+" />
                    <AnimatedCounter end={99} label="Uptime" suffix="%" />
                    <AnimatedCounter end={12} label="AI Agents" />
                </div>
            </main>

            {/* ── Bottom bar ── */}
            <footer className="relative z-10 flex items-center justify-center py-6 text-xs text-gray-600 font-mono tracking-widest">
                AEGISOPS DEFENSE NETWORK © 2026 — CLASSIFIED
            </footer>
        </div>
    );
}
