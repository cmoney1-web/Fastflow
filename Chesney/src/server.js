import express from "express";
import { RotateCwSquare } from "lucide-react";
import pg from "pg";
const app = express();
const port = 5173;
const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "Restaurant", // the name of the dayabase you are connected too
  password: "Football@12",
  port: 5432, // default port that postgres uses
});
db.connect()
  .then(() => {
    console.log("Connected to PostgreSQL!");
  })
  .catch((err) => {
    console.error("Database connection failed:", err.message);
  });

app.use(express.json());

app.get("/", (req, res) => {
  res.send("chensey is the best suck it please");
});



app.get("/api/restaurants", async (req, res) => {
  // react request this data then it renders it on the page
  const result = await db.query("SELECT * FROM restaurants ORDER BY ID ASC  ");
  try {
    return res.status(200).json(result.rows)
  } catch (error) {
    return res.status(401).json({
      success:false,
      message:"could not receive the restaurants"
    })
  }
});

app.get("/api/restaurants/:id", async (req, res) => { // route returns the restaurant with a id of 2.
  try {
    const restaurant_id = Number(req.params.id); // get the paramanter from the url site please

    if (!Number.isInteger(restaurant_id) || restaurant_id<=0)
    {
      res. status(400).json({
        message: "this is an invalid id please input a valid id"
      })
    }
    const result = await db.query("SELECT * FROM restaurants WHERE id = $1", [
      restaurant_id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});


// Receive requested items → check their format → retrieve database records → check existence, restaurant and availability → return the valid items.


app.get("/api/restaurants/:id/menu", async (req, res) => { // returns all menu to the restaurant belonging to the id of 1
  try {
      const restaurant_id1 = Number(req.params.id)// url parameters are strings so "1" converts into 1

      if (
      !Number.isInteger(restaurant_id1) || // this whole if statement is to check if it is a whole number or not
      restaurant_id1 <= 0 ||
      restaurant_id1 > 2147483647
    ) {
      return res.status(400).json({
        message: "Invalid restaurant ID",
      });
    }
    const result = await db.query(
      "SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY id ",
      [restaurant_id1],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Restaurant not found",
      });

    } else {
      res.status(200).json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.post("/api/restaurants/:id/orders", async (req, res) => {
  let client;
  let transactionStarted = false;
  let connectionError;

  // Stop processing and send the error to catch.
  function rejectOrder(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }

  try {
    // The restaurant comes from the URL.
    const restaurantId = Number(req.params.id);

    if (
      !Number.isInteger(restaurantId) || // checks if it is a whole number
      restaurantId <= 0 ||
      restaurantId > 2147483647
    ) {
      rejectOrder(400, "Invalid restaurant ID");
    }

    // "items": [
    //   {
    //     "menu_item_id": 1,
    //     "quantity": 2
    //   },
    //   {
    //     "menu_item_id": 2,
    //     "quantity": 1
    //   }
    // ]

    // The requested items come from the JSON request body.
    const items = req.body?.items;
    const customerName = req.body?.customer_name;
    const deliveryAddress = req.body?.delivery_address;

    if (!Array.isArray(items) || items.length === 0) {
      // Check if it is an array.
      rejectOrder(400, "Include at least one menu item");
    }

    // Check the customer details before saving an order.
    if (
      typeof customerName !== "string" ||
      !customerName.trim() || //is the name empty after removing the whitespaces? from the beginning of the string and the end
      customerName.trim().length > 150
    ) {
      rejectOrder(400, "Provide a customer name of up to 150 characters");
    }

    if (
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim()
    ) {
      rejectOrder(400, "Provide a delivery address");
    }

    // Validate IDs and quantities before querying the database.
    for (const item of items) {
      // Items is an array, so loop through the items.

      // This if statement rejects missing items or invalid menu item IDs.
      if (
        !item ||
        !Number.isInteger(item.menu_item_id) ||
        item.menu_item_id <= 0 ||
        item.menu_item_id > 2147483647
      ) {
        rejectOrder(400, "Each item needs a valid menu_item_id");
      }

      // Quantity must be a positive whole number.
      // This also checks that it fits PostgreSQL's INTEGER column.
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 2147483647
      ) {
        rejectOrder(400, "Each quantity must be a positive whole number");
      }
    }

    // Borrow one connection for the entire transaction.
    client = await db.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Get the restaurant and its delivery fee.
    const restaurantResult = await client.query(
      `SELECT id, delivery_fee
       FROM restaurants
       WHERE id = $1
       FOR SHARE`,
      [restaurantId]
    );

    if (restaurantResult.rows.length === 0) {
      rejectOrder(404, "Restaurant not found");
    }

    // Collect menu item IDs, rather than the restaurant ID — all of them.
    const itemIds = items.map((item) => item.menu_item_id);

    // FOR SHARE keeps prices and availability stable during this transaction.
    const result = await client.query(
      `SELECT id, restaurant_id, name, price, available
       FROM menu_items
       WHERE id = ANY($1::INTEGER[])
       ORDER BY id
       FOR SHARE`,
      [itemIds]
    );

    const validatedItems = [];

    for (const item of items) {
      // Find the database row matching this requested item.
      const menuItem = result.rows.find(
        (row) => row.id === item.menu_item_id
      );

      console.log(menuItem); // find out what this code means asap

      if (!menuItem) {
        rejectOrder(
          404,
          `Menu item ${item.menu_item_id} does not exist`
        );
      }

      // Checks if the dish belongs to the restaurant.
      if (menuItem.restaurant_id !== restaurantId) {
        rejectOrder(
          400,
          `${menuItem.name} belongs to another restaurant`
        );
      }

      // Checks if the menu item is available or not.
      if (menuItem.available !== true) {
        rejectOrder(
          400,
          `${menuItem.name} is currently unavailable`
        );
      }

      // Keep the database price for the calculation step.
      validatedItems.push({
        menu_item_id: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unit_price: menuItem.price,
      });
    }

    // Calculate after the validation loop finishes.
    let subtotalInCents = 0;

    for (const item of validatedItems) {
      // Convert this item's price into cents.
      // Number converts the string into a number.
      const priceInCents = Math.round(
        Number(item.unit_price) * 100
      );

      // Multiply by quantity and add to the running subtotal.
      subtotalInCents += priceInCents * item.quantity;
    }

    // Adding the delivery fee too.
    const deliveryFeeInCents = Math.round(
      Number(restaurantResult.rows[0].delivery_fee) * 100
    );

    const totalInCents = subtotalInCents + deliveryFeeInCents;

    // Ensure the total fits the database's NUMERIC(10, 2) column.
    if (
      !Number.isSafeInteger(totalInCents) ||
      totalInCents < 0 ||
      totalInCents > 9999999999
    ) {
      rejectOrder(400, "Order total is too large");
    }

    // Convert cents into euro amounts for saving and displaying.
    const subtotal = (subtotalInCents / 100).toFixed(2);
    const deliveryFee = (deliveryFeeInCents / 100).toFixed(2);
    const totalAmount = (totalInCents / 100).toFixed(2);

    console.log(subtotal);

    // Save the overall order and get its generated ID.
    const orderResult = await client.query(
      `INSERT INTO orders (
         restaurant_id,
         customer_name,
         delivery_address,
         delivery_fee,
         total_amount
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, created_at`,
      [
        restaurantId,
        customerName.trim(),
        deliveryAddress.trim(),
        deliveryFee,
        totalAmount,
      ]
    );

    const order = orderResult.rows[0];

    // Save each dish and link it to the new order.
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_items (
           order_id,
           menu_item_id,
           item_name,
           quantity,
           unit_price
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          order.id,
          item.menu_item_id,
          item.name,
          item.quantity,
          item.unit_price,
        ]
      );
    }

    // Everything succeeded, so save all changes together.
    await client.query("COMMIT");
    transactionStarted = false;

    // Send one response after all items have been saved.
    return res.status(201).json({
      message: "Order created successfully",
      order_id: order.id,
      status: order.status,
      items: validatedItems,
      subtotal,
      delivery_fee: deliveryFee,
      total: totalAmount,
      created_at: order.created_at,
    });
  } catch (error) {
    // Undo the transaction if any part failed.
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        connectionError = rollbackError;
        console.error("Rollback failed:", rollbackError);
      }
    }

    console.error(error);

    return res.status(error.status ?? 500).json({
      message: error.status
        ? error.message
        : "Unable to create the order",
    });
  } finally {
    // Return the connection, or discard it if rollback failed.
    if (client) {
      client.release(connectionError);
    }
  }
});

app.get("/api/orders/:id" , async (req , res)=>{// access the details of your order
  const  order_id = Number(req.params?.id)//if doesnt exist it returns an error

  if(!Number.isInteger(order_id) || order_id<0 || order_id>2000000)
  {
     return res.status(400).json({ //return makes express exit the route
      message: "valid orders id input again please"
    })
  }
  try{
    const result=await db.query("SELECT orders.id AS order_id, orders.restaurant_id, orders.customer_name,orders.delivery_address,orders.status, orders.delivery_fee, orders.total_amount, orders.created_at, order_items.menu_item_id, order_items.item_name, order_items.quantity, order_items.unit_price FROM orders LEFT JOIN order_items ON orders.id = order_items.order_id WHERE orders.id = $1 ORDER BY order_items.id;" , [order_id])

    return res.json(result.rows)
  }catch(error)
  {
    return res.status(404).json({
      message:"order does not exist"
    })
  }
});

// this hear is to update the order from the restaurant side
app.patch("/api/orders/:id/status", async(req,res)=>{
  const order_id=Number(req.params?.id)
  const status=req.body?.status

    if(!Number.isInteger(order_id) || order_id<=0 || order_id>2147483647)
  {
     return res.status(400).json({ //return makes express exit the route
      success: false,
      message: "valid orders id input again please"
    })
  }
  // Each current status lists the changes allowed from it.
  const allowedChanges = {
    confirmed: ["preparing", "cancelled"],
    preparing: ["out_for_delivery", "cancelled"], //means an order being prepared can move to either of these statuses
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

    if (
      typeof status !== "string" ||
      !Object.hasOwn(allowedChanges, status)//// Reject if status is not a string or is not a recognised order status.// if the status is cooking that key does not exist
    ) {
    return res.status(400).json({
      success:false,
      message:"provide a valid order status please"
    })
    }

  try { // checks if the orders exist
    const result=await db.query(
      "SELECT id, status FROM orders WHERE id = $1",
      [order_id]
    )
     if (result.rows.length===0) {
      return res.status(404).json({
        success:false,
        message:"order does not exist"
      })
     }
    const currentStatus = result.rows[0].status;

    // Reject skipped stages and changes to delivered or cancelled orders.
    if (!allowedChanges[currentStatus]?.includes(status)) { //allowedChanges[currentStatus] gets the allowed next statuses. If currentStatus is "confirmed", it gives you ["preparing", "cancelled"]..includes(status) checks whether the requested status is in that list.
      return res.status(400).json({
        success: false,
        message: `Cannot change ${currentStatus} to ${status}`,
      });
    }

    // Update only if another request has not already changed the status.
    const updatedResult = await db.query(
      "UPDATE orders SET status = $1 WHERE id = $2 AND status = $3 RETURNING *;",
      [status, order_id, currentStatus]
    );

    if (updatedResult.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "The order changed. Retrieve it again before retrying.",
      });
    }

    return res.status(200).json({
      success: true,
      order: updatedResult.rows[0],
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success:false,
      message: "could not update order"
    })
  }

});

app.get("/api/user", async(req,res)=>{
  const result=await db.query("SELECT * FROM users")
  res.status(200).json(result.rows)

})
 
app.listen(port, () =>
  console.log("> Server is up and running on port : " + port),
);

