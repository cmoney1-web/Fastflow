CREATE TABLE restaurants (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    tags TEXT,
    image TEXT,
    rating NUMERIC(2, 1) DEFAULT 0
        CHECK (rating BETWEEN 0 AND 5),
    review_count INTEGER NOT NULL DEFAULT 0
        CHECK (review_count >= 0),
    deliv
    delivery_time VARCHAR(30),ery_fee NUMERIC(8, 2) NOT NULL DEFAULT 0
        CHECK (delivery_fee >= 0),
    badge VARCHAR(100)
);

CREATE TABLE menu_items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(8, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(50),
    image TEXT,
    available BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

#prints every value out on the ting yo
SELECT
    restaurants.id AS restaurant_id,
    restaurants.name AS restaurant_name,
    menu_items.name AS item_name,
    menu_items.description,
    menu_items.price,
    menu_items.category,
    menu_items.available
FROM restaurants
LEFT JOIN menu_items
    ON restaurants.id = menu_items.restaurant_id
ORDER BY restaurants.id, menu_items.id;


--this stores the overall orders and delivery detaila
--order_items stores the individual dishdes belonging to that order
--item name perserve what was ordered even if the menu changes later
-- server. js wil calcuate the total amount including delivery fee and all the bullshit please
CREATE TABLE orders (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    customer_name VARCHAR(150) NOT NULL,
    delivery_address TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN (
            'confirmed',
            'preparing',
            'out_for_delivery',
            'delivered',
            'cancelled'
        )),
    delivery_fee NUMERIC(8, 2) NOT NULL
        CHECK (delivery_fee >= 0),
    total_amount NUMERIC(10, 2) NOT NULL
        CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP -- timestampz stoes and date and time represeting a specifd moment, with time-zone handling defult ting automatically fills it with current date and time when you insert an order
);

CREATE TABLE order_items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    item_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(8, 2) NOT NULL CHECK (unit_price >= 0)
);