import { useEffect, useState } from 'react';
import { money, requestApi, statusLabels } from '../api.js';

const nextStatuses = {
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
};

export default function OwnerPanel({ account, onViewOrder }) {
  const [restaurantId, setRestaurantId] = useState(account.restaurants[0].id);
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const base = '/api/restaurants/' + restaurantId;
  const authorization = account.authorization;

  useEffect(() => {
    const controller = new AbortController();
    const options = { authorization, signal: controller.signal };

    // These routes only return orders and dishes for a restaurant this account owns.
    Promise.all([
      requestApi(base + '/orders', options),
      requestApi(base + '/menu/manage', options),
    ]).then(([orders, menu]) => {
      if (controller.signal.aborted) return;
      setOrders(orders);
      setMenu(menu);
    }).catch((error) => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [base, authorization, refresh]);

  async function changeStatus(id, status) {
    setSaving(true);
    setError('');
    try {
      // Express checks that the status change is allowed before saving it.
      const { order } = await requestApi('/api/orders/' + id + '/status', {
        method: 'PATCH', body: { status }, authorization,
      });
      setOrders((entries) => entries.map((entry) => entry.id === id ? { ...entry, status: order.status } : entry));
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveDish(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const body = {
      name: fields.get('name'),
      description: fields.get('description'),
      price: fields.get('price'),
      available: fields.has('available'),
    };

    setSaving(true);
    setError('');
    try {
      // POST adds a dish. PATCH updates the selected dish.
      const dish = await requestApi(base + '/menu' + (editing ? '/' + editing.id : ''), {
        method: editing ? 'PATCH' : 'POST', body, authorization,
      });
      setMenu((items) => editing ? items.map((item) => item.id === dish.id ? dish : item) : [...items, dish]);
      form.reset();
      setEditing(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-7 pt-12">
      <h2 id="dialog-title" className="section-heading">Restaurant dashboard</h2>
      <label className="mt-5 grid gap-2 text-sm font-semibold">
        Restaurant
        <select className="rounded-lg border border-stone-300 bg-white p-2.5" value={restaurantId} disabled={saving}
          onChange={(event) => {
            setEditing(null);
            setOrders([]);
            setMenu([]);
            setError('');
            setLoading(true);
            setRestaurantId(Number(event.target.value));
          }}>
          {account.restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
        </select>
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={tab === 'orders'} className={'filter-pill ' + (tab === 'orders' ? 'active' : '')}
          disabled={saving} onClick={() => setTab('orders')}>Incoming orders</button>
        <button type="button" aria-pressed={tab === 'menu'} className={'filter-pill ' + (tab === 'menu' ? 'active' : '')}
          disabled={saving} onClick={() => setTab('menu')}>Edit menu</button>
        <button type="button" className="text-link ml-auto" disabled={loading || saving} onClick={() => {
          setLoading(true);
          setError('');
          setRefresh((value) => value + 1);
        }}>Refresh</button>
      </div>
      {loading && <p role="status" className="mt-5 text-sm">Loading restaurant…</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {!loading && tab === 'orders' && <ul className="mt-5 grid gap-3">
        {!orders.length && !error && <li className="text-sm text-stone-600">No orders yet.</li>}
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="flex flex-wrap justify-between gap-2 font-bold">
              <span>Order #{order.id} · {order.customer_name}</span><span>{money(order.total_amount)}</span>
            </p>
            <p className="mt-1 text-sm text-stone-600">{order.delivery_address}</p>
            <p className="mt-2 text-sm font-semibold">{statusLabels[order.status]}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="filter-pill" disabled={saving} onClick={() => onViewOrder(order.id)}>View order</button>
              {(nextStatuses[order.status] ?? []).map((status) => (
                <button key={status} type="button" className="filter-pill disabled:opacity-60" disabled={saving}
                  onClick={() => changeStatus(order.id, status)}>
                  {status === 'cancelled' ? 'Cancel order' : 'Mark ' + statusLabels[status].toLowerCase()}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>}

      {!loading && tab === 'menu' && <>
        <ul className="mt-5 divide-y divide-stone-200">
          {menu.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div><p className="font-semibold">{item.name} · {money(item.price)}</p>
                <p className="text-xs text-stone-600">{item.available ? 'Available' : 'Unavailable'}</p></div>
              <button type="button" className="filter-pill" disabled={saving} onClick={() => setEditing(item)}>Edit {item.name}</button>
            </li>
          ))}
        </ul>

        <form key={restaurantId + '-' + (editing?.id ?? 'new')} onSubmit={saveDish} className="mt-5 grid gap-3 rounded-xl bg-stone-100 p-4">
          <h3 className="font-bold">{editing ? 'Edit dish' : 'Add a dish'}</h3>
          <label className="grid gap-1 text-sm font-medium">
            Dish name
            <input name="name" defaultValue={editing?.name} maxLength={150} required className="rounded-lg border border-stone-300 bg-white p-2" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Description
            <textarea name="description" rows={2} defaultValue={editing?.description ?? ''} className="rounded-lg border border-stone-300 bg-white p-2" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Price (€)
            <input name="price" type="number" min="0" max="999999.99" step="0.01" defaultValue={editing?.price} required
              className="rounded-lg border border-stone-300 bg-white p-2" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input name="available" type="checkbox" defaultChecked={editing?.available ?? true} /> Available to order
          </label>
          <div className="flex items-center gap-3">
            <button className="orange-button disabled:opacity-60" disabled={saving}>{editing ? 'Save changes' : 'Add dish'}</button>
            {editing && <button type="button" className="text-link" disabled={saving} onClick={() => setEditing(null)}>Cancel edit</button>}
          </div>
        </form>
      </>}
    </div>
  );
}
