import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { pointsApi } from '../../services/api';
import { PointTransaction } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';

export function PointsPage() {
  const { user, setUser } = useAuth();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [points, setPoints] = useState(user?.points ?? 0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pointsApi.mine()
      .then((data) => {
        const nextPoints = data.points ?? 0;
        setPoints(nextPoints);
        setTransactions(data.transactions ?? []);
        if (user) {
          setUser({ ...user, points: nextPoints });
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [setUser]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">نقاطي</h1>
        <p className="-mt-4 text-sm text-slate-500">نظام نقاط محب نت: كل 100 جنيه تدفعها في اشتراكاتك تمنحك 10 نقاط في رصيدك!</p>
      </div>

      <div className="card overflow-hidden border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-amber-700">الرصيد الحالي</p>
            <p className="mt-2 text-4xl font-black text-amber-900">{points} نقطة</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500 text-3xl text-white shadow-lg shadow-amber-300/60">⭐</div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-black text-night">سجل النقاط</h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">جاري تحميل سجل النقاط…</div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">لا توجد معاملات نقاط حتى الآن.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="th">التاريخ</th>
                  <th className="th">النقاط</th>
                  <th className="th">الوصف</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-slate-100 last:border-0">
                    <td className="td">{fmtDateTime(transaction.createdAt)}</td>
                    <td className={`td font-black ${transaction.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </td>
                    <td className="td">{transaction.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
