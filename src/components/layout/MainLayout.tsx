import React, { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Avatar } from "primereact/avatar";
import { Menu } from "primereact/menu";
import { useAppSelector } from "@/hooks/storeHooks";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import { MenuItem } from "primereact/menuitem";
import SettingsModal from "@/components/settings/SettingsModal";

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
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
            console.error("Logout failed:", error);
        }
    };

    const userMenuItems: MenuItem[] = [
        {
            label: "Settings",
            icon: "pi pi-cog",
            command: () => setSettingsVisible(true)
        },
        {
            label: "Logout",
            icon: "pi pi-sign-out",
            command: handleLogout
        }
    ];

    if (isLoading || !isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-[#fffdd0] font-sans">
            <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f172a]/80 backdrop-blur-md border-b border-[#d4af3720] z-50">
                <div className="container mx-auto h-full flex items-center justify-between px-6">
                    <Link href="/" className="no-underline">
                        <h1 className="font-serif text-2xl tracking-widest text-[#d4af37] hover:opacity-80 transition-opacity">
                            FLOWTIME
                        </h1>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Menu model={userMenuItems} popup ref={menuRef} id="user_menu" className="bg-[#1e293b] border-[#d4af3720] text-[#fffdd0]" />
                        <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={(e) => menuRef.current?.toggle(e)}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-[#c5a059]/50 uppercase tracking-[0.2em] italic font-serif leading-none">Researcher</p>
                                <p className="text-sm font-medium text-[#fffdd0]/80 group-hover:text-[#d4af37] transition-colors">{user?.displayName?.split(' ')[0]}</p>
                            </div>
                            <Avatar
                                image={user?.photoURL || undefined}
                                icon={!user?.photoURL ? "pi pi-user" : undefined}
                                shape="circle"
                                className="border border-[#d4af3730] group-hover:border-[#d4af37] transition-all w-9 h-9"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-12">
                <div className="container mx-auto px-6 max-w-6xl">
                    {children}
                </div>
            </main>

            <SettingsModal
                visible={settingsVisible}
                onHide={() => setSettingsVisible(false)}
            />

            <style jsx global>{`
                .p-menu {
                    background: #1e293b !important;
                    border: 1px solid rgba(212, 175, 55, 0.2) !important;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
                }
                .p-menu .p-menuitem-link {
                    padding: 0.75rem 1rem !important;
                }
                .p-menu .p-menuitem-link .p-menuitem-text {
                    color: rgba(255, 253, 208, 0.8) !important;
                    font-size: 0.875rem !important;
                    font-family: var(--font-serif) !important;
                }
                .p-menu .p-menuitem-link .p-menuitem-icon {
                    color: #c5a059 !important;
                    margin-right: 0.75rem !important;
                }
                .p-menu .p-menuitem-link:not(.p-disabled):hover {
                    background: rgba(197, 160, 89, 0.1) !important;
                }
                .p-menu .p-menuitem-link:not(.p-disabled):hover .p-menuitem-text {
                    color: #fffdd0 !important;
                }
            `}</style>
        </div>
    );
};

export default MainLayout;
