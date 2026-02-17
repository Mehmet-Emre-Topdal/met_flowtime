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
            label: "Log out",
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
                            flowtime
                        </h1>
                    </Link>

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

            <style jsx global>{`
                .p-menu {
                    background: #18181b !important;
                    border: 1px solid #27272a !important;
                    border-radius: 8px !important;
                    box-shadow: none !important;
                }
                .p-menu .p-menuitem-link {
                    padding: 0.6rem 1rem !important;
                }
                .p-menu .p-menuitem-link .p-menuitem-text {
                    color: #a1a1aa !important;
                    font-size: 0.8125rem !important;
                    font-family: "Inter", sans-serif !important;
                }
                .p-menu .p-menuitem-link .p-menuitem-icon {
                    color: #71717a !important;
                    margin-right: 0.5rem !important;
                }
                .p-menu .p-menuitem-link:not(.p-disabled):hover {
                    background: #27272a !important;
                }
                .p-menu .p-menuitem-link:not(.p-disabled):hover .p-menuitem-text {
                    color: #fafafa !important;
                }
                .p-menu .p-menuitem-link:not(.p-disabled):hover .p-menuitem-icon {
                    color: #6366f1 !important;
                }
            `}</style>
        </div>
    );
};

export default MainLayout;
