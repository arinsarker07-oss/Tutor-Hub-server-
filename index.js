const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config()

const app = express()
const uri = process.env.MONGODB_URI
const port = process.env.PORT;

app.use(cors())
app.use(express.json())
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db("TutorHub")
    // create collection tutor details
    const TutorDetailsCollection = db.collection("TutorDetails")
    // create collection booking
    const bookingCollection = db.collection("bookings")

    // post all details
    app.post("/TutorDetails", async (req, res) => {
      const TutorDetails = req.body
      const result = await TutorDetailsCollection.insertOne(TutorDetails)
      res.json(result)
    })
    //  get all details in tutors page 
    app.get("/TutorDetails", async (req, res) => {
      const result = await TutorDetailsCollection.find().toArray()
      res.json(result)
    })
    // get tutor details in home page 
    app.get("/TutorDetail", async (req, res) => {
      const result = await TutorDetailsCollection.find().limit(6).toArray()
      res.json(result)
    })
    // get tutor details in details page 
    app.get("/TutorDetails/:id", async (req, res) => {
      const { id } = req.params
      const result = await TutorDetailsCollection.findOne({ _id: new ObjectId(id) })
      res.json(result)
    })
    // add tutor page
    app.get("/my-tutors/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await TutorDetailsCollection.find(query).toArray();
      res.send(result);
    });

    // UPDATE TUTOR
    app.patch('/update-tutor/:id', async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      // Your MongoDB update logic here
      const result = await TutorDetailsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    // delete 
    app.delete('/delete-tutor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await TutorDetailsCollection.deleteOne(query);
      res.send(result);
    });

    //  booking data create
    app.post('/booking', async (req, res) => {
      const bookingData = req.body
      const result = await bookingCollection.insertOne(bookingData)
      res.json(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("start")

})
app.listen(port, () => {
  console.log("server running ");

})

