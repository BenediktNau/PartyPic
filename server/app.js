const express = require("express");
const app = express();
const port = process.env.PORT || 3500;
const db = require("./database.js");
const cors = require("cors");
const formidable = require("formidable");
const fs = require("fs");

const corsOptions = {
  origin: "http://localhost:3000",
};
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.get("/api", (req, res) => {
  res.send({ message: "Hello from Express!" });
});

app.post("/upload", function (req, res) {
  console.log("BEGIN /upload");
  const form = formidable.formidable({ multiples: false });

  form.parse(req, (err, fields, files) => {
    if (err) {
      next(err);
      return;
    }
    let theFile = files.filepond.path;
    console.log("theFile: " + theFile);

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(theFile);
  });
});

app.post("/save", function (req, res) {
  console.log("BEGIN /save");
  console.log(`req: ${JSON.stringify(req.body.filepond)}`);

});

app.listen(port, () => console.log(`Listening on port ${port}`));
