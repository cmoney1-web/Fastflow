import { Clock3, Heart, Star, Truck } from 'lucide-react';
import { foodImage } from '../data';

export default function RestaurantCard({ restaurant, favourite, onFavourite, onOpen }) {
  return (
    <article className="restaurant-card group">
      <div className="relative overflow-hidden rounded-t-2xl">
        <button className="block w-full overflow-hidden text-left" onClick={() => onOpen(restaurant)} aria-label={`View ${restaurant.name}`}>
          <img className="h-56 w-full object-cover transition duration-500 group-hover:scale-105" src={foodImage(restaurant.image)} alt={`${restaurant.category} from ${restaurant.name}`} loading="lazy" />
          <span className="photo-badge">{restaurant.badge}</span>
        </button>
        <button className={`favourite ${favourite ? 'is-favourite' : ''}`} onClick={() => onFavourite(restaurant.id)} aria-label={`${favourite ? 'Remove' : 'Save'} ${restaurant.name} ${favourite ? 'from' : 'to'} favourites`} aria-pressed={favourite}><Heart size={19} fill={favourite ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <button className="text-left text-lg font-bold hover:underline" onClick={() => onOpen(restaurant)}>{restaurant.name}</button>
          <span className="flex items-center gap-1 text-sm font-semibold"><Star size={14} className="fill-orange-500 text-orange-500" />{restaurant.rating} <span className="text-xs font-normal text-stone-400">({restaurant.reviews})</span></span>
        </div>
        <p className="mt-1 text-sm text-stone-500">{restaurant.tags}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3 text-xs text-stone-600"><span className="flex items-center gap-1.5"><Clock3 size={15} />{restaurant.time} min</span><span className={`flex items-center gap-1.5 ${restaurant.fee === 0 ? 'font-semibold text-green-800' : ''}`}><Truck size={16} />{restaurant.delivery}</span></div>
      </div>
    </article>
  );
}
