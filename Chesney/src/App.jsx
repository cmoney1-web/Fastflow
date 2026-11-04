import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Leaf, MapPin, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, Star, Truck, X } from 'lucide-react';
import RestaurantCard from './components/RestaurantCard';
import { foodImage, restaurants } from './data';

const categories = [
  ['All', '🍽️'], ['Pizza', '🍕'], ['Burgers', '🍔'], ['Healthy', '🥗'],
  ['Indian', '🍛'], ['Desserts', '🍰'], ['Sushi', '🍣'],
];
const money = (value) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);

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

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!panel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => { if (event.key === 'Escape') setPanel(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [panel]);

  const filtered = restaurants.filter((restaurant) =>
    (category === 'All' || restaurant.category === category) &&
    (!freeDelivery || restaurant.fee === 0) &&
    `${restaurant.name} ${restaurant.tags}`.toLowerCase().includes(query.toLowerCase().trim()),
  ).sort((a, b) => sort === 'rating' ? Number(b.rating) - Number(a.rating) : sort === 'fastest' ? parseInt(a.time) - parseInt(b.time) : a.id - b.id);
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
  function openRestaurant(restaurant) { setSelectedRestaurant(restaurant); setPanel('restaurant'); }
  function addToCart(restaurant) {
    setCart((items) => items.some((item) => item.id === restaurant.id)
      ? items.map((item) => item.id === restaurant.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...items, { ...restaurant, quantity: 1 }]);
    setNotice(`${restaurant.dish} added to your bag`);
    setPanel(null);
  }
  function changeQuantity(id, change) { setCart((items) => items.map((item) => item.id === id ? { ...item, quantity: item.quantity + change } : item).filter((item) => item.quantity > 0)); }

  return (
    <div className="min-h-screen">
      <header className="site-header">
        <div className="page-width flex h-24 items-center gap-8">
          <a href="#" className="brand flex shrink-0 items-center gap-2" aria-label="FoodFlow home"><Leaf className="h-8 w-8 fill-green-800/15" strokeWidth={1.6} />Input name here please<span className="text-orange-500">.</span></a>
          <button className="hidden items-center gap-2 text-sm font-semibold md:flex" onClick={() => document.getElementById('address').focus()}><MapPin size={17} /><span className="max-w-32 truncate">{deliveryAddress || 'Dublin, Ireland'}</span><ChevronDown size={14} /></button>
          <label className="nav-search ml-auto hidden lg:flex"><Search size={19} /><input aria-label="Search restaurants or cuisines" placeholder="Restaurants, cuisines or dishes" value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(true); }} onKeyDown={(event) => { if (event.key === 'Enter') browse(); }} /><span className="search-hint">⌕</span></label>
          <button className="ml-auto flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-white lg:ml-0" onClick={() => setPanel('signin')}>Sign in <ArrowUpRight size={15} /></button>
          <button className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#153d2c] text-white transition hover:bg-green-900" onClick={() => setPanel('cart')} aria-label={`Open bag, ${cartCount} items`}><ShoppingBag size={20} /><span className="cart-count">{cartCount}</span></button>
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
          {visible.length === 0 && <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center"><Search className="mx-auto mb-3 text-stone-400" /><h3 className="font-semibold">No meals found this time</h3><p className="mt-2 text-sm text-stone-500">Try another cuisine or clear your filters.</p><button className="text-link mx-auto mt-4" onClick={() => { setQuery(''); setCategory('All'); setFreeDelivery(false); }}>Clear filters <ArrowRight size={15} /></button></div>}
        </section>

        <section className="page-width pb-14"><div className="offer-banner"><div className="offer-decoration" aria-hidden="true">✳</div><div className="relative z-10"><span className="offer-label">A LITTLE TREAT, ON US</span><h2>Good food. <em>Great deals.</em></h2><p>Your favourites taste even better with free delivery.</p></div><button className="orange-button relative z-10" onClick={() => { setFreeDelivery(true); setCategory('All'); setQuery(''); setShowAll(true); browse(); }}>Explore offers <ArrowRight size={17} /></button><Leaf className="banner-leaf" aria-hidden="true" /></div></section>
        <section className="page-width benefits"><div><Leaf size={22} /><span><strong>Made with love</strong><small>Real food from local kitchens</small></span></div><div><Truck size={23} /><span><strong>A little closer, a little fresher</strong><small>Your neighbourhood, delivered</small></span></div><div><Heart size={22} /><span><strong>Good food, good mood</strong><small>Find your new favourite today</small></span></div></section>
      </main>
      <footer className="page-width flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 py-7 text-xs text-stone-400"><span className="brand text-xl text-[#153d2c]">FoodFlow<span className="text-orange-500">.</span></span><p>Good food. Local love. Delivered.</p><span>© {new Date().getFullYear()} FoodFlow · Frontend demo</span></footer>

      {notice && <div role="status" className="toast"><Check size={18} />{notice}</div>}
      {panel && <div className="modal-backdrop" onClick={() => setPanel(null)}><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="modal" onClick={(event) => event.stopPropagation()} ref={(element) => { if (element && !element.contains(document.activeElement)) element.querySelector('button')?.focus(); }} onKeyDown={(event) => { if (event.key !== 'Tab') return; const elements = event.currentTarget.querySelectorAll('button, input, select, a[href]'); const first = elements[0]; const last = elements[elements.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }}>
        <button className="modal-close" onClick={() => setPanel(null)} aria-label="Close dialog"><X size={20} /></button>
        {panel === 'signin' && <div className="p-8 pt-12"><Leaf size={35} /><h2 id="dialog-title" className="section-heading mt-4">Welcome to FoodFlow.</h2><p className="mt-4 leading-7 text-stone-500">You're exploring the frontend demo. Accounts and sign-in will be added when the backend is ready.</p><button className="orange-button mt-6" onClick={() => { setPanel(null); browse(); }}>Explore the food <ArrowRight size={17} /></button></div>}
        {panel === 'restaurant' && selectedRestaurant && <><img className="h-60 w-full object-cover" src={foodImage(selectedRestaurant.image)} alt={selectedRestaurant.dish} /><div className="p-7"><p className="eyebrow mb-2">{selectedRestaurant.tags}</p><h2 id="dialog-title" className="section-heading">{selectedRestaurant.name}</h2><p className="mt-3 flex items-center gap-2 text-sm text-stone-500"><Star size={15} className="fill-orange-500 text-orange-500" />{selectedRestaurant.rating} · {selectedRestaurant.time} min · {selectedRestaurant.delivery}</p><div className="mt-7 rounded-xl bg-[#f7f6f0] p-5"><span className="text-xs font-semibold uppercase tracking-wider text-stone-400">A taste of the menu</span><h3 className="mt-2 text-lg font-bold">{selectedRestaurant.dish}</h3><p className="mt-1 text-sm text-stone-500">Freshly prepared, full of flavour. A local favourite.</p><button className="orange-button mt-5 w-full justify-between" onClick={() => addToCart(selectedRestaurant)}>Add to bag · {money(selectedRestaurant.price)}<Plus size={18} /></button></div><p className="mt-4 text-xs text-stone-400">Sample menu · Orders are for demonstration only.</p></div></>}
        {panel === 'cart' && <div className="p-7 pt-12"><h2 id="dialog-title" className="section-heading">Your bag<span className="text-orange-500">.</span></h2>{cart.length === 0 ? <div className="py-12 text-center"><ShoppingBag size={40} className="mx-auto mb-5 text-stone-300" /><h3 className="font-bold">Something delicious belongs here.</h3><p className="mt-2 text-sm text-stone-500">Explore a restaurant and add a local favourite.</p><button className="orange-button mx-auto mt-6" onClick={() => { setPanel(null); browse(); }}>Find your favourite <ArrowRight size={17} /></button></div> : <><div className="mt-5 divide-y divide-stone-100">{cart.map((item) => <div className="flex items-center gap-3 py-4" key={item.id}><img className="h-14 w-14 rounded-lg object-cover" src={foodImage(item.image, 150)} alt="" /><div className="flex-1"><h3 className="text-sm font-bold">{item.dish}</h3><p className="mt-1 text-xs text-stone-500">{item.name}</p><p className="mt-1 text-sm">{money(item.price * item.quantity)}</p></div><div className="flex items-center gap-2 rounded-full border border-stone-200 p-1"><button className="p-1" onClick={() => changeQuantity(item.id, -1)} aria-label={`Decrease ${item.dish} quantity`}><Minus size={14} /></button><span className="text-sm">{item.quantity}</span><button className="p-1" onClick={() => changeQuantity(item.id, 1)} aria-label={`Increase ${item.dish} quantity`}><Plus size={14} /></button></div></div>)}</div><div className="mt-5 flex justify-between border-t border-stone-200 pt-5 font-bold"><span>Subtotal</span><span>{money(subtotal)}</span></div><p className="mt-5 rounded-xl bg-orange-50 p-4 text-sm leading-6 text-stone-600">This is a frontend demo. Checkout, delivery charges and real orders will be available when the backend is connected.</p></>}</div>}
      </section></div>}
    </div>
  );
}
