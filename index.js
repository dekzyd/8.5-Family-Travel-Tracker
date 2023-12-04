import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: "postgres",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

let currentUser = users[0];

// get users from db
async function getUsers() {
  const result = await db.query("SELECT * FROM users");

  let all_users = [];
  result.rows.forEach((user) => {
    all_users.push(user);
  });
  return all_users;
}

// get current user
function getCurrentUser() {
  return users.find((user_data) => user_data.id == currentUserId);
}

// check current user visited countries from db
async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries WHERE user_id = $1",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  try {
    users = await getUsers();
    currentUser = getCurrentUser();
    const countries = await checkVisisted();

    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add == "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    currentUser = getCurrentUser();
    // console.log(currentUser);
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  console.log(req.body);
  try {
    const result = db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id",
      [req.body["name"], req.body["color"]]
    );
    res.redirect("/");
  } catch (error) {
    console.log(error);
    alert("Error adding user");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
