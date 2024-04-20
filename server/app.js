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
};
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.get("/api", (req, res) => {
  res.send({ message: "Hello from Express!" });
});
app.get("/api/users", (req, res, next) => {
  var sql = "select * from user";
  var params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

app.post("/upload", function (req, res) {
  console.log("BEGIN /upload");
  const form = formidable.formidable({
    multiples: false,
    uploadDir: "/uploads",
    filename: (name, ext, part, form) => {
      return part.originalFilename; // Will be joined with options.uploadDir.
    },
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      return;
    }
    let theFile = files.filepond.path;
    console.log("theFile: " + theFile);
    res.json({ fields, files });
    res.end(theFile);
  });
});

app.post("/save", function (req, res) {
  console.log("BEGIN /save");
  console.log(`req: ${JSON.stringify(req.body.filepond)}`);
});

app.listen(port, () => console.log(`Listening on port ${port}`));


//SQL table with prompts

//Retrieving the table
app.get('/read-file', (req, res) =>{
  const filePath = './promptList';

  const lineReader = readLine.createInterface({
    input: fs.createReadStream(filePath),
  })

  lineReader.on('line', (line) => {
    db.run("INSERT INTO your table (data) VALUES (?)", [line], (err) =>{
      if(err){
        console.error('Error inserting data into database: ', err);
        console.log('Error inserting data into database');
      }
    });
  });

  lineReader.on('close', () =>{
    res.send('File data inserted into database');
    console.log('File data inserted into database');
  });
})

//line Output
app.get('/random-line', (req, res) => {
  db.get('SELECT data FROM prompt ORDER BY RAND() LIMIT 16', (err, row) => {
    if (err) {
      console.error('Error retrieving random line:', err);
      res.status(500).send('Internal server error');
    } else if (!row) {
      res.status(404).send('No data found in the database');
    } else {
      res.send(row.data);
      console.log(row.data)
    }
  }); 
});