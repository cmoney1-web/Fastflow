// Sample data keeps this homepage independent of a backend.
export const restaurants = [
  { id: 1, name: 'The Green Bowl', category: 'Healthy', tags: 'Healthy · Bowls · Salads', rating: '4.8', reviews: '1.2k', time: '20–30', delivery: '€1.99 delivery', fee: 1.99, image: 'photo-1512621776951-a57141f2eefd', dish: 'Harvest bowl', price: 12.50, badge: 'Fresh favourite', mark: 'GB', color: '#365c40' },
  { id: 2, name: 'Slice House', category: 'Pizza', tags: 'Pizza · Italian · Comfort food', rating: '4.7', reviews: '892', time: '25–35', delivery: 'Free delivery', fee: 0, image: 'photo-1579751626657-72bc17010498', dish: 'Margherita pizza', price: 14.00, badge: 'Free delivery', mark: 'SH', color: '#97452d' },
  { id: 3, name: 'Burger District', category: 'Burgers', tags: 'Burgers · American · Fries', rating: '4.9', reviews: '2.1k', time: '15–25', delivery: '€2.49 delivery', fee: 2.49, image: 'photo-1568901346375-23c9450c58cd', dish: 'District cheeseburger', price: 13.50, badge: 'Neighbourhood favourite', mark: 'BD', color: '#b5843e' },
  { id: 4, name: 'Spice & Soul', category: 'Indian', tags: 'Indian · Curry · Vegetarian', rating: '4.8', reviews: '643', time: '25–40', delivery: 'Free delivery', fee: 0, image: 'photo-1603894584373-5ac82b2ae398', dish: 'House curry & rice', price: 15.00, badge: 'Free delivery', mark: 'SS', color: '#b45a29' },
  { id: 5, name: 'Little Sweet Things', category: 'Desserts', tags: 'Desserts · Bakery · Treats', rating: '4.9', reviews: '418', time: '15–25', delivery: '€1.49 delivery', fee: 1.49, image: 'photo-1578985545062-69928b1d9587', dish: 'Chocolate cake slice', price: 6.50, badge: 'A little indulgence', mark: 'LS', color: '#865568' },
  { id: 6, name: 'Maki & Co.', category: 'Sushi', tags: 'Japanese · Sushi · Bowls', rating: '4.7', reviews: '756', time: '20–35', delivery: '€1.99 delivery', fee: 1.99, image: 'photo-1579871494447-9811cf80d66c', dish: 'Signature sushi selection', price: 16.50, badge: 'Made fresh', mark: 'MC', color: '#456564' },
];

export const foodImage = (id, width = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
