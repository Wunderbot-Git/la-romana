'use client';

interface NumericKeypadProps {
    holeNumber: number;
    onNumberPress: (num: number) => void;
    onClose: () => void;
}

export function NumericKeypad({ holeNumber, onNumberPress, onClose }: NumericKeypadProps) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-forest-deep border-t-2 border-gold-border/50 shadow-lg max-w-md mx-auto z-50">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gold-border/20">
                <span className="text-sm font-bangers text-gold-light">HOYO {holeNumber}</span>
                <button
                    onClick={onClose}
                    className="text-cream/50 hover:text-cream px-3 py-1 font-fredoka"
                >
                    Cerrar
                </button>
            </div>

            {/* Number buttons */}
            <div className="grid grid-cols-5 gap-2 p-4">
                {numbers.map((num) => (
                    <button
                        key={num}
                        onClick={() => onNumberPress(num)}
                        className="aspect-square flex items-center justify-center bg-forest-mid rounded-lg text-2xl font-bangers text-cream active:bg-gold-border/30 hover:bg-forest-mid/80 transition-colors border border-gold-border/20"
                    >
                        {num}
                    </button>
                ))}
            </div>
        </div>
    );
}
