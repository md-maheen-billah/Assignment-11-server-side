const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 9000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();

//Must remove "/" from your production URL
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://savor-oasis.web.app",
      "https://savor-oasis.firebaseapp.com",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xxkyfyl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const addedFoodsCollection = client
      .db("savorOasisDB")
      .collection("addedFoods");
    const purchasedFoodsCollection = client
      .db("savorOasisDB")
      .collection("purchasedFoods");

    // get all addedFoods from DB
    app.get("/allfoods", async (req, res) => {
      const result = await addedFoodsCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Savor Oasis Server ....");
});

app.listen(port, () => console.log(`Server Running on PORT ${port}`));
