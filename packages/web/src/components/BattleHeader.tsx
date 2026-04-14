import Image from 'next/image';

export const BattleHeader = () => {
    return (
        <div className="relative w-full overflow-visible">
            <div className="relative w-full pt-4 pb-4 z-10">
                {/* Complete Title Graphic (Logo + Characters) */}
                <div className="relative w-full aspect-[800/264]">
                    <Image
                        src="/images/Gemini_Generated_Image_6e37hu6e37hu6e37_1.webp"
                        alt="Pitufos vs Cariñositos"
                        fill
                        className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
                        unoptimized
                    />
                </div>
            </div>
        </div>
    );
};

