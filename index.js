const express = require('express')
const app = express()
const cors = require('cors');
//jwt token verify
const admin = require("firebase-admin");
//dotenv require
require('dotenv').config();
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000

//jwt token
// doctors-portal-firebase-adminsdk.json


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// const serviceAccount = require('./doctors-portal-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bm6uk.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// console.log(uri)
//jwt token verify on server
async function verifyToken(req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];
  
  try{
    const decodedUser = await admin.auth().verifyIdToken(token);
    req.decodedEmail = decodedUser.email;
  }
  catch{

  }

  }
  next();
}

async function run() {
    try {
        await client.connect();
        //console.log('Database connected successfully');
      const database = client.db('doctors_portal');
      const appointmentsCollection = database.collection('appointments');
      //module-73#2
      const usersCollection = database.collection('users');


      //load appointments from api based on user email#7
      app.get('/appointments',verifyToken, async(req, res) => {
        const email = req.query.email;
         //filter by date
        const date =new Date(req.query.date).toLocaleDateString();     
        //console.log(date)
        const query = { email: email, date: date }
        // console.log(query)

       
  
        const cursor = appointmentsCollection.find(query);
        // const cursor = appointmentsCollection.find({});
        const appointments = await cursor.toArray();
        res.json(appointments);
      })
      //create appointment post & collect client side data
      app.post('/appointments', async(req, res) =>{
        const appointment = req.body;
        // console.log(appointment); res.json({message : 'Not so good'})
        const result = await appointmentsCollection.insertOne(appointment);
        console.log(result);
       res.json(result);
      })
//modules-73#6[one admin added with other email person easy]
      app.get('/users/:email', async(req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if(user?.role === 'admin'){
         isAdmin= true;
        }
        res.json({ admin: isAdmin });
      })

      //module-73#2
      //user to the database
      app.post('/users',async(req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        console.log(result);
        res.json(result);

      });
       //module-73#2
       //backend data ke update 
       app.put('/users', async(req, res) => {
         const user = req.body;
        //  console.log('put', user);
         const filter = {email: user.email}
          // this option instructs the method to create a document if no documents match the filter
         const options = { upsert: true };
            // create a document that sets update
         const updateDoc = {$set: user};
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        console.log(result);
        res.json(result);
      
       });

       //module-73#5[make admin page]
       app.put('/users/admin', verifyToken, async(req, res) => {
         const user= req.body;
        //  console.log('decodedEmail', req.decodedEmail);
         const requester = req.decodedEmail;
         if(requester){
           const requesterAccount = await usersCollection.findOne({email:
          requester});
          if(requesterAccount.role === 'admin'){
            const filter = { email: user.email };
            const updateDoc = {$set: {role: 'admin'}};
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
          }
         }
         
        //  console.log('put', req.headers.authorization);
        //  console.log('put', user);
        //  const filter = { email: user.email };
        //  const updateDoc = {$set: {role: 'admin'}};
        //  const result = await usersCollection.updateOne(filter, updateDoc);
        //  res.json(result);
        else{
          res.status(403).json({message: 'you do not have access to make admin '}
          )
        }
       })







//Api name convention-
//app.get('/users')
//app.post('/users')
//app.get('/users/:id')
//app.delete('/users/:id')
//app.put('/users/:id')
 
//users : get
      //users : post
     

   
   
   
    } 
    finally {
      //await client.close();
    }
  }
  run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Doctor Portal!')
})

app.listen(port, () => {
  console.log(`listening at ${port}`)
})