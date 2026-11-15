import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//mongodb database

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const connectedClient = await connectToMongoDB();
const db = connectedClient.db("hireloop");
const usersCollectin = db.collection("user");
const jobsCollection = db.collection("jobs");
const applicationCollection = db.collection("applications");
const paymentCollection = db.collection("payments");

app.get("/", (req, res) => {
  res.send({ message: "hire loop is looping" });
});

//load users
app.get("/users", async (req, res) => {
  const result = await usersCollectin.find({}).toArray();
  res.send(result);
});

//jobs related api
app.post("/jobs", async (req, res) => {
  const job = req.body;
  const result = await jobsCollection.insertOne(job);
  res.send(result);
});

app.get("/jobs", async (req, res) => {
  const query = {};

  console.log("query", req.query);

  if (req.query.jobType) {
    query.jobType = {
      $regex: `^${req.query.jobType}$`,
      $options: "i",
    };
  }

  if (req.query.isRemote) {
    query.isRemote = req.query.isRemote === "true";
  }

  if (req.query.category) {
    query.category = {
      $regex: `${req.query.category}`,
      $options: "i",
    };
  }

  // Search filter
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { company: { $regex: req.query.search, $options: "i" } },
      { responsibilities: { $regex: req.query.search, $options: "i" } },
      { qualifications: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const result = await jobsCollection.find(query).toArray();

  res.send(result);
});

app.get("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobsCollection.findOne(query);
  res.send(result);
});

// delete jobs
app.delete("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// update jobs
app.patch("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const updatedJob = req.body;
  delete updatedJob._id;
  const result = await jobsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedJob },
  );
  res.send(result);
});

//application related api
app.post("/applications", async (req, res) => {
  const application = req.body;
  const result = await applicationCollection.insertOne(application);
  res.send(result);
});

app.get("/applications", async (req, res) => {
  const query = {};

  if (req.query.applicantId) {
    query.userId = req.query.applicantId;
  }
  const result = await applicationCollection.find(query).toArray();
  res.send(result);
});

app.get("/applications/count", async (req, res) => {
  const query = {};

  if (req.query.applicantId) {
    query.userId = req.query.applicantId;
  }
  const count = await applicationCollection.countDocuments(query);
  res.send({ count });
});

// payment releted api
app.post("/payments/checkout-verify", async (req, res) => {
  const { sessionId } = req.body;
  if(!sessionId){
    return res.send({success:false, message:"Session ID is required"})
  }
  const { status, customer_email, metadata, payment_intent, payment_status } =
    await stripe.checkout.sessions.retrieve(sessionId);

  // 1. is used new session
  // 2. check ins the session id for the currently logged in user
  // 3. insert sessionId into the payment collection
  // 4. update user information as premium user

  if (status === "complete" && payment_status === "paid") {

   const sessionQuery = {sessionId};

   const exitingPayment = await paymentCollection.findOne(sessionQuery);
   if(exitingPayment){
    return res.send({success: false, message: "Payment already verified"})
   }

    const payment = {
      sessionId,
      status,
      payment_status,
      userId: metadata.userId,
      payment_date: new Date(),
      payment_intent,
    };
    const result = await paymentCollection.insertOne(payment);
    // update the user table

    const updateDoc = {
      $set: {
        premium: true,
      },
    };
    const updateResult = await usersCollectin.updateOne(
      { _id: new ObjectId(metadata.userId) },
      updateDoc,
    );
    res.send({ success: true, result, updateResult });
    return;
  }
  res.send({ success: false, message: "payment verificaiton failed" });
});

app.listen(PORT, () => {
  console.log(`hire loop is runnig on port ${PORT}`);
});
