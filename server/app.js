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
        `INSERT INTO pictures(name, promptid, user) VALUES("${
          part.originalFilename
        }", ${req.header("id")}, "${req.header("name")}")`
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

//Fetch Prompt
app.get("/getPrompts", (req, res) => {
  db.all(`SELECT * FROM prompt `, (err, rows) => {
    if (!!rows) {
      res.send(rows);
    } else {
      res.send([(id = null), (description = "No Photos found!")]);
    }

  });
});

app.post("/getfotopaths", (req, res) => {
  console.log(req.body.id);
  db.all(
    `SELECT * FROM pictures WHERE promptid = ${Number(req.body.id)}`,
    (err, rows) => {
      var arr = [];
      console.log(rows)
      if (!!rows) {
        rows.forEach((row) => {
          arr.push(row.name);
        });
      }
      res.send(arr);
    }
  );
});

app.get("/images/:imageName", (req, res) => {
  const imageName = req.params.imageName;
  res.sendFile(`/uploads/${imageName}`);
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
