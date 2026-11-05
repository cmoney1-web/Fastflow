import bcrypt from "bcrypt";

// Register auth routes on the main server using its existing PostgreSQL pool.
export function addAuthRoutes(app, db) {
  const saltRounds = 10;

  // Both login and protected routes use the same username and password check.
  async function checkCredentials(username, password) {
    if (!username || !password || Buffer.byteLength(password, "utf8") > 72) {
      return null;
    }

    const result = await db.query(
      "SELECT id, username, password FROM users WHERE username = $1",
      [username]
    );
    const user = result.rows[0];

    // bcrypt compares the supplied password with the saved hash.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return null;
    }

    // Only pass public account details to the route.
    return { id: user.id, username: user.username };
  }

  async function requireAuth(req, res, next) { // this is the middleware function here
    res.set("Cache-Control", "no-store");
    try {
      // Postman sends "Basic" followed by the encoded username and password.
      const [scheme, encoded] = (req.get("Authorization") ?? "").split(" ");

      if (scheme.toLowerCase() === "basic" && encoded) {
        const credentials = Buffer.from(encoded, "base64").toString("utf8");
        const separator = credentials.indexOf(":");

        // Split on the first colon so the password can contain colons.
        if (separator > 0) {
          const username = credentials.slice(0, separator);
          const password = credentials.slice(separator + 1);
          const user = await checkCredentials(username, password);

          if (user) {
            // Give the next route access to the verified user.
            req.user = user;
            return next();
          }
        }
      }

      res.set("WWW-Authenticate", 'Basic realm="FoodFlow", charset="UTF-8"');
      return res.status(401).json({
        success: false,
        message: "Enter a valid username and password using Basic Auth.",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Could not check your credentials.",
      });
    }
  }

  // requireAuth runs first. The route only runs after the credentials pass.
  app.get("/api/user", requireAuth, (req, res) => {
    return res.status(200).json(req.user);
  });



  //authentication api for login in and regerstering
  app.post("/api/register", async (req, res) => {
    const username = req.body?.username;
    const password = req.body?.password;

    if (typeof username !== "string" || !username ||
        typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    if (!username.trim() || username.length > 100 || username.includes(":") || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Use a username of up to 100 characters without colons and a password of up to 72 bytes.",
      });
    }

    try {
      const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
        username,
      ]);

      if (checkResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "username already exists try to login",
        });
      }

      // Hash the password before saving it
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      await db.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
        username,
        hashedPassword,
      ]);

      return res.status(200).json({
        success: true,
        message: "ting has been created",
      });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ success: false, message: "Username already exists." });
      }
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "registration failed try again ",
      });
    }
  });

  // LOGIN
  app.post("/api/login", async (req, res) => {
    const username = req.body?.username;
    const password = req.body?.password;

    if (typeof username !== "string" || !username ||
        typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    try {
      const user = await checkCredentials(username, password);

      if (user) {
        return res.status(200).json({
          success: true,
          message: "Login successful.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Wrong username or password. Try again.",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Login failed.",
      });
    }
  });

  return requireAuth;
}
