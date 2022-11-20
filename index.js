const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized Access" })
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" })
        }
        req.decoded = decoded;
        next();
    })
}

app.get('/jwt', (req, res) => {
    const email = req.query.email;
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
    res.send({ token });
})

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7r6jn89.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const appointmentOptions = client.db('aurora-dental-care').collection('appointmentOptions');
        const bookingCollection = client.db('aurora-dental-care').collection('bookings');
        const usersCollection = client.db('aurora-dental-care').collection('users');

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

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = usersCollection.find(query);
            const result = await cursor.toArray();
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