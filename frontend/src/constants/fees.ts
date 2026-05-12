export const FEE_TABLE = [
  { max: 30000,        fee: 500,  label: '〜30,000円',  feeLabel: '500円'   },
  { max: 80000,        fee: 1500, label: '〜80,000円',  feeLabel: '1,500円' },
  { max: 150000,       fee: 3000, label: '〜150,000円', feeLabel: '3,000円' },
  { max: 300000,       fee: 5000, label: '〜300,000円', feeLabel: '5,000円' },
  { max: Infinity,     fee: 8000, label: '300,001円〜', feeLabel: '8,000円' },
] as const;
