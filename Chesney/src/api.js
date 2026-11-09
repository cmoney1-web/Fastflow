// The browser calls /api on Vite. Vite forwards the request to Express.
export async function requestApi(path, { method = 'GET', body, authorization, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authorization) headers.Authorization = authorization;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: 'omit',
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Could not reach FoodFlow. Check that the server is running.');
  }

  // fetch still returns a response for errors like 400 or 401.
  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) {
    throw new Error(result?.message || 'FoodFlow could not complete this request.');
  }
  return result;
}

export function basicAuth(username, password) {
  // Encode username:password as UTF-8 before making the Basic Auth header.
  const bytes = new TextEncoder().encode(username + ':' + password);
  return 'Basic ' + btoa(String.fromCharCode(...bytes));
}

export const money = (value) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);

export function foodImage(image, width = 800) {
  if (typeof image === 'string' && /^https?:\/\//i.test(image)) return image;
  const photo = typeof image === 'string' && /^photo-[a-z0-9-]+$/i.test(image)
    ? image : 'photo-1540420773420-3366772f4999';
  return 'https://images.unsplash.com/' + photo + '?auto=format&fit=crop&w=' + width + '&q=85';
}

// Convert the SQL fields into the display values the restaurant card uses.
export function restaurantCardData(restaurant) {
  const fee = Number(restaurant.delivery_fee ?? 0);
  const time = restaurant.delivery_time?.trim();
  return {
    ...restaurant,
    fee,
    delivery: fee === 0 ? 'Free delivery' : money(fee) + ' delivery',
    time: time ? time.replace(/\s*min$/i, '') + ' min' : 'Time unavailable',
    reviews: Number(restaurant.review_count ?? 0).toLocaleString('en-IE'),
  };
}

export const statusLabels = {
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
