import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Leaf, MapPin, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, Star, Truck, X } from 'lucide-react';
import RestaurantCard from './components/RestaurantCard';
import AccountPage from './components/AccountPage.jsx';
import OrderPanel from './components/OrderPanel.jsx';
import OwnerPanel from './components/OwnerPanel.jsx';
import { foodImage, money, requestApi, restaurantCardData } from './api.js';

const categories = [
  ['All', '🍽️'], ['Pizza', '🍕'], ['Burgers', '🍔'], ['Healthy', '🥗'],
  ['Indian', '🍛'], ['Desserts', '🍰'], ['Sushi', '🍣'],
];

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [address, setAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [showAll, setShowAll] = useState(false);
  const [favourites, setFavourites] = useState([]);
  const [cart, setCart] = useState([]);
  const [panel, setPanel] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(window.location.pathname);
  const [account, setAccount] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [restaurantError, setRestaurantError] = useState('');
  const [restaurantRefresh, setRestaurantRefresh] = useState(0);
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [orderView, setOrderView] = useState({ id: null, fromOwner: false });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    function onBack() {
      setPage(window.location.pathname);
      setPanel(null);
    }
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    // Use the database's restaurant list instead of sample data bundled with React.
    requestApi('/api/restaurants', { signal: controller.signal })
      .then((rows) => { if (!controller.signal.aborted) setRestaurants(rows.map(restaurantCardData)); })
      .catch((error) => { if (!controller.signal.aborted) setRestaurantError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setRestaurantsLoading(false); });
    return () => controller.abort();
  }, [restaurantRefresh]);

  const restaurantId = selectedRestaurant?.id;

  useEffect(() => {
    if (panel !== 'restaurant' || !restaurantId) return;
    const controller = new AbortController();

    // The restaurant ID from the card goes into the URL for its menu.
    requestApi('/api/restaurants/' + restaurantId + '/menu', { signal: controller.signal })
      .then((rows) => { if (!controller.signal.aborted) setMenu(rows); })
      .catch((error) => { if (!controller.signal.aborted) setMenuError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setMenuLoading(false); });
    return () => controller.abort();
  }, [panel, restaurantId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!panel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => { if (event.key === 'Escape' && !placingOrder) setPanel(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [panel, placingOrder]);

  const filtered = restaurants.filter((restaurant) =>
    (category === 'All' || restaurant.category.toLowerCase() === category.toLowerCase()) &&
    (!freeDelivery || restaurant.fee === 0) &&
    `${restaurant.name} ${restaurant.category} ${restaurant.tags ?? ''}`.toLowerCase().includes(query.toLowerCase().trim()),
  ).sort((a, b) => sort === 'rating' ? Number(b.rating) - Number(a.rating) : sort === 'fastest' ? (parseInt(a.time) || 9999) - (parseInt(b.time) || 9999) : a.id - b.id);
  const visible = showAll || query || category !== 'All' || freeDelivery ? filtered : filtered.slice(0, 3);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  function browse() { document.getElementById('restaurants').scrollIntoView({ behavior: 'smooth' }); }
  function findFood(event) {
    event.preventDefault();
    if (!address.trim()) return;
    setDeliveryAddress(address.trim());
    setNotice('Delivery address updated. Explore your local favourites!');
    browse();
  }
  function navigate(path) {
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setPage(path);
    setPanel(null);
    window.scrollTo(0, 0);
  }

  function signIn(user) {
    // The Basic Auth header stays in state, so reloading clears the sign-in.
    setAccount(user);
    navigate('/');
    setNotice('Signed in as ' + user.username + '.');
  }

  function signOut() {
    setAccount(null);
    setAddress('');
    setDeliveryAddress('');
    setPanel(null);
    setNotice('Signed out.');
  }

  function openRestaurant(restaurant) {
    setSelectedRestaurant(restaurant);
    setMenu([]);
    setMenuError('');
    setMenuLoading(true);
    setPanel('restaurant');
  }

  function addToCart(restaurant, dish) {
    // Each order belongs to one restaurant. The bag stores real menu item IDs.
    if (cart.length > 0 && cart[0].restaurantId !== restaurant.id) return;
    setCart((items) => items.some((item) => item.id === dish.id)
      ? items.map((item) => item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...items, { ...dish, restaurantId: restaurant.id, restaurantName: restaurant.name, fee: restaurant.fee, quantity: 1 }]);
    setNotice(dish.name + ' added to your bag');
  }

  function openBag() {
    setCheckoutError('');
    setPanel('cart');
  }

  function openOrders(id = null, fromOwner = false) {
    setOrderView({ id, fromOwner });
    setPanel('orders');
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (!account || !cart.length || placingOrder) return;
    const fields = new FormData(event.currentTarget);
    setCheckoutError('');
    setPlacingOrder(true);

    try {
      // Send IDs and quantities. Express gets the prices from PostgreSQL.
      const order = await requestApi('/api/restaurants/' + cart[0].restaurantId + '/orders', {
        method: 'POST',
        authorization: account.authorization,
        body: {
          customer_name: fields.get('customer_name'),
          delivery_address: fields.get('delivery_address'),
          items: cart.map(({ id, quantity }) => ({ menu_item_id: id, quantity })),
        },
      });

      // The saved order ID tells the tracking panel which order to fetch.
      setCart([]);
      openOrders(order.order_id);
      setNotice('Order placed.');
    } catch (error) {
      setCheckoutError(error.message);
    } finally {
      setPlacingOrder(false);
    }
  }
  function changeQuantity(id, change) { setCart((items) => items.map((item) => item.id === id ? { ...item, quantity: item.quantity + change } : item).filter((item) => item.quantity > 0)); }

  if (page === '/login' || page === '/register') {
    return <AccountPage key={page} register={page === '/register'} navigate={navigate} onSignIn={signIn} />;
  }

  return (
    <div className="min-h-screen">
      <header className="site-header">
        <div className="page-width flex h-24 items-center gap-8">
          <a href="#" className="brand flex shrink-0 items-center gap-2" aria-label="FoodFlow home"><Leaf className="h-8 w-8 fill-green-800/15" strokeWidth={1.6} />FoodFlow<span className="text-orange-500">.</span></a>
          <button className="hidden items-center gap-2 text-sm font-semibold md:flex" onClick={() => document.getElementById('address').focus()}><MapPin size={17} /><span className="max-w-32 truncate">{deliveryAddress || 'Dublin, Ireland'}</span><ChevronDown size={14} /></button>
          <label className="nav-search ml-auto hidden lg:flex"><Search size={19} /><input aria-label="Search restaurants or cuisines" placeholder="Restaurants or cuisines" value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(true); }} onKeyDown={(event) => { if (event.key === 'Enter') browse(); }} /><span className="search-hint">⌕</span></label>
          <button className="ml-auto flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-white lg:ml-0" onClick={() => account ? setPanel('account') : navigate('/login')}>{account ? 'Account' : 'Sign in'} <ArrowUpRight size={15} /></button>
          <button className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#153d2c] text-white transition hover:bg-green-900" onClick={openBag} aria-label={`Open bag, ${cartCount} items`}><ShoppingBag size={20} /><span className="cart-count">{cartCount}</span></button>
        </div>
      </header>

      <main>
        <section className="page-width hero">
          <div className="hero-copy relative z-10">
            <div className="eyebrow mb-6"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />A LITTLE LOCAL. A LOT DELICIOUS.</div>
            <h1>Your next<br />favourite meal,<br /><em>delivered.</em></h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-stone-500">Big cravings. Local favourites. Discover something delicious, right on your doorstep.</p>
            <form className="address-form mt-8" onSubmit={findFood}><MapPin size={21} className="shrink-0 text-green-900" /><input id="address" aria-label="Delivery address" required placeholder="Enter your delivery address" value={address} onChange={(event) => setAddress(event.target.value)} /><button className="orange-button shrink-0" type="submit">Find food <ArrowRight size={17} /></button></form>
            <div className="mt-5 flex items-center gap-2 text-xs text-stone-500"><Check size={14} className="text-green-700" /> Freshly made <span className="mx-1 text-stone-300">·</span> Locally loved <span className="mx-1 text-stone-300">·</span> Delivered with care</div>
          </div>
          <div className="hero-visual">
            <div className="hero-circle" />
            <img className="hero-food" src={foodImage('photo-1540420773420-3366772f4999', 1200)} alt="A fresh colourful salad with leafy greens, tomatoes and vegetables" fetchPriority="high" />
            <span className="hero-scribble">made fresh,<br />just for you <span>↘</span></span>
            <div className="fresh-badge"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3e8]"><Leaf size={21} /></span><div><strong className="block text-sm">Fresh to your door</strong><span className="text-xs text-stone-500">Good food. Zero fuss.</span></div></div>
            <div className="love-badge"><span className="flex -space-x-2"><span>👩🏽</span><span>👨🏻</span><span>👩🏼</span></span><div><div className="text-xs tracking-wider text-orange-500">★★★★★</div><p className="mt-0.5 text-xs"><strong>2,000+</strong> happy food lovers</p></div></div>
          </div>
        </section>

        <section className="page-width category-section" aria-label="Browse by cuisine">
          <div className="mb-5 flex items-end justify-between"><h2 className="small-heading">What are you craving?</h2><span className="hidden text-xs text-stone-400 sm:block">Something for every kind of hungry.</span></div>
          <div className="category-grid">{categories.map(([name, emoji]) => <button key={name} onClick={() => { setCategory(name); setShowAll(true); }} aria-pressed={category === name} className={`category-button ${category === name ? 'selected' : ''}`}><span className="category-emoji" aria-hidden="true">{emoji}</span><span>{name === 'All' ? 'All food' : name}</span>{category === name && <span className="category-dot" />}</button>)}</div>
        </section>

        <section className="page-width restaurants-section" id="restaurants">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-2 text-stone-400">GOOD FOOD, CLOSE TO HOME</p><h2 className="section-heading">Local favourites<span className="text-orange-500">.</span></h2></div><button className="text-link" onClick={() => { setShowAll(!showAll); setCategory('All'); setQuery(''); setFreeDelivery(false); }}>{showAll ? 'Show favourites' : 'See all restaurants'}<ArrowRight size={17} /></button></div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2"><button className={`filter-pill ${!freeDelivery ? 'active' : ''}`} onClick={() => setFreeDelivery(false)}><SlidersHorizontal size={14} />All restaurants</button><button className={`filter-pill ${freeDelivery ? 'active' : ''}`} onClick={() => { setFreeDelivery(!freeDelivery); setShowAll(true); }} aria-pressed={freeDelivery}><Truck size={15} />Free delivery</button><label className="mobile-search"><Search size={16} /><input aria-label="Filter restaurants" placeholder="Search food..." value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
            <label className="flex items-center gap-2 text-xs text-stone-500">Sort by:<select aria-label="Sort restaurants" className="cursor-pointer bg-transparent font-semibold text-[#153d2c]" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="fastest">Fastest delivery</option></select></label>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{visible.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} favourite={favourites.includes(restaurant.id)} onFavourite={(id) => setFavourites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])} onOpen={openRestaurant} />)}</div>
          {restaurantsLoading && <p role="status" className="mt-5 text-sm text-stone-600">Loading restaurants…</p>}
          {restaurantError && <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <p>{restaurantError}</p>
            <button type="button" className="text-link mt-1" onClick={() => {
              setRestaurantError('');
              setRestaurantsLoading(true);
              setRestaurantRefresh((value) => value + 1);
            }}>Try again</button>
          </div>}
          {!restaurantsLoading && !restaurantError && visible.length === 0 && <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center"><Search className="mx-auto mb-3 text-stone-400" /><h3 className="font-semibold">No meals found this time</h3><p className="mt-2 text-sm text-stone-500">Try another cuisine or clear your filters.</p><button className="text-link mx-auto mt-4" onClick={() => { setQuery(''); setCategory('All'); setFreeDelivery(false); }}>Clear filters <ArrowRight size={15} /></button></div>}
        </section>

        <section className="page-width pb-14"><div className="offer-banner"><div className="offer-decoration" aria-hidden="true">✳</div><div className="relative z-10"><span className="offer-label">A LITTLE TREAT, ON US</span><h2>Good food. <em>Great deals.</em></h2><p>Your favourites taste even better with free delivery.</p></div><button className="orange-button relative z-10" onClick={() => { setFreeDelivery(true); setCategory('All'); setQuery(''); setShowAll(true); browse(); }}>Explore offers <ArrowRight size={17} /></button><Leaf className="banner-leaf" aria-hidden="true" /></div></section>
        <section className="page-width benefits"><div><Leaf size={22} /><span><strong>Made with love</strong><small>Real food from local kitchens</small></span></div><div><Truck size={23} /><span><strong>A little closer, a little fresher</strong><small>Your neighbourhood, delivered</small></span></div><div><Heart size={22} /><span><strong>Good food, good mood</strong><small>Find your new favourite today</small></span></div></section>
      </main>
      <footer className="page-width flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 py-7 text-xs text-stone-400"><span className="brand text-xl text-[#153d2c]">FoodFlow<span className="text-orange-500">.</span></span><p>Good food. Local love. Delivered.</p><span>© {new Date().getFullYear()} FoodFlow</span></footer>

      {notice && <div role="status" className="toast"><Check size={18} />{notice}</div>}
      {panel && <div className="modal-backdrop" onClick={() => { if (!placingOrder) setPanel(null); }}><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="modal" onClick={(event) => event.stopPropagation()} ref={(element) => { if (element && !element.contains(document.activeElement)) element.querySelector('button:not(:disabled)')?.focus(); }} onKeyDown={(event) => { if (event.key !== 'Tab') return; const elements = event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'); if (!elements.length) { event.preventDefault(); return; } const first = elements[0]; const last = elements[elements.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }}>
        <button className="modal-close" disabled={placingOrder} onClick={() => setPanel(null)} aria-label="Close dialog"><X size={20} /></button>
        {panel === 'account' && account && <div className="p-7 pt-12">
          <h2 id="dialog-title" className="section-heading">Your account</h2>
          <p className="mt-2 text-sm text-stone-600">Signed in as {account.username}.</p>
          <div className="mt-5 grid gap-3">
            <button type="button" className="orange-button justify-between" onClick={() => openOrders()}>My orders <ArrowRight size={16} /></button>
            {account.restaurants.length > 0 && <button type="button" className="filter-pill" onClick={() => setPanel('owner')}>Restaurant dashboard</button>}
            <button type="button" className="text-link" onClick={signOut}>Sign out</button>
          </div>
        </div>}

        {panel === 'orders' && account && <OrderPanel
          authorization={account.authorization}
          initialOrderId={orderView.id}
          onBack={orderView.fromOwner ? () => setPanel('owner') : undefined}
        />}
        {panel === 'owner' && account?.restaurants.length > 0 && <OwnerPanel
          account={account} onViewOrder={(id) => openOrders(id, true)}
        />}

        {panel === 'restaurant' && selectedRestaurant && <>
          <img className="h-52 w-full object-cover" src={foodImage(selectedRestaurant.image)} alt={selectedRestaurant.name} />
          <div className="p-7">
            <p className="eyebrow mb-2">{selectedRestaurant.tags || selectedRestaurant.category}</p>
            <h2 id="dialog-title" className="section-heading">{selectedRestaurant.name}</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-stone-600"><Star size={15} className="fill-orange-500 text-orange-500" />
              {selectedRestaurant.rating ?? 'New'} · {selectedRestaurant.time} · {selectedRestaurant.delivery}</p>

            {menuLoading && <p role="status" className="mt-5 text-sm">Loading menu…</p>}
            {menuError && <p role="alert" className="mt-5 text-sm text-red-800">{menuError}</p>}
            {!menuLoading && !menuError && menu.length === 0 && <p className="mt-5 text-sm text-stone-600">There are no dishes available right now.</p>}
            {cart.length > 0 && cart[0].restaurantId !== selectedRestaurant.id && <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-stone-700">
              Your bag has items from {cart[0].restaurantName}. Clear them before adding from this restaurant.
              <button type="button" className="text-link" onClick={openBag}>View bag</button>
            </div>}
            <ul className="mt-5 grid gap-3">
              {menu.map((dish) => <li key={dish.id} className="rounded-xl bg-[#f7f6f0] p-4">
                <h3 className="text-lg font-bold">{dish.name}</h3>
                {dish.description && <p className="mt-1 text-sm text-stone-600">{dish.description}</p>}
                <button type="button" className="orange-button mt-3 w-full justify-between disabled:opacity-50"
                  disabled={cart.length > 0 && cart[0].restaurantId !== selectedRestaurant.id}
                  onClick={() => addToCart(selectedRestaurant, dish)}>
                  Add {dish.name} · {money(dish.price)} <Plus size={17} />
                </button>
              </li>)}
            </ul>
          </div>
        </>}

        {panel === 'cart' && <div className="p-7 pt-12">
          <h2 id="dialog-title" className="section-heading">Your bag<span className="text-orange-500">.</span></h2>
          {cart.length === 0 ? <div className="py-12 text-center">
            <ShoppingBag size={40} className="mx-auto mb-5 text-stone-300" />
            <h3 className="font-bold">Something delicious belongs here.</h3>
            <button type="button" className="orange-button mx-auto mt-6" onClick={() => { setPanel(null); browse(); }}>
              Find your favourite <ArrowRight size={17} />
            </button>
          </div> : <>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="font-bold">{cart[0].restaurantName}</p>
              <button type="button" className="text-link" disabled={placingOrder} onClick={() => { setCart([]); setCheckoutError(''); }}>Clear bag</button>
            </div>
            <div className="mt-1 divide-y divide-stone-100">{cart.map((item) => (
              <div className="flex items-center gap-3 py-4" key={item.id}>
                <img className="h-14 w-14 rounded-lg object-cover" src={foodImage(item.image, 150)} alt="" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold">{item.name}</h3>
                  <p className="mt-1 text-sm">{money(item.price * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-stone-200 p-1">
                  <button type="button" className="p-1" disabled={placingOrder} onClick={() => changeQuantity(item.id, -1)}
                    aria-label={'Decrease ' + item.name + ' quantity'}><Minus size={14} /></button>
                  <span className="text-sm">{item.quantity}</span>
                  <button type="button" className="p-1" disabled={placingOrder} onClick={() => changeQuantity(item.id, 1)}
                    aria-label={'Increase ' + item.name + ' quantity'}><Plus size={14} /></button>
                </div>
              </div>
            ))}</div>
            <div className="grid gap-2 border-t border-stone-200 pt-4 text-sm">
              <p className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></p>
              <p className="flex justify-between"><span>Delivery</span><span>{money(cart[0].fee)}</span></p>
              <p className="flex justify-between font-bold"><span>Estimated total</span><span>{money(subtotal + cart[0].fee)}</span></p>
            </div>

            {account ? <form className="mt-5 grid gap-3 rounded-xl bg-stone-100 p-4" onSubmit={placeOrder}>
              <h3 className="font-bold">Delivery details</h3>
              <label className="grid gap-1 text-sm font-semibold">
                Name for delivery
                <input name="customer_name" defaultValue={account.username} maxLength={150} required disabled={placingOrder}
                  className="rounded-lg border border-stone-300 bg-white p-2" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Delivery address
                <input name="delivery_address" defaultValue={deliveryAddress || address} autoComplete="street-address" required disabled={placingOrder}
                  className="rounded-lg border border-stone-300 bg-white p-2" />
              </label>
              {checkoutError && <p role="alert" className="text-sm text-red-800">{checkoutError}</p>}
              <button className="orange-button disabled:opacity-60" disabled={placingOrder}>{placingOrder ? 'Placing order…' : 'Place order'}</button>
            </form> : <button type="button" className="orange-button mt-5 w-full" onClick={() => navigate('/login')}>Sign in to order</button>}
          </>}
        </div>}
      </section></div>}
    </div>
  );
}
