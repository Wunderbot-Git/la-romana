/**
 * Currency formatter — La Romana 2026 uses USD.
 * Whole-dollar amounts when integer; cents shown otherwise.
 */
export const formatCurrency = (amount: number): string => {
    if (!isFinite(amount)) return '—';
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    if (Math.abs(abs - Math.round(abs)) < 0.005) {
        return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
    }
    return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
