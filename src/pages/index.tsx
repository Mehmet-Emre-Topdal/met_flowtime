import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import FlowtimeTimer from "@/features/timer/FlowtimeTimer";
import KanbanBoard from "@/features/kanban/KanbanBoard";
import TaskListView from "@/features/kanban/TaskListView";
import TaskQuickAdd from "@/features/kanban/TaskQuickAdd";
import { SelectButton } from "primereact/selectbutton";
import { useAppSelector } from "@/hooks/storeHooks";
import StickyNotes from "@/components/notes/StickyNotes";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [filterDaily, setFilterDaily] = useState(false);

  const viewOptions = [
    { label: t("views.list"), value: 'list', icon: 'pi pi-list' },
    { label: t("views.board"), value: 'kanban', icon: 'pi pi-th-large' }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col items-center gap-10 animate-fade-in max-w-6xl mx-auto py-8 overflow-x-hidden">

        <section className="w-full flex justify-center py-8 bg-[#18181b] rounded-2xl border border-[#27272a]">
          <FlowtimeTimer />
        </section>

        <div className="w-full flex flex-col gap-8">


          <div className="flex flex-col items-center gap-4">
            <div className="h-px w-full bg-[#27272a]"></div>
            <div className="flex items-center gap-3">
              <SelectButton
                value={view}
                onChange={(e) => e.value && setView(e.value)}
                options={viewOptions}
                itemTemplate={(option) => (
                  <div className="flex items-center gap-2 px-5 py-1">
                    <i className={option.icon}></i>
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                )}
                className="custom-switcher"
              />
              <button
                onClick={() => setFilterDaily(!filterDaily)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all duration-200
                  ${filterDaily
                    ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1]'
                    : 'bg-[#18181b] border-[#27272a] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa]'
                  }`}
              >
                <i className="pi pi-replay text-[10px]" />
                <span>{t("views.daily")}</span>
              </button>
            </div>
          </div>

          <main className="w-full min-h-[400px]">
            {view === "list" ? (
              <div className="animate-fade-in">
                <TaskListView filterDaily={filterDaily} />
              </div>
            ) : (
              <div className="animate-fade-in">
                <KanbanBoard filterDaily={filterDaily} />
              </div>
            )}
          </main>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.4s ease-out forwards;
        }
        .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
        }
        @keyframes dropdown-in {
            from { opacity: 0; transform: translateY(-4px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-dropdown-in {
            animation: dropdown-in 0.12s ease-out forwards;
        }
        
        .custom-switcher.p-selectbutton {
            background: #18181b !important;
            padding: 3px !important;
            border-radius: 8px !important;
            border: 1px solid #27272a !important;
        }
        .custom-switcher .p-button {
            background: transparent !important;
            border: none !important;
            color: #71717a !important;
            transition: all 0.2s ease !important;
            border-radius: 6px !important;
        }
        .custom-switcher .p-button.p-highlight {
            background: #27272a !important;
            color: #fafafa !important;
            box-shadow: none !important;
        }
        .custom-switcher .p-button:not(.p-highlight):hover {
            color: #a1a1aa !important;
            background: transparent !important;
        }
      `}</style>

      <StickyNotes />
    </MainLayout>
  );
}
