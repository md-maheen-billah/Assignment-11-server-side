const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 9000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
app.use(cookieParser());

// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).send({ message: "unauthorized access" });
      }
      req.user = decoded;
      next();
    });
  }
};

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
    const galleryCollection = client.db("savorOasisDB").collection("gallery");

    // jwt generate
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // clear token on logout
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // get all addedFoods from DB
    app.get("/allfoods", async (req, res) => {
      let query = {};
      if (req.query.search) {
        // Construct the query with $regex if search query exists
        query = {
          foodName: { $regex: req.query.search, $options: "i" },
        };
      }
      const result = await addedFoodsCollection.find(query).toArray();
      res.send(result);
    });

    // get all gallery photos from DB
    app.get("/gallery", async (req, res) => {
      const result = await galleryCollection.find().toArray();
      res.send(result);
    });

    // get all addedFoods posted by specific user from DB
    app.get("/allfoods/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { sellerEmail: email };
      const result = await addedFoodsCollection.find(query).toArray();
      res.send(result);
    });

    // get all purchasedFoods posted by specific user from DB
    app.get("/purchases/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { buyerEmail: email };
      const result = await purchasedFoodsCollection.find(query).toArray();
      res.send(result);
    });

    // get food details from DB using food id
    app.get("/food-details/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await addedFoodsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // save purchase data in DB
    app.post("/purchases", async (req, res) => {
      const purchaseData = req.body;
      const result = await purchasedFoodsCollection.insertOne(purchaseData);
      res.send(result);
    });

    // delete purchase data in DB
    app.delete("/delete-purchases/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchasedFoodsCollection.deleteOne(query);
      res.send(result);
    });

    // delete food data in DB
    app.delete("/delete-food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addedFoodsCollection.deleteOne(query);
      res.send(result);
    });

    // delete purchase data when food data is deleted in DB
    app.delete("/delete-purchases-food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { foodId: id };
      const result = await purchasedFoodsCollection.deleteOne(query);
      res.send(result);
    });

    // save addFood data in DB
    app.post("/allfoods", async (req, res) => {
      const addData = req.body;
      const result = await addedFoodsCollection.insertOne(addData);
      res.send(result);
    });

    // save gallery data in DB
    app.post("/gallery", async (req, res) => {
      const addData = req.body;
      const result = await galleryCollection.insertOne(addData);
      res.send(result);
    });

    // make changes to quantity and count number based on purchases
    app.patch("/purchase-changes/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const filter = { _id: new ObjectId(id) };
      const result = await addedFoodsCollection.updateOne(filter, {
        $inc: {
          quantity: -updatedBooking.quantityBought,
          count: updatedBooking.quantityBought,
        },
      });
      res.send(result);
    });

    // make changes to quantity and count number based on purchases deletion
    app.patch("/delete-changes/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const filter = { _id: new ObjectId(id) };
      const result = await addedFoodsCollection.updateOne(filter, {
        $inc: {
          quantity: updatedBooking.quantityBought,
          count: -updatedBooking.quantityBought,
        },
      });
      res.send(result);
    });

    // update existing added foods
    app.put("/update-foods/:id", async (req, res) => {
      console.log(req.params.id);
      const query = { _id: new ObjectId(req.params.id) };
      const options = { upsert: true };
      const foodData = req.body;
      const data = {
        $set: {
          ...foodData,
        },
      };
      const result = await addedFoodsCollection.updateOne(query, data, options);
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
