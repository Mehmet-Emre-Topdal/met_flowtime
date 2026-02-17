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
import { useTranslation } from "react-i18next";

type AuthMode = "login" | "register";

const LoginPage = () => {
    const { t } = useTranslation();
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
            setError(err?.error || t("auth.googleFailed"));
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !password.trim()) {
            setError(t("auth.fillAllFields"));
            return;
        }

        try {
            if (mode === "login") {
                await loginWithEmail({ email, password }).unwrap();
            } else {
                if (!displayName.trim()) {
                    setError(t("auth.enterName"));
                    return;
                }
                if (password.length < 6) {
                    setError(t("auth.passwordMinLength"));
                    return;
                }
                await registerWithEmail({ email, password, displayName }).unwrap();
            }
        } catch (err: any) {
            setError(err?.error || t("auth.authFailed"));
        }
    };

    const switchMode = () => {
        setMode(mode === "login" ? "register" : "login");
        setError(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] animate-fade-in px-4">
            <Card
                className="w-full max-w-md border border-[#27272a] bg-[#18181b] animate-slide-up"
                pt={{
                    root: { className: 'rounded-xl overflow-hidden' },
                    content: { className: 'p-8' }
                }}
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#6366f1]/10 mb-4">
                        <i className="pi pi-bolt text-2xl text-[#6366f1]"></i>
                    </div>
                    <h1 className="text-2xl font-semibold text-[#fafafa] mb-1.5 tracking-tight">{t("common.appName")}</h1>
                    <p className="text-[#71717a] text-sm">{t("auth.subtitle")}</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-shake">
                        <i className="pi pi-exclamation-circle mr-2 text-xs" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 mb-6">
                    {mode === "register" && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[#71717a] font-medium">{t("auth.nameLabel")}</label>
                            <InputText
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t("auth.namePlaceholder")}
                                className="bg-[#09090b] border border-[#27272a] text-[#fafafa] rounded-lg px-4 py-3 focus:border-[#6366f1]"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#71717a] font-medium">{t("auth.emailLabel")}</label>
                        <InputText
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("auth.emailPlaceholder")}
                            type="email"
                            className="bg-[#09090b] border border-[#27272a] text-[#fafafa] rounded-lg px-4 py-3 focus:border-[#6366f1]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#71717a] font-medium">{t("auth.passwordLabel")}</label>
                        <Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            feedback={false}
                            toggleMask
                            className="auth-password-input"
                            inputClassName="bg-[#09090b] border border-[#27272a] text-[#fafafa] rounded-lg px-4 py-3 w-full focus:border-[#6366f1]"
                        />
                    </div>

                    <Button
                        type="submit"
                        label={isLoading
                            ? t("auth.processing")
                            : mode === "login" ? t("auth.signIn") : t("auth.createAccount")
                        }
                        icon={mode === "login" ? "pi pi-sign-in" : "pi pi-user-plus"}
                        loading={isEmailLoading || isRegisterLoading}
                        className="w-full py-3 bg-[#6366f1] border-none text-white rounded-lg font-medium hover:bg-[#4f46e5] transition-colors"
                    />
                </form>

                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-[#27272a]"></div>
                    <span className="text-[10px] text-[#71717a] uppercase tracking-widest">{t("common.or")}</span>
                    <div className="flex-1 h-px bg-[#27272a]"></div>
                </div>

                <Button
                    label={isGoogleLoading ? t("auth.connectingGoogle") : t("auth.continueWithGoogle")}
                    icon="pi pi-google"
                    loading={isGoogleLoading}
                    onClick={handleGoogleLogin}
                    className="w-full py-3 bg-transparent border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa] transition-all rounded-lg font-medium"
                />

                <div className="mt-6 pt-4 border-t border-[#27272a] text-center">
                    <p className="text-xs text-[#71717a]">
                        {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
                        <button
                            type="button"
                            onClick={switchMode}
                            className="ml-2 text-[#6366f1] hover:text-[#818cf8] transition-colors font-medium"
                        >
                            {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
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
                    from { transform: translateY(12px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-out forwards;
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out 0.1s both;
                }
                .animate-shake {
                    animation: shake 0.3s ease-out;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', system-ui, sans-serif;
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
                    color: #71717a !important;
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
