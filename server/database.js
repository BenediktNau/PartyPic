var sqlite3 = require("sqlite3").verbose();

const DBSOURCE = "db.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");
    db.run(
      `CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username text, 
            password text UNIQUE
            )`,
      (err) => {
        if (err) {
          console.log("Table Already Exist");
        } else {
          console.log("Hallo");
          var insert = "INSERT INTO user (username, password) VALUES (?,?)";
          db.run(insert, ["admin", "password"]);
        }
      }
    );
  }
});

module.exports = db;
