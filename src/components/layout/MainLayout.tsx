import React, { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Avatar } from "primereact/avatar";
import { Menu } from "primereact/menu";
import { useAppSelector } from "@/hooks/storeHooks";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import { MenuItem } from "primereact/menuitem";
import SettingsModal from "@/components/settings/SettingsModal";
import { useTranslation } from "react-i18next";

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const menuRef = useRef<Menu>(null);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
    const [logout] = useLogoutMutation();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            router.push("/login");
        } catch (error) {
            console.error(t("auth.logoutFailed"), error);
        }
    };

    const userMenuItems: MenuItem[] = [
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

    return (
        <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans">
            <header className="fixed top-0 left-0 right-0 h-14 bg-[#09090b]/80 backdrop-blur-md border-b border-[#27272a] z-50">
                <div className="container mx-auto h-full flex items-center justify-between px-6">
                    <Link href="/" className="no-underline">
                        <h1 className="text-lg font-semibold tracking-tight text-[#fafafa] hover:text-[#6366f1] transition-colors">
                            {t("common.appName")}
                        </h1>
                    </Link>

                    <nav className="flex items-center gap-1">
                        <Link
                            href="/"
                            className={`text-xs px-3 py-1.5 rounded-md no-underline transition-colors ${router.pathname === '/'
                                    ? 'text-[#fafafa] bg-[#27272a]'
                                    : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#18181b]'
                                }`}
                        >
                            {t("timer.focusSession")}
                        </Link>
                        <Link
                            href="/report"
                            className={`text-xs px-3 py-1.5 rounded-md no-underline transition-colors ${router.pathname === '/report'
                                    ? 'text-[#fafafa] bg-[#27272a]'
                                    : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#18181b]'
                                }`}
                        >
                            {t("analytics.title")}
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Menu model={userMenuItems} popup ref={menuRef} id="user_menu" className="bg-[#18181b] border-[#27272a] text-[#fafafa]" />
                        <div
                            className="flex items-center gap-2.5 cursor-pointer group px-2 py-1.5 rounded-lg hover:bg-[#18181b] transition-colors"
                            onClick={(e) => menuRef.current?.toggle(e)}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-[#a1a1aa] group-hover:text-[#fafafa] transition-colors leading-none">{user?.displayName?.split(' ')[0]}</p>
                            </div>
                            <Avatar
                                image={user?.photoURL || undefined}
                                icon={!user?.photoURL ? "pi pi-user" : undefined}
                                shape="circle"
                                className="border border-[#27272a] group-hover:border-[#3f3f46] transition-all w-8 h-8"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-20 pb-12">
                <div className="container mx-auto px-6 max-w-6xl">
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
