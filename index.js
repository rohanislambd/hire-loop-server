import express from "express"
import cors from "cors"
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
const app = express();
const PORT = process.env.PORT || 5000;

//middleware
app.use(cors())
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
const connectedClient = await connectToMongoDB()
const db = connectedClient.db("hireloop");
const usersCollectin = db.collection("user")
const jobsCollection = db.collection("jobs")

app.get("/", (req, res) => {
    res.send({message: "hire loop is looping"})
})

//load users
app.get("/users", async(req, res) => {
    const result = await usersCollectin.find({}).toArray()
    res.send(result) 
})

//jobs related api
app.post("/jobs", async(req, res) => {
  const job = req.body;
  const result = await jobsCollection.insertOne(job);
  res.send(result)
})


app.get("/jobs", async (req, res) => {
  const query = {};

  console.log("query", req.query);

  if (req.query.jobType) {
    query.jobType = req.query.jobType;
  }

  if (req.query.isRemote) {
    query.isRemote = req.query.isRemote === "true";
  }

  // Search filter
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { responsibilities: { $regex: req.query.search, $options: "i" } },
      { qualifications: { $regex: req.query.search, $options: "i" } }
    ];
  }

  const result = await jobsCollection.find(query).toArray();

  res.send(result);
});


// delete jobs
app.delete("/jobs/:id", async(req, res) => {
    const id = req.params.id;
    const result = await jobsCollection.deleteOne({_id: new ObjectId (id)});
    res.send(result);
})


// update jobs
app.patch("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const updatedJob = req.body;
  delete updatedJob._id;
  const result = await jobsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedJob }
  );
  res.send(result);
});


app.listen(PORT, () => {
    console.log(`hire loop is runnig on port ${PORT}`);
})