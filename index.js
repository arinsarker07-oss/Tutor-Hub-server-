// done 
const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config()

const app = express()
const uri = process.env.MONGODB_URI
const port = process.env.PORT || 8000; // fallback port set to 8000 if not specified

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// jwt token function 
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ message: "unauthorized" })
  }
  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).json({ message: "unauthorized" })
  }
  try {
    const { payload } = await jwtVerify(token, JWKS)
    console.log(payload);
    next()
  } catch (error) {
    return res.status(401).json({ message: "Forbidden" })
  }

}

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

async function run() {
  try {
    // await client.connect();

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

    // get all details in tutors page 
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
    app.get("/TutorDetails/:id", verifyToken, async (req, res) => {
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
      const result = await TutorDetailsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    // delete tutor
    app.delete('/delete-tutor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await TutorDetailsCollection.deleteOne(query);
      res.send(result);
    });

    // booking data create and update tutor slots
    app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body;
      const tutorId = bookingData.tutor_id;

      try {
        // 1. First check if the tutor has available slots
        const tutor = await TutorDetailsCollection.findOne({ _id: new ObjectId(tutorId) });

        // Convert total_slots to an integer in case it is stored as a string
        const currentSlots = parseInt(tutor.total_slots) || 0;

        if (currentSlots <= 0) {
          return res.status(400).json({ success: false, message: "No available slots left." });
        }

        // 2. Insert data into the booking collection
        const bookingResult = await bookingCollection.insertOne(bookingData);

        if (bookingResult.insertedId) {
          // 3. Decrement the tutor's total_slots by 1 after a successful booking
          await TutorDetailsCollection.updateOne(
            { _id: new ObjectId(tutorId) },
            { $inc: { total_slots: -1 } } // Decrementing by 1 using $inc
          );

          res.json({ success: true, message: "Booking successful", bookingResult });
        } else {
          res.status(500).json({ success: false, message: "Failed to create booking" });
        }

      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // booked session by email
    app.get("/booking/:email", async (req, res) => {
      const email = req.params.email;
      const query = { student_email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // delete booking and restore tutor slot
    app.delete('/booking/:id',verifyToken, async (req, res) => {
      const id = req.params.id;

      try {
        // 1. Find the booking data first to retrieve the tutor_id before deletion
        const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });

        if (!booking) {
          return res.status(404).json({ success: false, message: "Booking not found" });
        }

        const tutorId = booking.tutor_id;

        // 2. Delete the record from the booking collection
        const deleteResult = await bookingCollection.deleteOne({ _id: new ObjectId(id) });

        if (deleteResult.deletedCount === 1) {
          // 3. Increment the corresponding tutor's total_slots by 1 after successful deletion
          if (tutorId) {
            await TutorDetailsCollection.updateOne(
              { _id: new ObjectId(tutorId) },
              { $inc: { total_slots: 1 } } // Incrementing by 1 using $inc
            );
          }

          res.json({ success: true, message: "Booking deleted and slot updated successfully" });
        } else {
          res.status(500).json({ success: false, message: "Failed to delete booking" });
        }

      } catch (error) {
        console.error("Error in delete booking route:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // await client.db("admin").command({ ping: 1 });
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
  console.log(`server running on port ${port}`);
})