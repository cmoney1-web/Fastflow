// Owner routes check the signed-in user against the restaurant's owner_user_id.
export function addOwnerRoutes(app, db, requireAuth) {
  async function requireOwner(req, res, next) {
    const restaurantId = Number(req.params.id);
    if (!validId(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant ID." });
    }

    const result = await db.query(
      "SELECT id FROM restaurants WHERE id = $1 AND owner_user_id = $2",
      [restaurantId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    req.restaurantId = restaurantId;
    return next();
  }

  app.get("/api/owner/restaurants", requireAuth, async (req, res) => {
    const result = await db.query(
      "SELECT id, name FROM restaurants WHERE owner_user_id = $1 ORDER BY name",
      [req.user.id]
    );
    return res.json(result.rows);
  });

  app.get("/api/restaurants/:id/orders", requireAuth, requireOwner, async (req, res) => {
    const result = await db.query(
      `SELECT orders.id, orders.customer_name, orders.delivery_address,
              orders.status, orders.total_amount, orders.created_at
       FROM orders JOIN restaurants ON restaurants.id = orders.restaurant_id
       WHERE orders.restaurant_id = $1 AND restaurants.owner_user_id = $2
       ORDER BY orders.created_at DESC, orders.id DESC`,
      [req.restaurantId, req.user.id]
    );
    return res.json(result.rows);
  });

  // Owners can also see unavailable dishes so they can restore them.
  app.get("/api/restaurants/:id/menu/manage", requireAuth, requireOwner, async (req, res) => {
    const result = await db.query(
      `SELECT menu_items.* FROM menu_items
       JOIN restaurants ON restaurants.id = menu_items.restaurant_id
       WHERE menu_items.restaurant_id = $1 AND restaurants.owner_user_id = $2
       ORDER BY menu_items.id`,
      [req.restaurantId, req.user.id]
    );
    return res.json(result.rows);
  });

  app.post("/api/restaurants/:id/menu", requireAuth, requireOwner, async (req, res) => {
    const { name, description, price, category, image, available } = req.body ?? {};
    const error = menuError(req.body ?? {});
    if (error) return res.status(400).json({ message: error });

    // The INSERT also checks ownership in case it changed after requireOwner ran.
    const result = await db.query(
      `INSERT INTO menu_items (restaurant_id, name, description, price, category, image, available)
       SELECT id, $3, $4, $5, $6, $7, $8 FROM restaurants
       WHERE id = $1 AND owner_user_id = $2
       RETURNING *`,
      [req.restaurantId, req.user.id, name.trim(), description ?? null, price,
        category ?? null, image ?? null, available ?? true]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Restaurant not found." });
    }
    return res.status(201).json(result.rows[0]);
  });

  app.patch("/api/restaurants/:id/menu/:itemId", requireAuth, requireOwner, async (req, res) => {
    const itemId = Number(req.params.itemId);
    if (!validId(itemId)) return res.status(400).json({ message: "Invalid menu item ID." });

    const { name, description, price, category, image, available } = req.body ?? {};
    const error = menuError(req.body ?? {}, true);
    if (error) return res.status(400).json({ message: error });

    // COALESCE keeps a field's current value when it was left out of the request.
    const result = await db.query(
      `UPDATE menu_items AS item SET
         name = COALESCE($4, item.name),
         description = COALESCE($5, item.description),
         price = COALESCE($6, item.price),
         category = COALESCE($7, item.category),
         image = COALESCE($8, item.image),
         available = COALESCE($9, item.available)
       FROM restaurants
       WHERE item.id = $1 AND item.restaurant_id = $2
         AND restaurants.id = item.restaurant_id AND restaurants.owner_user_id = $3
       RETURNING item.*`,
      [itemId, req.restaurantId, req.user.id, name?.trim() ?? null, description ?? null,
        price ?? null, category ?? null, image ?? null, available ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found." });
    }
    return res.json(result.rows[0]);
  });
}

function validId(id) {
  return Number.isInteger(id) && id > 0 && id <= 2147483647;
}

function menuError({ name, description, price, category, image, available }, editing = false) {
  if ((!editing || name !== undefined) &&
      (typeof name !== "string" || !name.trim() || name.trim().length > 150)) {
    return "Enter a dish name of up to 150 characters.";
  }

  // This matches the price column's six euro digits and two decimal places.
  if ((!editing || price !== undefined) &&
      (!["string", "number"].includes(typeof price) || !/^\d{1,6}(\.\d{1,2})?$/.test(String(price)))) {
    return "Enter a non-negative price with up to two decimal places.";
  }

  if (description !== undefined && typeof description !== "string") return "Description must be text.";
  if (image !== undefined && typeof image !== "string") return "Image must be text.";
  if (category !== undefined && (typeof category !== "string" || category.length > 50)) {
    return "Category must be text of up to 50 characters.";
  }
  if (available !== undefined && typeof available !== "boolean") return "Availability must be true or false.";
  if (editing && [name, description, price, category, image, available].every((value) => value === undefined)) {
    return "Include at least one menu field to update.";
  }
  return null;
}
