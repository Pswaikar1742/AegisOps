import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ══════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════ */
export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [statusLines, setStatusLines] = useState([]);

    useEffect(() => {
        const t = setTimeout(() => setLoaded(true), 100);
        return () => clearTimeout(t);
    }, []);

    // Simulated boot sequence in terminal
    useEffect(() => {
        const lines = [
            { text: '> Establishing secure channel...', delay: 300 },
            { text: '> TLS 1.3 handshake complete', delay: 800 },
            { text: '> Verifying node identity...', delay: 1300 },
            { text: '> Neural firewall active', delay: 1800 },
            { text: '> System Status: ONLINE', delay: 2300, accent: true },
        ];

        const timers = lines.map((line) =>
            setTimeout(() => {
                setStatusLines((prev) => [...prev, line]);
            }, line.delay)
        );

        return () => timers.forEach(clearTimeout);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate authentication
        setTimeout(() => {
            navigate('/dashboard');
        }, 1500);
    };

    return (
        <div className="relative min-h-screen bg-aegis-bg grid-bg flex items-center justify-center overflow-hidden">
            {/* ── Ambient background ── */}
            <div
                className="orb animate-float"
                style={{ width: 350, height: 350, background: '#411E3A', top: '10%', left: '10%' }}
            />
            <div
                className="orb animate-float-delay"
                style={{ width: 250, height: 250, background: '#09D8C7', top: '60%', left: '80%', animationDelay: '3s' }}
            />

            {/* ── Back navigation ── */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-500 hover:text-aegis-accent transition-colors text-sm font-mono cursor-pointer"
                id="btn-back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                BACK
            </button>

            {/* ── Login Card ── */}
            <div
                className={`relative z-10 w-full max-w-md mx-4 transition-all duration-700 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            >
                <div className="glass-panel-solid rounded-2xl border-glow p-8 md:p-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-aegis-accent/10 border border-aegis-accent/30 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-aegis-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-100 tracking-wide">SECURE ACCESS</h2>
                        <p className="text-sm text-gray-500 mt-1 font-mono">Authentication required to proceed</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username */}
                        <div>
                            <label
                                htmlFor="input-username"
                                className="block text-xs text-gray-500 uppercase tracking-[0.2em] mb-2 font-mono"
                            >
                                Operator ID
                            </label>
                            <input
                                id="input-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your operator ID"
                                className="w-full bg-aegis-bg/80 text-gray-200 px-4 py-3 rounded-lg input-underline font-mono text-sm placeholder-gray-600 border-0 outline-none"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="input-password"
                                className="block text-xs text-gray-500 uppercase tracking-[0.2em] mb-2 font-mono"
                            >
                                Access Key
                            </label>
                            <input
                                id="input-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your access key"
                                className="w-full bg-aegis-bg/80 text-gray-200 px-4 py-3 rounded-lg input-underline font-mono text-sm placeholder-gray-600 border-0 outline-none"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-glow w-full py-3.5 bg-aegis-accent/15 border border-aegis-accent/50 rounded-xl text-aegis-accent font-bold font-mono text-sm tracking-[0.2em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            id="btn-authenticate"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    AUTHENTICATING...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                    ACCESS TERMINAL
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 border-t border-gray-700/50" />

                    {/* Terminal status log */}
                    <div className="bg-aegis-bg/60 rounded-lg p-4 font-mono text-xs space-y-1.5 max-h-36 overflow-y-auto">
                        {statusLines.map((line, i) => (
                            <div
                                key={i}
                                className={`animate-fade-in ${line.accent ? 'text-aegis-accent text-glow' : 'text-gray-500'}`}
                            >
                                {line.text}
                            </div>
                        ))}
                        {statusLines.length > 0 && (
                            <span className="typewriter-cursor text-aegis-accent" />
                        )}
                    </div>
                </div>

                {/* Security notice */}
                <div className="text-center mt-6 text-xs text-gray-600 font-mono flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    256-BIT ENCRYPTED CONNECTION
                </div>
            </div>
        </div>
    );
}
