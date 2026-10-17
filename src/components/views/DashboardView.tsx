import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useStore } from '../../StoreContext';

export default function DashboardView() {
  const { candidates, requirements, budget, meetings } = useStore();

  const pendingCandidates = candidates.filter(c => c.status === 'pending').length;
  const missingEquipment = requirements.filter(r => !r.isBrought).length;
  
  // Calculate budget breakdown
  const totalBudget = budget.totalAnnual;
  const spent = budget.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = totalBudget - spent;
  
  // Group expenses by category
  const expensesByCategory = budget.expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = 0;
    acc[exp.category] += exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: 'תקציב נותר', value: remaining, color: '#10B981' }, // Green for remaining
    ...Object.entries(expensesByCategory).map(([name, value], index) => {
      const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];
      return {
        name,
        value,
        color: colors[index % colors.length]
      };
    })
  ];

  return (
    <div className="flex flex-col items-center justify-start min-h-full text-center space-y-8 animate-in fade-in zoom-in duration-500 w-full max-w-5xl mx-auto pb-12">
      <div className="mt-8">
        <div className="w-64 h-auto mx-auto mb-6 flex items-center justify-center">
          <img src="/logos/shift logo.png" alt="Shift Logo" className="w-full h-auto object-contain" />
        </div>
        <h2 className="text-4xl font-black text-text-main mb-2">מסך בית</h2>
      </div>
      
      {/* Quick stats for dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
         <div className="gaming-card p-6 text-center">
           <div className="text-4xl font-black text-brand mb-2">{pendingCandidates}</div>
           <div className="text-sm font-bold text-text-muted uppercase">מועמדים ממתינים</div>
         </div>
         <div className="gaming-card p-6 text-center">
           <div className="text-4xl font-black text-brand mb-2">{meetings.length}</div>
           <div className="text-sm font-bold text-text-muted uppercase">מפגשים שנשארו לסמסטר</div>
         </div>
         <div className="gaming-card p-6 text-center">
           <div className="text-4xl font-black text-brand mb-2">{Math.round((remaining / totalBudget) * 100)}%</div>
           <div className="text-sm font-bold text-text-muted uppercase">תקציב פנוי</div>
         </div>
         <div className="gaming-card p-6 text-center">
           <div className="text-4xl font-black text-brand mb-2">{missingEquipment}</div>
           <div className="text-sm font-bold text-text-muted uppercase">חסר ציוד למפגש</div>
         </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full mt-8">
        {/* Budget Chart */}
        <div className="gaming-card p-6 flex flex-col">
          <h3 className="text-xl font-bold text-text-main mb-4 text-right">מצב תקציב (בשקלים)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `₪${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', borderRadius: '8px', color: 'var(--theme-text-main)' }}
                  itemStyle={{ color: 'var(--theme-text-main)' }}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="left"
                  content={(props: any) => {
                    const { payload } = props;
                    return (
                      <ul className="flex flex-col gap-3 m-0 p-0 pr-2">
                        {payload?.map((entry: any, index: number) => (
                          <li key={`item-${index}`} className="flex items-center gap-3 text-sm text-right">
                            <span className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-text-main font-bold whitespace-nowrap">{entry.value}</span>
                            <span className="text-text-muted mr-auto font-sans font-semibold text-left" dir="ltr">₪{entry.payload.value.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-2 text-text-muted font-bold text-sm">
            סה"כ תקציב: ₪{totalBudget.toLocaleString()}
          </div>
        </div>

        {/* Recent Actions or Info (Placeholder for balance) */}
        <div className="gaming-card p-6 text-right flex flex-col">
          <h3 className="text-xl font-bold text-text-main mb-4">המפגש הקרוב</h3>
          {meetings.length > 0 ? (
            <div className="bg-surface-alt p-4 rounded-3xl border border-border flex-1 flex flex-col justify-center items-center text-center">
              <div className="text-brand font-black text-2xl mb-2">{meetings[0].title}</div>
              <div className="text-text-main font-bold mb-1">{meetings[0].date.split('-').reverse().join('/')} ב-{meetings[0].time}</div>
              <div className="text-text-muted">{meetings[0].location}</div>
              <button className="gaming-button mt-6 w-full max-w-xs mx-auto">צפה בפרטים</button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              אין מפגשים קרובים
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
