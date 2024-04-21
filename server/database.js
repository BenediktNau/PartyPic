const { text } = require("express");
const readline = require("node:readline");
const fs = require("fs");

var sqlite3 = require("sqlite3").verbose();

const DBSOURCE = "db.sqlite";

const initializePrompts = () => {
  var insert = "INSERT INTO prompt (description) VALUES (?)";
  const fileStream = fs.createReadStream("./promptList.txt");
  const rl = readline.createInterface({
    input: fileStream,
    output: process.stdout, // Du kannst dies auch auf einen anderen Stream setzen, z.B. res
    terminal: false, // Damit wird die Eingabe nicht als Terminal betrachtet, sondern als Datei
  });
  rl.on("line", (line) => {
    db.run(insert, [line]);
    console.log(line);
  });
};

let db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    console.log("Connected to the SQLite database.");
    db.run(
      `CREATE TABLE prompt (
        id INTEGER PRIMARY KEY,
        description text
        )`,
      (err) => {
        if (err) {
          console.log("Table Already Exist");
          initializePrompts();
        } else {
          db.run(
            `Delete from prompt; DELETE FROM SQLITE_SEQUENCE WHERE name='prompt'`
          );
          initializePrompts();
        }
      }
    );
    db.run(
      `CREATE TABLE pictures (
        id INTEGER PRIMARY KEY,
        name text,
        promptid INTEGER,
        user text
        )`,
      (err) => {
        if (err) {
          console.log("picture Table Already Exist");
        } else {
          console.log("picture Table Created");
        }
      }
    );
  }
});

module.exports = db;
