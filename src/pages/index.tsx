import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import FlowtimeTimer from "@/features/timer/FlowtimeTimer";
import KanbanBoard from "@/features/kanban/KanbanBoard";
import TaskListView from "@/features/kanban/TaskListView";

import { SelectButton } from "primereact/selectbutton";
import { useAppSelector } from "@/hooks/storeHooks";
import StickyNotes from "@/components/notes/StickyNotes";

export default function Home() {
  const { user } = useAppSelector((state) => state.auth);
  const [view, setView] = useState<"list" | "kanban">("list");

  const viewOptions = [
    { label: 'List', value: 'list', icon: 'pi pi-list' },
    { label: 'Board', value: 'kanban', icon: 'pi pi-th-large' }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col items-center gap-10 animate-fade-in max-w-6xl mx-auto py-8 overflow-x-hidden">

        <section className="w-full flex justify-center py-8 bg-[#18181b] rounded-2xl border border-[#27272a]">
          <FlowtimeTimer />
        </section>



        <div className="w-full flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-px w-full bg-[#27272a]"></div>
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
          </div>

          <main className="w-full min-h-[400px]">
            {view === "list" ? (
              <div className="animate-fade-in">
                <TaskListView />
              </div>
            ) : (
              <div className="animate-fade-in">
                <KanbanBoard />
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
