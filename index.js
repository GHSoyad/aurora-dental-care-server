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

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7r6jn89.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const appointmentOptions = client.db('aurora-dental-care').collection('appointmentOptions');
        const bookingCollection = client.db('aurora-dental-care').collection('bookings');
        const usersCollection = client.db('aurora-dental-care').collection('users');
        const doctorsCollection = client.db('aurora-dental-care').collection('doctors');

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: "Forbidden Access" })
            }
            next();
        }

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

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const cursor = usersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateUser = {
                $set: {
                    name: user.name,
                    email: user.email
                }
            }
            const result = await usersCollection.updateOne(filter, updateUser, options);
            res.send(result);
        })

        app.patch('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateUser = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateUser);
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send({ isAdmin: result?.role === 'admin' });
        })

        app.post('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const query = { email: doctor.email }
            const checkDoctor = await doctorsCollection.findOne(query);
            if (checkDoctor) {
                return res.send({ message: 'Doctor email exists.' })
            }
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result);
        })

        app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const cursor = doctorsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.delete('/doctors/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await doctorsCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/treatments', async (req, res) => {
            const query = {};
            const cursor = appointmentOptions.find(query).project({ name: 1 });
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