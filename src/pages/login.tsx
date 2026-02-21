import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useLoginWithGoogleMutation, useLoginWithEmailMutation, useRegisterWithEmailMutation } from "@/features/auth/api/authApi";
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
    const [showPass, setShowPass] = useState(false);

    const isLoading = isGoogleLoading || isEmailLoading || isRegisterLoading;

    useEffect(() => {
        if (isAuthenticated) router.push("/");
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
            setError(t("auth.fillAllFields")); return;
        }

        try {
            if (mode === "login") {
                await loginWithEmail({ email, password }).unwrap();
            } else {
                if (!displayName.trim()) { setError(t("auth.enterName")); return; }
                if (password.length < 6) { setError(t("auth.passwordMinLength")); return; }
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
        <div className="login-page">
            <div className="login-card">
                {/* Header */}
                <div className="login-card__header">
                    <div className="login-card__icon">
                        <i className="pi pi-bolt" />
                    </div>
                    <h1 className="login-card__title">{t("common.appName")}</h1>
                    <p className="login-card__subtitle">{t("auth.subtitle")}</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="login-error animate-shake">
                        <i className="pi pi-exclamation-circle" />
                        {error}
                    </div>
                )}

                {/* Google */}
                <button
                    className="login-btn-google"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    type="button"
                >
                    {isGoogleLoading
                        ? <><i className="pi pi-spin pi-spinner" /> {t("auth.connectingGoogle")}</>
                        : <><i className="pi pi-google" /> {t("auth.continueWithGoogle")}</>
                    }
                </button>

                {/* Divider */}
                <div className="login-divider">
                    <div className="login-divider__line" />
                    <span className="login-divider__text">{t("common.or")}</span>
                    <div className="login-divider__line" />
                </div>

                {/* Form */}
                <form onSubmit={handleEmailSubmit} className="login-form">
                    {mode === "register" && (
                        <div className="login-field">
                            <label className="login-label">{t("auth.nameLabel")}</label>
                            <input
                                className="login-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t("auth.namePlaceholder")}
                                type="text"
                            />
                        </div>
                    )}

                    <div className="login-field">
                        <label className="login-label">{t("auth.emailLabel")}</label>
                        <input
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("auth.emailPlaceholder")}
                            type="email"
                            autoComplete="email"
                        />
                    </div>

                    <div className="login-field">
                        <label className="login-label">{t("auth.passwordLabel")}</label>
                        <div style={{ position: "relative" }}>
                            <input
                                className="login-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                type={showPass ? "text" : "password"}
                                autoComplete={mode === "login" ? "current-password" : "new-password"}
                                style={{ paddingRight: "44px" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                style={{
                                    position: "absolute", right: "12px", top: "50%",
                                    transform: "translateY(-50%)", background: "none",
                                    border: "none", cursor: "pointer", color: "var(--muted)",
                                    padding: "4px",
                                }}
                            >
                                <i className={`pi ${showPass ? "pi-eye-slash" : "pi-eye"}`} style={{ fontSize: "14px" }} />
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-btn-primary"
                        disabled={isLoading}
                    >
                        {(isEmailLoading || isRegisterLoading)
                            ? <><i className="pi pi-spin pi-spinner" /> {t("auth.processing")}</>
                            : <><i className={`pi ${mode === "login" ? "pi-sign-in" : "pi-user-plus"}`} />
                                {mode === "login" ? t("auth.signIn") : t("auth.createAccount")}</>
                        }
                    </button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    <p>
                        {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
                        <button type="button" onClick={switchMode}>
                            {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
