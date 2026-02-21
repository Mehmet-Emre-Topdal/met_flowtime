import React, { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Avatar } from "primereact/avatar";
import { Menu } from "primereact/menu";
import { useAppSelector, useAppDispatch } from "@/hooks/storeHooks";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import { resetTimer } from "@/features/timer/slices/timerSlice";
import { resetTask } from "@/features/kanban/slices/taskSlice";
import { MenuItem } from "primereact/menuitem";
import SettingsModal from "@/components/settings/SettingsModal";
import { useTranslation } from "react-i18next";

import { baseApi } from "@/store/api/baseApi";

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const menuRef = useRef<Menu>(null);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
    const [logout] = useLogoutMutation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            dispatch(resetTimer());
            dispatch(resetTask());
            dispatch(baseApi.util.resetApiState());
            router.push("/login");
        } catch (error) {
            console.error(t("auth.logoutFailed"), error);
        }
    };

    const userMenuItems: MenuItem[] = [
        {
            label: t("nav.howTo"),
            icon: "pi pi-info-circle",
            command: () => router.push("/how-to")
        },
        {
            label: t("nav.settings"),
            icon: "pi pi-cog",
            command: () => setSettingsVisible(true)
        },
        {
            label: t("nav.logout"),
            icon: "pi pi-sign-out",
            command: handleLogout
        }
    ];

    if (isLoading || !isAuthenticated) {
        return null;
    }

    const navLinkClass = (path: string) =>
        `nav-link ${router.pathname === path ? "nav-link--active" : ""}`;

    return (
        <div className="layout-root">
            {/* Background Decorations */}
            <div className="layout-bg-blobs">
                <div className="layout-bg-blob layout-bg-blob--1" />
                <div className="layout-bg-blob layout-bg-blob--2" />
            </div>

            {/* Header */}
            <header className={`layout-header ${scrolled ? "layout-header--scrolled" : ""}`}>
                <div className="layout-header__inner">
                    {/* Logo */}
                    <Link href="/" className="layout-logo no-underline">
                        <div className="layout-logo__icon">
                            <i className="pi pi-bolt" />
                        </div>
                        <span className="layout-logo__text">{t("common.appName")}</span>
                    </Link>

                    {/* Nav */}
                    <nav className="layout-nav">
                        <Link href="/" className={navLinkClass("/")}>
                            <i className="pi pi-clock nav-link__icon" />
                            {t("timer.focusSession")}
                        </Link>
                        <Link href="/report" className={navLinkClass("/report")}>
                            <i className="pi pi-chart-bar nav-link__icon" />
                            {t("analytics.title")}
                        </Link>
                        <Link href="/how-to" className={navLinkClass("/how-to")}>
                            <i className="pi pi-info-circle nav-link__icon" />
                            {t("nav.howTo")}
                        </Link>
                    </nav>

                    {/* User */}
                    <div className="layout-header__actions">
                        <Menu model={userMenuItems} popup ref={menuRef} id="user_menu" />
                        <button
                            className="layout-avatar-btn"
                            onClick={(e) => menuRef.current?.toggle(e)}
                            aria-label="User menu"
                        >
                            <span className="layout-avatar-btn__name">
                                {user?.displayName?.split(" ")[0]}
                            </span>
                            <Avatar
                                image={user?.photoURL || undefined}
                                icon={!user?.photoURL ? "pi pi-user" : undefined}
                                shape="circle"
                                className="layout-avatar"
                            />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="layout-main">
                <div className="layout-container">
                    {children}
                </div>
            </main>

            <SettingsModal
                visible={settingsVisible}
                onHide={() => setSettingsVisible(false)}
            />
        </div>
    );
};

export default MainLayout;
