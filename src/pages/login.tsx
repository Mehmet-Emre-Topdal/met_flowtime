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
        <div className="min-h-screen flex items-center justify-center bg-[#242424] animate-fade-in px-4">
            <Card
                className="w-full max-w-md border border-[#3D3D3D] bg-[#2E2E2E] animate-slide-up"
                pt={{
                    root: { className: 'rounded-xl overflow-hidden' },
                    content: { className: 'p-8' }
                }}
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#4F8EF7]/10 mb-4">
                        <i className="pi pi-bolt text-2xl text-[#4F8EF7]"></i>
                    </div>
                    <h1 className="text-2xl font-serif font-semibold text-[#F0F0F0] mb-1.5 tracking-tight">{t("common.appName")}</h1>
                    <p className="text-[#757575] text-sm">{t("auth.subtitle")}</p>
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
                            <label className="text-xs text-[#757575] font-medium">{t("auth.nameLabel")}</label>
                            <InputText
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t("auth.namePlaceholder")}
                                className="bg-[#242424] border border-[#3D3D3D] text-[#F0F0F0] rounded-lg px-4 py-3 focus:border-[#34C774]"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#757575] font-medium">{t("auth.emailLabel")}</label>
                        <InputText
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("auth.emailPlaceholder")}
                            type="email"
                            className="bg-[#242424] border border-[#3D3D3D] text-[#F0F0F0] rounded-lg px-4 py-3 focus:border-[#34C774]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#757575] font-medium">{t("auth.passwordLabel")}</label>
                        <Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            feedback={false}
                            toggleMask
                            className="auth-password-input"
                            inputClassName="bg-[#242424] border border-[#3D3D3D] text-[#F0F0F0] rounded-lg px-4 py-3 w-full focus:border-[#34C774]"
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
                        className="w-full py-3 bg-[#4F8EF7] border-none text-white rounded-lg font-medium hover:bg-[#3D77E0] transition-colors"
                    />
                </form>

                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-[#3D3D3D]"></div>
                    <span className="text-[10px] text-[#757575] uppercase tracking-widest">{t("common.or")}</span>
                    <div className="flex-1 h-px bg-[#3D3D3D]"></div>
                </div>

                <Button
                    label={isGoogleLoading ? t("auth.connectingGoogle") : t("auth.continueWithGoogle")}
                    icon="pi pi-google"
                    loading={isGoogleLoading}
                    onClick={handleGoogleLogin}
                    className="w-full py-3 bg-transparent border border-[#3D3D3D] text-[#9A9A9A] hover:bg-[#3D3D3D] hover:text-[#F0F0F0] transition-all rounded-lg font-medium"
                />

                <div className="mt-6 pt-4 border-t border-[#3D3D3D] text-center">
                    <p className="text-xs text-[#757575]">
                        {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
                        <button
                            type="button"
                            onClick={switchMode}
                            className="ml-2 text-[#4F8EF7] hover:text-[#34C774] transition-colors font-medium"
                        >
                            {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
                        </button>
                    </p>
                </div>
            </Card>

        </div>
    );
};

export default LoginPage;
