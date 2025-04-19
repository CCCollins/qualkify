export const round = (value: number, digits: number) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};
  
export const safe = (n: number, digits = 2) => {
    if (isNaN(n) || !isFinite(n)) return '0,00';
    return round(n, digits).toFixed(digits).replace('.', ',');
};

export const parse = (val: string): number => {
    try {
        const sanitized = val
        .replace(/,/g, '.')
        .replace(/[^-()\d/*+.]/g, '');
        const result = Function('"use strict"; return (' + sanitized + ')')();
        return typeof result === 'number' && !isNaN(result) ? result : 0;
    } catch {
        return 0;
    }
};

export const input = (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input {...props} className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-200 text-sm transition" />;
