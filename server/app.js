const express = require("express");
const app = express();
const port = process.env.PORT || 3500;
const db = require("./database.js");
const cors = require("cors");
const formidable = require("formidable");
const fs = require("fs");
const { info, Console } = require("console");

const corsOptions = {
  origin: "http://localhost:3000",
  origin: "*",
};
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

//upload Picture
app.post("/upload", async function (req, res) {
  console.log("BEGIN /upload");
  const form = formidable.formidable({
    multiples: false,
    uploadDir: "/uploads",
    filename: (name, ext, part, form) => {
      db.run(
        `INSERT INTO pictures(filepath, promptid, user) VALUES("/uploads/${part.originalFilename}", ${req.header("id")}, "${req.header("name")}")`
      );
      return part.originalFilename; // Will be joined with options.uploadDir.
    },
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      return;
    }
    let theFile = files.filepond.path;
    test = theFile;
    res.json({ fields, files });
    res.end(theFile);
  });
});

app.post("/save", function (req, res) {
  console.log("BEGIN /save");
  console.log(`req: ${JSON.stringify(req.body.filepond)}`);
});

app.listen(port, () => console.log(`Listening on port ${port}`));

//API Give Random Prompt from Promt Database
app.get("/random-line", (req, res) => {
  db.get(`SELECT * FROM prompt ORDER BY RANDOM() `, (err, row) => {
    if (err) {
      console.error("Error retrieving random line:", err);
      res.status(500).send("Internal server error");
    } else if (!row) {
      res.status(404).send("No data found in the database");
    } else {
      var q = { id: row.id, description: row.description };
      res.send(q);
      console.log(q);
    }
  });
});

app.post("/getfotos", (req, res) => {
  const rowsArray = [];
  db.each(
    `SELECT * FROM pictures WHERE promptid = ${req.body.id}`,
    (err, row) => {
      rowsArray.push(row.filepath);
    }
  );
  console.log(rowsArray);
});

//Retrieving promtList.txt
//app.get("/read-file", (req, res) => {
//  const filePath = "./promptList";
//
//  lineReader.on("line", (line) => {
//    db.run("INSERT INTO your table (data) VALUES (?)", [line], (err) => {
//      if (err) {
//        console.error("Error inserting data into database: ", err);
//        console.log("Error inserting data into database");
//      }
//    });
//  });
//
//  lineReader.on("close", () => {
//    res.send("File data inserted into database");
//    console.log("File data inserted into database");
//  });
//});
