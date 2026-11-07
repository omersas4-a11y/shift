/** Sum monetary values in agorot so decimals do not accumulate floating-point errors. */
export const sumMoney = (values: number[]) => values.reduce((sum, value) => sum + Math.round(Number(value || 0) * 100), 0) / 100;
export const formatMoney = (value: number) => (Math.round(value * 100) / 100).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
