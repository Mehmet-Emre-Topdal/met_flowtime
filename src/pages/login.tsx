import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import {
    useLoginWithGoogleMutation,
    useLoginWithEmailMutation,
    useRegisterWithEmailMutation,
} from "@/features/auth/api/authApi";
import { useAppSelector } from "@/hooks/storeHooks";

type AuthMode = "login" | "register";

const LoginPage = () => {
    const router = useRouter();
    const [loginWithGoogle, { isLoading: isGoogleLoading }] = useLoginWithGoogleMutation();
    const [loginWithEmail, { isLoading: isEmailLoading }] = useLoginWithEmailMutation();
    const [registerWithEmail, { isLoading: isRegisterLoading }] = useRegisterWithEmailMutation();
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const isLoading = isGoogleLoading || isEmailLoading || isRegisterLoading;

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    const handleGoogleLogin = async () => {
        setError(null);
        try {
            await loginWithGoogle().unwrap();
        } catch (err: any) {
            setError(err?.error || "Google login failed.");
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !password.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        try {
            if (mode === "login") {
                await loginWithEmail({ email, password }).unwrap();
            } else {
                if (!displayName.trim()) {
                    setError("Please enter your name.");
                    return;
                }
                if (password.length < 6) {
                    setError("Password must be at least 6 characters.");
                    return;
                }
                await registerWithEmail({ email, password, displayName }).unwrap();
            }
        } catch (err: any) {
            setError(err?.error || "Authentication failed.");
        }
    };

    const switchMode = () => {
        setMode(mode === "login" ? "register" : "login");
        setError(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1a1c2c] to-[#2d2d2d] animate-fade-in px-4">
            <Card
                className="w-full max-w-md shadow-2xl border border-[#c5a059]/20 bg-[#1e293b]/90 backdrop-blur-sm animate-slide-up"
                pt={{
                    root: { className: 'rounded-2xl overflow-hidden' },
                    content: { className: 'p-8' }
                }}
            >
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 rounded-full bg-[#c5a059]/10 mb-4">
                        <i className="pi pi-bolt text-4xl text-[#c5a059]"></i>
                    </div>
                    <h1 className="text-3xl font-serif text-[#fffdd0] mb-2 tracking-tight">Flowtime & Kanban</h1>
                    <p className="text-[#c5a059]/70 font-medium tracking-wide text-sm uppercase">Deep Work Experience</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-shake">
                        <i className="pi pi-exclamation-circle mr-2 text-xs" />
                        {error}
                    </div>
                )}

                {/* Email/Password Form */}
                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 mb-6">
                    {mode === "register" && (
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-[#c5a059]/50 uppercase tracking-widest">Name</label>
                            <InputText
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                                className="bg-[#0f172a]/50 border border-[#c5a059]/15 text-[#fffdd0] rounded-xl px-4 py-3 focus:border-[#c5a059]/50"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#c5a059]/50 uppercase tracking-widest">Email</label>
                        <InputText
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            type="email"
                            className="bg-[#0f172a]/50 border border-[#c5a059]/15 text-[#fffdd0] rounded-xl px-4 py-3 focus:border-[#c5a059]/50"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#c5a059]/50 uppercase tracking-widest">Password</label>
                        <Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            feedback={mode === "register"}
                            toggleMask
                            className="auth-password-input"
                            inputClassName="bg-[#0f172a]/50 border border-[#c5a059]/15 text-[#fffdd0] rounded-xl px-4 py-3 w-full focus:border-[#c5a059]/50"
                        />
                    </div>

                    <Button
                        type="submit"
                        label={isLoading
                            ? "Processing..."
                            : mode === "login" ? "Sign In" : "Create Account"
                        }
                        icon={mode === "login" ? "pi pi-sign-in" : "pi pi-user-plus"}
                        loading={isEmailLoading || isRegisterLoading}
                        className="w-full py-3 bg-[#c5a059] text-[#0f172a] font-serif rounded-xl font-semibold hover:bg-[#b59049] transition-all duration-300"
                    />
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-[#c5a059]/10"></div>
                    <span className="text-[10px] text-[#c5a059]/30 uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-[#c5a059]/10"></div>
                </div>

                {/* Google Login */}
                <Button
                    label={isGoogleLoading ? "Connecting..." : "Continue with Google"}
                    icon="pi pi-google"
                    loading={isGoogleLoading}
                    onClick={handleGoogleLogin}
                    className="w-full py-3 bg-transparent border border-[#c5a059]/30 text-[#fffdd0] hover:bg-[#c5a059]/10 transition-all duration-300 rounded-xl font-semibold"
                />

                {/* Mode Switch */}
                <div className="mt-6 pt-4 border-t border-[#c5a059]/10 text-center">
                    <p className="text-xs text-[#c5a059]/40">
                        {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                        <button
                            type="button"
                            onClick={switchMode}
                            className="ml-2 text-[#c5a059] hover:text-[#fffdd0] transition-colors underline underline-offset-2"
                        >
                            {mode === "login" ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </div>
            </Card>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-fade-in {
                    animation: fade-in 1.2s ease-out forwards;
                }
                .animate-slide-up {
                    animation: slide-up 0.8s ease-out 0.3s both;
                }
                .animate-shake {
                    animation: shake 0.3s ease-out;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Playfair Display', serif;
                }
                .auth-password-input {
                    width: 100%;
                    display: block;
                }
                .auth-password-input .p-password {
                    width: 100%;
                }
                .auth-password-input .p-password-input {
                    width: 100%;
                }
                .auth-password-input .p-input-icon-right,
                .auth-password-input .p-password > span {
                    width: 100%;
                    display: flex;
                    align-items: center;
                }
                .auth-password-input .p-password-toggle-mask-icon,
                .auth-password-input .p-password .p-icon {
                    color: rgba(197, 160, 89, 0.4) !important;
                    position: absolute;
                    right: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;
