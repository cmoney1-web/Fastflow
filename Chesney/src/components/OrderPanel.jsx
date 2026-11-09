import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { money, requestApi, statusLabels } from '../api.js';

const stages = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderPanel({ authorization, initialOrderId, onBack }) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // The same panel loads either the customer's history or one order's details.
    const path = orderId ? '/api/orders/' + orderId : '/api/orders';
    requestApi(path, { authorization, signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setRows(data); })
      .catch((error) => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authorization, orderId, refresh]);

  function openOrder(id) {
    setLoading(true);
    setError('');
    setOrderId(id);
  }

  const order = orderId ? rows[0] : null;
  const stage = stages.indexOf(order?.status);

  return (
    <div className="p-7 pt-12">
      {orderId && <button type="button" className="text-link mb-3" onClick={onBack || (() => openOrder(null))}>
        <ArrowLeft size={16} /> {onBack ? 'Restaurant orders' : 'My orders'}
      </button>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dialog-title" className="section-heading">{orderId ? 'Order #' + orderId : 'My orders'}</h2>
        <button type="button" className="text-link" disabled={loading} onClick={() => {
          setLoading(true);
          setError('');
          setRefresh((value) => value + 1);
        }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      {loading && <p role="status" className="mt-5 text-sm">Loading orders…</p>}
      {error && <p role="alert" className="mt-5 text-sm text-red-800">{error}</p>}

      {!loading && !error && (orderId ? order && (
        <div className="mt-5 grid gap-5">
          <div>
            <p className="font-bold">{order.restaurant_name}</p>
            <p className="text-sm text-stone-600">{order.delivery_address}</p>
          </div>
          <div>
            <p className="text-sm font-bold">Status · {statusLabels[order.status]}</p>
            {stage >= 0 && <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stages.map((status, index) => (
                <li key={status} aria-current={stage === index ? 'step' : undefined}
                  className={'rounded-md px-2 py-2 text-xs ' + (index <= stage ? 'bg-green-100 font-semibold text-green-950' : 'bg-stone-100 text-stone-600')}>
                  {statusLabels[status]}
                </li>
              ))}
            </ol>}
          </div>
          <ul className="divide-y divide-stone-200">
            {rows.filter((item) => item.menu_item_id !== null).map((item, index) => (
              <li key={index} className="flex justify-between gap-2 py-2 text-sm">
                <span>{item.quantity} × {item.item_name}</span>
                <span>{money(Number(item.unit_price) * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-stone-200 pt-3 font-bold">
            <span>Total including delivery</span><span>{money(order.total_amount)}</span>
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {rows.length === 0 && <p className="text-sm text-stone-600">Your first order will appear here.</p>}
          {rows.map((entry) => (
            <button key={entry.id} type="button" className="rounded-xl border border-stone-200 bg-white p-4 text-left hover:border-green-800"
              onClick={() => openOrder(entry.id)}>
              <span className="flex justify-between gap-3 font-bold"><span>{entry.restaurant_name}</span><span>{money(entry.total_amount)}</span></span>
              <span className="mt-1 block text-sm text-stone-600">#{entry.id} · {statusLabels[entry.status]}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
