import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import FlowtimeTimer from "@/features/timer/FlowtimeTimer";
import KanbanBoard from "@/features/kanban/KanbanBoard";
import TaskListView from "@/features/kanban/TaskListView";
import TaskQuickAdd from "@/features/kanban/TaskQuickAdd";
import { SelectButton } from "primereact/selectbutton";
import { useAppSelector } from "@/hooks/storeHooks";
import StickyNotes from "@/components/notes/StickyNotes";

export default function Home() {
  const { user } = useAppSelector((state) => state.auth);
  const [view, setView] = useState<"list" | "kanban">("list");

  const viewOptions = [
    { label: 'Classic List', value: 'list', icon: 'pi pi-list' },
    { label: 'Kanban Board', value: 'kanban', icon: 'pi pi-th-large' }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col items-center gap-12 animate-fade-in max-w-6xl mx-auto py-10 overflow-x-hidden">


        <section className="w-full flex justify-center py-10 bg-[#1e293b]/20 rounded-[3rem] border border-[#c5a059]/10 backdrop-blur-md shadow-2xl shadow-black/20">
          <FlowtimeTimer />
        </section>

        <TaskQuickAdd />

        <div className="w-full flex flex-col gap-8">
          <div className="flex flex-col items-center gap-6">
            <div className="h-px w-full bg-[#c5a059]/5"></div>
            <SelectButton
              value={view}
              onChange={(e) => e.value && setView(e.value)}
              options={viewOptions}
              itemTemplate={(option) => (
                <div className="flex items-center gap-2 px-6 py-1">
                  <i className={option.icon}></i>
                  <span className="font-serif text-sm tracking-wide">{option.label}</span>
                </div>
              )}
              className="custom-switcher"
            />
          </div>

          <main className="w-full min-h-[400px]">
            {view === "list" ? (
              <div className="animate-slide-up">
                <TaskListView />
              </div>
            ) : (
              <div className="animate-slide-up">
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
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 1.5s ease-out forwards;
        }
        .animate-slide-up {
            animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes dropdown-in {
            from { opacity: 0; transform: translateY(-4px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-dropdown-in {
            animation: dropdown-in 0.15s ease-out forwards;
        }
        
        .custom-switcher.p-selectbutton {
            background: rgba(15, 23, 42, 0.6) !important;
            padding: 4px !important;
            border-radius: 12px !important;
            border: 1px solid rgba(197, 160, 89, 0.2) !important;
        }
        .custom-switcher .p-button {
            background: transparent !important;
            border: none !important;
            color: rgba(197, 160, 89, 0.5) !important;
            transition: all 0.4s ease !important;
            border-radius: 8px !important;
        }
        .custom-switcher .p-button.p-highlight {
            background: #c5a059 !important;
            color: #0f172a !important;
            box-shadow: 0 4px 12px rgba(197, 160, 89, 0.2) !important;
        }
        .custom-switcher .p-button:not(.p-highlight):hover {
            color: #c5a059 !important;
            background: rgba(197, 160, 89, 0.05) !important;
        }
      `}</style>

      <StickyNotes />
    </MainLayout>
  );
}
