const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();


app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7r6jn89.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const appointmentOptions = client.db('aurora-dental-care').collection('appointmentOptions');
        const bookingCollection = client.db('aurora-dental-care').collection('bookings');

        app.get('/appointmentsOptions', async (req, res) => {
            const date = req.query.date;
            const query = {};
            const options = await appointmentOptions.find(query).toArray();
            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingCollection.find(bookingQuery).toArray();

            options.forEach(option => {
                const treatmentsBooked = alreadyBooked.filter(booked => booked.treatment === option.name);
                const slotsBooked = treatmentsBooked.map(booked => booked.appointmentTime);
                const remainingSlots = option.slots.filter(slot => !slotsBooked.includes(slot))
                option.slots = remainingSlots;
            })
            res.send(options)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                userEmail: booking.userEmail,
                appointmentDate: booking.appointmentDate,
                treatment: booking.treatment
            };

            const previousBooking = await bookingCollection.find(query).toArray();

            if (previousBooking.length) {
                const message = `Already have a booking on ${booking.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

    }
    finally { }
}

run().catch(error => console.log(error))

app.get('/', (req, res) => {
    res.send('Server is running!!')
})

app.listen(port, () => {
    console.log('Listening on port', port)
})