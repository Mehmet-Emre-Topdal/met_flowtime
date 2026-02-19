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
        <div className="min-h-screen bg-[#242424] text-[#F0F0F0] font-sans">
            <header className="fixed top-0 left-0 right-0 h-14 bg-[#242424]/80 backdrop-blur-md border-b border-[#3D3D3D] z-50">
                <div className="container mx-auto h-full flex items-center justify-between px-6">
                    <Link href="/" className="no-underline">
                        <h1 className="text-lg font-serif font-semibold tracking-tight text-[#F0F0F0] hover:text-[#4F8EF7] transition-colors">
                            {t("common.appName")}
                        </h1>
                    </Link>

                    <nav className="flex items-center gap-1">
                        <Link
                            href="/"
                            className={`text-xs px-3 py-1.5 rounded-md no-underline transition-colors ${router.pathname === '/'
                                ? 'text-[#F0F0F0] bg-[#3D3D3D]'
                                : 'text-[#757575] hover:text-[#9A9A9A] hover:bg-[#2E2E2E]'
                                }`}
                        >
                            {t("timer.focusSession")}
                        </Link>
                        <Link
                            href="/report"
                            className={`text-xs px-3 py-1.5 rounded-md no-underline transition-colors ${router.pathname === '/report'
                                ? 'text-[#F0F0F0] bg-[#3D3D3D]'
                                : 'text-[#757575] hover:text-[#9A9A9A] hover:bg-[#2E2E2E]'
                                }`}
                        >
                            {t("analytics.title")}
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Menu model={userMenuItems} popup ref={menuRef} id="user_menu" className="bg-[#2E2E2E] border-[#3D3D3D] text-[#F0F0F0]" />
                        <div
                            className="flex items-center gap-2.5 cursor-pointer group px-2 py-1.5 rounded-lg hover:bg-[#2E2E2E] transition-colors"
                            onClick={(e) => menuRef.current?.toggle(e)}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-[#9A9A9A] group-hover:text-[#F0F0F0] transition-colors leading-none">{user?.displayName?.split(' ')[0]}</p>
                            </div>
                            <Avatar
                                image={user?.photoURL || undefined}
                                icon={!user?.photoURL ? "pi pi-user" : undefined}
                                shape="circle"
                                className="border border-[#3D3D3D] group-hover:border-[#353535] transition-all w-8 h-8"
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
