const express = require("express");
const app = express();
app.use(require("cors")());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "NEOS funciona", timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
    console.log(" NEOS en http://localhost:3000");
});
