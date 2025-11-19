import React, { useState } from 'react';
import { useLogin, useRegister } from '../../api/auth/auth.hooks';

// Optional: Hier würdest du deine useMutation-Hooks importieren
// import { useLogin, useRegister } from './auth-hooks';

function LogAndReg() {
    // 1. State für den Modus (entweder 'login' oder 'register')
    const [mode, setMode] = useState<'login' | 'register'>('login');

    // 2. State für die Formularfelder
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');


    const loginMutation = useLogin();
    const registerMutation = useRegister();


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // Verhindert den Standard-Formular-Submit

        if (mode === 'login') {
            console.log('Anmelde-Daten:', { email, password });
            loginMutation.mutate({ email, password });
        } else {
            console.log('Registrierungs-Daten:', { username, email, password });
            registerMutation.mutate({ username, email, password });
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
    };

    const isLogin = mode === 'login';

    return (
        <div className="flex  items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg">
                <h2 className="mb-6 text-center text-3xl font-bold">
                    {isLogin ? 'Anmelden' : 'Registrieren'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Benutzername-Feld (nur im Registrierungsmodus) */}
                    {!isLogin && (
                        <div>
                            <label
                                htmlFor="username"
                                className="mb-2 block text-sm font-medium text-gray-300"
                            >
                                Benutzername
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Dein Benutzername"
                            />
                        </div>
                    )}

                    {/* E-Mail-Feld */}
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-gray-300"
                        >
                            E-Mail
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="name@beispiel.de"
                        />
                    </div>

                    {/* Passwort-Feld */}
                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-gray-300"
                        >
                            Passwort
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Submit-Button */}
                    <div>
                        <button
                            type="submit"
                            // Optional: Deaktivieren, während die Mutation läuft
                            // disabled={loginMutation.isPending || registerMutation.isPending}
                            className="w-full rounded-lg bg-blue-600 px-5 py-3 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-800 disabled:opacity-50"
                        >
                            {isLogin ? 'Anmelden' : 'Konto erstellen'}
                        </button>
                    </div>
                </form>

                {/* Toggle-Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={toggleMode}
                        className="text-sm text-blue-400 hover:underline"
                    >
                        {isLogin
                            ? 'Noch kein Konto? Registrieren'
                            : 'Schon ein Konto? Anmelden'}
                    </button>
                </div>

                {/* Optional: Platz für Social Logins */}
                <div className="my-6 border-t border-gray-600"></div>
                <div className="space-y-4">
                    <button className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-center font-medium hover:bg-gray-600">
                        Mit Google anmelden
                    </button>
                    <button className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-center font-medium hover:bg-gray-600">
                        Mit Apple anmelden
                    </button>
                </div>

            </div>
        </div>
    );
}

export default LogAndReg;