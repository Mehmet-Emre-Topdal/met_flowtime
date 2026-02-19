import MainLayout from "@/components/layout/MainLayout";
import FlowtimeTimer from "@/features/timer/FlowtimeTimer";

const FlowtimePage = () => {
    return (
        <MainLayout>
            <div className="flex flex-col items-center animate-fade-in">
                <FlowtimeTimer />
            </div>

        </MainLayout>
    );
};

export default FlowtimePage;
