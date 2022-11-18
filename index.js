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
            const query = {};
            const result = await appointmentOptions.find(query).toArray();
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
            console.log(result)
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