import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from '../../StoreContext';

export default function DashboardView({ onOpenSyllabus }: { onOpenSyllabus: () => void }) {
  const { candidates, requirements, budget, meetings } = useStore();
  const pendingCandidates = candidates.filter(candidate => candidate.status === 'pending').length;
  const missingEquipment = requirements.filter(requirement => !requirement.isBrought).length;
  const totalBudget = budget.totalAnnual;
  const spent = budget.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = totalBudget - spent;
  const availablePercentage = totalBudget > 0 ? Math.round((remaining / totalBudget) * 100) : 0;

  const expensesByCategory = budget.expenses.reduce((categories, expense) => {
    categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    return categories;
  }, {} as Record<string, number>);
  const colors = ['#FF5A00', '#F59E0B', '#39AFC2', '#8B5CF6', '#EC4899'];
  const chartData = [
    ...(remaining > 0 ? [{ name: 'תקציב נותר', value: remaining, color: '#10B981' }] : []),
    ...Object.entries(expensesByCategory)
      .filter(([, value]) => value > 0)
      .map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }))
  ];
  const visibleChartData = chartData.length ? chartData : [{ name: 'אין נתונים', value: 1, color: 'var(--theme-border)' }];

  const stats = [
    { label: 'מועמדים ממתינים', value: pendingCandidates },
    { label: 'מפגשים בסילבוס', value: meetings.length },
    { label: 'תקציב פנוי', value: `${availablePercentage}%` },
    { label: 'פריטי ציוד חסרים', value: missingEquipment }
  ];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center space-y-5 pb-10 text-center animate-in fade-in duration-500 sm:space-y-8 sm:pb-12">
      <div className="mt-1 flex flex-col items-center sm:mt-8">
        <img src="/logos/shift logo.png" alt="Shift Logo" className="mb-3 h-auto w-28 object-contain sm:mb-6 sm:w-64" />
        <h2 className="text-2xl font-black text-text-main sm:text-4xl">מסך בית</h2>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {stats.map(stat => (
          <div key={stat.label} className="gaming-card flex min-h-24 flex-col items-center justify-center gap-1 p-3 sm:min-h-32 sm:gap-2 sm:p-6">
            <div className="text-2xl font-black leading-none text-brand sm:text-4xl">{stat.value}</div>
            <div className="text-xs font-bold leading-snug text-text-muted sm:text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:gap-6 xl:grid-cols-2">
        <section className="gaming-card flex min-w-0 flex-col p-4 text-right sm:p-6">
          <h3 className="mb-2 text-lg font-bold text-text-main sm:mb-4 sm:text-xl">מצב תקציב (בשקלים)</h3>
          <div className="relative mx-auto h-44 w-44 sm:h-56 sm:w-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={visibleChartData} cx="50%" cy="50%" innerRadius="59%" outerRadius="83%" paddingAngle={chartData.length > 1 ? 2 : 0} dataKey="value" stroke="none" isAnimationActive={false}>
                  {visibleChartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                {chartData.length > 0 && <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', borderRadius: '12px', color: 'var(--theme-text-main)' }} itemStyle={{ color: 'var(--theme-text-main)' }} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-text-muted">יתרה זמינה</span>
              <strong dir="ltr" className="text-lg font-black text-text-main sm:text-2xl">₪{remaining.toLocaleString()}</strong>
            </div>
          </div>
          <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {chartData.map(entry => (
              <div key={entry.name} className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-alt px-3 py-2 text-xs sm:text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="min-w-0 flex-1 truncate font-bold text-text-main">{entry.name}</span>
                <span dir="ltr" className="shrink-0 font-semibold text-text-muted">₪{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs font-bold text-text-muted sm:text-sm">סה״כ תקציב: ₪{totalBudget.toLocaleString()}</p>
        </section>

        <section className="gaming-card flex min-w-0 flex-col p-4 text-right sm:p-6">
          <h3 className="mb-3 text-lg font-bold text-text-main sm:mb-4 sm:text-xl">המפגש הקרוב</h3>
          {meetings.length > 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-surface-alt p-4 text-center sm:rounded-3xl">
              <div className="mb-2 text-xl font-black text-brand sm:text-2xl">{meetings[0].title}</div>
              <div className="mb-1 font-bold text-text-main">{meetings[0].date.split('-').reverse().join('/')} ב-{meetings[0].time}</div>
              <div className="text-sm text-text-muted">{meetings[0].location}</div>
              <button type="button" onClick={onOpenSyllabus} className="gaming-button mx-auto mt-4 w-full max-w-xs justify-center sm:mt-6">צפה בפרטים</button>
            </div>
          ) : <div className="flex flex-1 items-center justify-center py-8 text-text-muted">אין מפגשים קרובים</div>}
        </section>
      </div>
    </div>
  );
}
