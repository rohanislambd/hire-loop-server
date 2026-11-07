import express from "express"
import cors from "cors"
import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json());


app.get("/", (req, res) => {
    res.send({message: "hire loop is looping"})
})

app.listen(PORT, () => {
    console.log(`hire loop is runnig on port ${PORT}`);
})