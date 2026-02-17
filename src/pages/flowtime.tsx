import MainLayout from "@/components/layout/MainLayout";
import FlowtimeTimer from "@/features/timer/FlowtimeTimer";

const FlowtimePage = () => {
    return (
        <MainLayout>
            <div className="flex flex-col items-center animate-fade-in">
                <FlowtimeTimer />
            </div>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 1.2s ease-out forwards;
                }
            `}</style>
        </MainLayout>
    );
};

export default FlowtimePage;
