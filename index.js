const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://swapitright-5c4cc.web.app',
    'https://swapitright-5c4cc.firebaseapp.com'
  ],
  credentials: true
}));

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

const verifyToken = (req,res,next) =>{
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token);
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
    if(err)
      {
        return res.status(401).send({message:'unauthorized access'})
      }
      req.user = decoded;
      next();
  })
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const queryCollection = client
      .db("alternativeproductDB")
      .collection("queries");

    const recommendationCollection = client
      .db("alternativeproductDB")
      .collection("recommendations");


    app.post('/jwt', async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: '1h'
      });
      res.cookie('token', token,cookieOptions).send({success: true});
    })

    app.post("/logout", async(req,res)=>{
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie('token', {...cookieOptions, maxAge:0}).send({success: true});
    });

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

    app.get("/recommendations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { queryId: id };
      const cursor = recommendationCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/recommendationsByEmail/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if(req.user.email !== email)
        {
          return res.status(403).send({message:'forbidden access'})
        }
    
      // Define the query to search for documents
      const query = { recommenderEmail: email };
      const cursor = recommendationCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/recommendationsForEmail/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if(req.user.email !== email)
        {
          return res.status(403).send({message:'forbidden access'})
        }
    
      // Define the query to search for documents
      const query = { userEmail: email };
      const cursor = recommendationCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/queriesByEmail/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if(req.user.email !== email)
        {
          return res.status(403).send({message:'forbidden access'})
        }
    
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

    app.post("/recommendations", async (req, res) => {
      const newRecommendation = req.body;
      const result = await recommendationCollection.insertOne(newRecommendation);
      const queryId = new ObjectId(newRecommendation.queryId);
      const updateResult = await queryCollection.updateOne(
        { _id: queryId },
        { $inc: { recommendationCount: 1 } }
      );
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedQuery = req.body;
      const updateDoc = {
        $set: {
          productName: updatedQuery.productName,
          productBrand: updatedQuery.productBrand,

          productImageURL: updatedQuery.productImageURL,

          queryTitle: updatedQuery.queryTitle,

          alternationReason: updatedQuery.alternationReason,
        },
      };

      const result = await queryCollection.updateOne(filter,updateDoc,options);
      res.send(result);
    });


    app.delete("/queries/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/recommendations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { queryId: id };
      const result = await recommendationCollection.deleteOne(query);
      const queryId = new ObjectId(id);
      const updateResult = await queryCollection.updateOne(
        { _id: queryId },
        { $inc: { recommendationCount: -1 } }
      );
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
