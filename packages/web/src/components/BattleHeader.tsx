import Image from 'next/image';

export const BattleHeader = () => {
    return (
        <div className="relative w-full overflow-visible">
            <div className="relative z-10 w-full pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-8">
                <div className="relative w-full aspect-[1536/1024]">
                    <Image
                        src="/images/piratas-vs-fantasmas.webp"
                        alt="Piratas del Caribe vs Fantasmas del Caribe"
                        fill
                        priority
                        sizes="(max-width: 448px) 100vw, 448px"
                        className="object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.68)]"
                        unoptimized
                    />
                </div>
            </div>
        </div>
    );
};
