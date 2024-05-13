const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("CRUD Server is running");
});

app.listen(port, () => {
  console.log(`CRUD Server is running ${port}`);
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.buwy59t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const queryCollection = client
      .db("alternativeproductDB")
      .collection("queries");

    app.get("/queries", async (req, res) => {
      const cursor = queryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/queries/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.findOne(query);
      res.send(result);
    });

    app.get("/queriesByEmail/:email", async (req, res) => {
      const email = req.params.email;
    
      // Define the query to search for documents
      const query = { userEmail: email };
    
      const options = {
        sort: { currentDateAndTime: -1 }
      };
    
      const cursor = queryCollection.find(query, options);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/queries", async (req, res) => {
      const newQuery = req.body;
      const result = await queryCollection.insertOne(newQuery);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
