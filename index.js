import express from "express"
import cors from "cors"
import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json());

//mongodb database
import { MongoClient } from 'mongodb';

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

app.listen(PORT, () => {
    console.log(`hire loop is runnig on port ${PORT}`);
})