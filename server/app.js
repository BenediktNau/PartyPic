const express = require("express");
const app = express();
const port = process.env.PORT || 3500;
const cors = require("cors");

const corsOptions = {
  origin: "http://localhost:3000",
};

app.use(cors(corsOptions));

app.get("/api", (req, res) => {
  res.send({ message: "Hello from Express!" });
});

app.listen(port, () => console.log(`Listening on port ${port}`));
