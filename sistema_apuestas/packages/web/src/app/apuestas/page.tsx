import ApuestasClient from './ApuestasClient';

export default function ApuestasPage() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
            <header className="bg-[#0f172a] text-white p-4">
                <h1 className="text-xl font-bold">Apuestas</h1>
            </header>
            <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto relative content-area">
                <ApuestasClient />
            </div>
        </div>
    );
}
