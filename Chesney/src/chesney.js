// Express needs this to read JSON sent in a request body.
// Put it before your routes.
app.use(express.json());


// Create an endpoint that accepts a POST request.
//
// Example URL: /api/restaurants/1/orders
// Here, "1" is the restaurant ID.
//
// req = the incoming request from the customer.
// res = the response your server sends back.
//
// async allows us to use "await" for database queries.
app.post("/api/restaurants/:id/orders", async (req, res) => {

    // Try running this code.
    // If something throws an error, execution moves to "catch".
    try {

        // Read the restaurant ID from the URL.
        //
        // URL parameters are strings, so Number() converts it.
        // For example: "1" becomes 1.
        const restaurantId = Number(req.params.id);


        // Check whether the restaurant ID has a valid format.
        //
        // Number.isInteger() checks that it is a whole number.
        // The ! means "not".
        // || means "or".
        //
        // Reject it if:
        // - It is not a whole number.
        // - It is zero or negative.
        // - It exceeds PostgreSQL's INTEGER maximum.
        //
        // This checks the ID's format, not whether the
        // restaurant exists in the database.
        if (
            !Number.isInteger(restaurantId) || // if restaurant id is not an integet
            restaurantId <= 0 ||
            restaurantId > 2147483647
        ) {
            // 400 means the request contains invalid information.
            //
            // json() sends a JSON response.
            //
            // return stops this function, so the rest of the
            // endpoint does not run.
            return res.status(400).json({
                message: "Invalid restaurant ID"
            });
        }


        // Read the "items" property from the request body.
        //
        // Each item should contain:
        // - menu_item_id: which dish the customer wants.
        // - quantity: how many they want.
        //
        // ?. prevents an error if req.body is missing.
        // In that case, items becomes undefined.
        const items = req.body?.items;


        // Make sure items is an array containing at least one item.
        //
        // Array.isArray(items) checks that it is an array.
        // items.length tells us how many entries it contains.
        //
        // If items is not an array, JavaScript skips the second
        // condition because the first condition is already true.
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Include at least one menu item"
            });
        }


        // Go through each item supplied by the customer.
        // First, check the information before using the database.
        for (const item of items) {

            // Reject missing items or invalid menu item IDs.
            //
            // !item catches values such as null.
            // The remaining checks require a positive integer
            // within PostgreSQL's INTEGER range.
            if (
                !item ||
                !Number.isInteger(item.menu_item_id) ||
                item.menu_item_id <= 0 ||
                item.menu_item_id > 2147483647
            ) {
                return res.status(400).json({
                    message: "Each item needs a valid menu_item_id"
                });
            }


            // Quantity must be a positive whole number.
            //
            // Examples:
            // 2   -> valid
            // 0   -> invalid
            // -1  -> invalid
            // 1.5 -> invalid
            // "2" -> invalid because it is a string
            //
            // isSafeInteger also checks that JavaScript can
            // represent the whole number accurately.
            if (
                !Number.isSafeInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                return res.status(400).json({
                    message: "Each quantity must be a positive whole number"
                });
            }
        }


        // Build a new array containing only the menu item IDs.
        //
        // map() visits each item and returns its menu_item_id.
        //
        // For example:
        // Two requested items with IDs 1 and 2 become [1, 2].
        const itemIds = items.map((item) => item.menu_item_id);


        // Ask PostgreSQL for the requested menu items.
        //
        // SELECT chooses the columns we need.
        // FROM chooses the table.
        // WHERE limits which rows are returned.
        //
        // ANY checks whether the row's ID matches any ID
        // in the supplied array.
        //
        // $1 is a parameter placeholder.
        // ::INTEGER[] tells PostgreSQL to treat it as an
        // array of integers.
        //
        // [itemIds] supplies the value for $1.
        // The outer array holds the query's parameters.
        // The inner array contains the menu item IDs.
        //
        // await waits for the database query to finish.
        const result = await db.query(
            `SELECT id, restaurant_id, name, price, available
             FROM menu_items
             WHERE id = ANY($1::INTEGER[])`,
            [itemIds]
        );


        // Create an empty array.
        // We will add items here only after they pass every check.
        const validatedItems = [];


        // Go through the customer's requested items again.
        // Now we can compare them with the database results.
        for (const item of items) {

            // result.rows contains the rows returned by PostgreSQL.
            //
            // find() searches those rows for the requested item ID.
            // === checks that the values and types match.
            //
            // If there is a match, menuItem holds that database row.
            // Otherwise, menuItem is undefined.
            const menuItem = result.rows.find(
                (row) => row.id === item.menu_item_id
            );


            // No matching database row means the item does not exist.
            //
            // 404 means the requested resource was not found.
            //
            // The backticks and ${...} insert the ID into the message.
            if (!menuItem) {
                return res.status(404).json({
                    message: `Menu item ${item.menu_item_id} does not exist`
                });
            }


            // Check that the dish belongs to the restaurant
            // identified in the URL.
            //
            // !== means "not equal".
            //
            // Our current design allows one restaurant per order.
            if (menuItem.restaurant_id !== restaurantId) {
                return res.status(400).json({
                    message: `${menuItem.name} belongs to another restaurant`
                });
            }


            // Check the availability stored in the database.
            // Reject the item unless available is exactly true.
            if (menuItem.available !== true) {
                return res.status(400).json({
                    message: `${menuItem.name} is currently unavailable`
                });
            }


            // This item passed all the checks.
            //
            // push() adds a new object to validatedItems.
            //
            // Take the ID, name and price from the database.
            // Take the quantity from the validated request.
            //
            // We use the database price rather than trusting
            // a price supplied by the customer.
            validatedItems.push({
                menu_item_id: menuItem.id,
                name: menuItem.name,
                quantity: item.quantity,
                unit_price: menuItem.price
            });
        }


        // Reaching here means every requested item passed.
        //
        // 200 means this validation request succeeded.
        //
        // This response is temporary so you can test your checks.
        // No INSERT query has run, so no order has been saved.
        return res.status(200).json({
            message: "All items passed validation. Order not saved yet.",
            items: validatedItems
        });

    } catch (error) {

        // An unexpected error, such as a failed database query,
        // brings execution here.
        //
        // Log the details in your server's terminal.
        console.error(error);


        // Send a general error message to the customer.
        // 500 means an internal server error occurred.
        return res.status(500).json({
            message: "Unable to validate the order"
        });
    }
});