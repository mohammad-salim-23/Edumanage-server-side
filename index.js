const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");

require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ipsrkdy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("EduManage").collection("users");
    const teacherCollection = client.db("EduManage").collection("teachers");
    const classCollection = client.db("EduManage").collection("class");
    const paymentCollection = client.db("EduManage").collection("payments");
    const assignmentCollection = client.db("EduManage").collection("assignments");
    const FeedbackCollection = client.db("EduManage").collection("feedbacks");
  //  created middleware
  const verifyToken = (req,res,next)=>{
    console.log("inside verify Token",req.headers);
    if(!req.headers.authorization){
      return res.status(401).send({message:'unauthorized access'})
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
      if(err){
        return res.status(401).send({message:'unauthorized access'})
      }
      req.decoded = decoded;
      next();
     })
    
  }
    const verifyAdmin = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email:email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role==='admin';
      if(!isAdmin){
        return res.status(403).send({message:'forbidden access true'});
      }
      next();
    }

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("jwt...", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // user related api
    app.post('/users',async(req,res)=>{
      const user = req.body;
      user.status = 'user';
      // insert email id users doesn't exist
      const query = {email:user.email};
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        console.log(existingUser);
        return res.send({message:'user already exists',insertedId:null})
      }
      const result = userCollection.insertOne(user);
      res.send(result);
    })
    app.get('/users',async(req,res)=>{
      const result  = await userCollection.find().toArray();
      res.send(result);
    })
    app.get('/users/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      if(email!==req.decoded?.email){
        return res.status(403).send({message:'forbidden access one'});
      }
      const query = {email:email};
      const result = await userCollection.findOne(query);
      res.send(result);
    })
     app.patch('/users/admin/:id',verifyToken,async(req,res)=>{
      const id = req.params.id;
      const filter={_id:new ObjectId(id)};
      const updateDoc = {
        $set:{
          role:'admin'
        }
      }
      const result = await userCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.patch('/users/teacher/:email',verifyToken,async(req,res)=>{
      const id = req.params.id;
      const email = req.params.email;
      const query = {email:email};
      const userFilter={email:email};
      const teacherFilter={email:email};
      const userUpdateDoc = {
        $set:{
          role:'teacher'
        }
      };
      const teacherUpdateDoc = {
        $set: {
          status: 'accepted'
        }
      };
      const userUpdateResult = await userCollection.updateOne(userFilter, userUpdateDoc);

     
      const teacherUpdateResult = await teacherCollection.updateOne(teacherFilter, teacherUpdateDoc);
  
      res.send({userUpdateResult,teacherUpdateResult});
    })
    app.get('/users/admin/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      console.log("email....",email);
      console.log("decoded email...",req.decoded.email);
      if(email!==req.decoded?.email){
        return res.status(403).send({message:'forbidden access one'});
      }
      const query = {email:email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role==='admin'
      }
      res.send({admin});
    })
    app.get('/users/teacher/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      console.log("email....",email);
      console.log("decoded email...",req.decoded.email);
      if(email!==req.decoded?.email){
        return res.status(403).send({message:'forbidden access one'});
      }
      const query = {email:email};
      const user = await userCollection.findOne(query);
      let teacher= false;
      if(user){
        teacher = user?.role==='teacher'
      }
      res.send({teacher});
    })
    app.get('/users/student/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      console.log("email....",email);
      console.log("decoded email...",req.decoded.email);
      if(email!==req.decoded?.email){
        return res.status(403).send({message:'forbidden access one'});
      }
      const query = {email:email};
      const user = await userCollection.findOne(query);
      let student= false;
      if(user){
        student = user?.role==='student'
      }
      res.send({student});
    })
    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })
   
    app.delete('/teachers/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await teacherCollection.deleteOne(query);
      res.send(result);
    })
    app.delete('/users/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // teacher related api
    app.post('/reqTeacher',verifyToken,async(req,res)=>{
      const teacher = req.body;
      const email = req.params.email;
    
      const result = await teacherCollection.insertOne(teacher);
      res.send(result);
    })
    app.get('/teachers',verifyToken,async(req,res)=>{
       const result = await teacherCollection.find().toArray();
       res.send(result);
       
    })
    // class related api
    app.post('/classes',verifyToken,async(req,res)=>{
      const newClass = req.body;
      newClass.enrollment=0;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    })
    app.get('/classes',async(req,res)=>{
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    app.get('/classes/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      const query = {email:email};
      const result = await classCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/class/:id',async(req,res)=>{
      try{
        const id = req.params.id;
        const query = {_id:new ObjectId(id)};
        const result = await classCollection.findOne(query);
        res.send(result);
      }catch(error){
        console.log(error);
      }
    })
    app.delete('/class/:id',verifyToken,async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await classCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/payment/:id',async(req,res)=>{
      try{
        const id = req.params.id;
        const query = {_id:new ObjectId(id)};
        const result = await classCollection.findOne(query);
        res.send(result);
      }catch(error){
        console.log(error);
      }
    })
    app.put('/class/:id',verifyToken,async(req,res)=>{
       const id = req.params.id; 
       const filter = {_id:new ObjectId (id)};
       const options = {upsert:true};
       const updateClass = req.body;
       const Class = {
        $set:{
          title:updateClass.title,
          price:updateClass.price,
          description:updateClass.description,
        
          experience:updateClass.experience,
          category:updateClass.category,


        }
       };
       const result = await classCollection.updateOne(filter,Class,options);
       res.send(result);
    })
    app.patch('/classes/:id',verifyToken,async(req,res)=>{
     
      const id = req.params.id;
      const filter={_id:new ObjectId(id)};
     
     
      const updateDoc = {
        $set:{
          status:'approved'
        }
      }
     
      const result = await classCollection.updateOne(filter,updateDoc);
      res.send(result);
    })
   
    app.get('/conditionalClass', async (req, res) => {
      try {
        const classes = await classCollection.find({ status: 'approved' }).toArray();
        res.send(classes);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    // delete class
    app.delete('/classes/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)};
      const result = await classCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/classes/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      if(email!==req.decoded?.email){
        return res.status(403).send({message:'forbidden access one'});
      }
      const query = {email:email};
      const result = await classCollection.find(query).toArray();
      res.send(result);


    })
   
    // payment intent
    app.post('/create-payment-intent',verifyToken,async(req,res)=>{
     const {price} = req.body;
     
     const amount = parseInt(price*100);

     
      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      });
      res.send({
        clientSecret:paymentIntent.client_secret
      })
    })
    

    app.post('/payments/:id',verifyToken,async(req,res)=>{
      const payment = req.body;
      const id = req.params.id;
      const classQuery = {_id:new ObjectId(id)};
      const updateClass = await classCollection.findOne(classQuery);

          // Ensure enrollment is a number
    let currentEnrollment = updateClass.enrollment;
    if (isNaN(currentEnrollment) || currentEnrollment === undefined) {
      currentEnrollment = 0;
    }
       
    const updateEnrollment = currentEnrollment + 1;
      await classCollection.updateOne(classQuery,{
        $set:{
          enrollment:updateEnrollment,
         
        }
      })
      const paymentResult = await paymentCollection.insertOne(payment);
      if(paymentResult.insertedId){
        const userQuery = { email: payment.email };
        // const updateUserResult = await userCollection.updateOne(userQuery,{
        //   $set:{
        //     role:'student',
        //   }
        // })
      }
      res.send({paymentResult});
     
    })
    app.get('/payments/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      const query = {email:email};
      const payments = await paymentCollection.find(query).toArray();

      const classIds = payments.map(payment=>new ObjectId(payment.classId));
      const classes = await classCollection.find({_id:{$in:classIds}}).toArray();
      res.send(classes);

    })
    // assignment related api
    app.post('/assignments',verifyToken,async(req,res)=>{
      const newAssignment = req.body;
      newAssignment.submission=0;
      const result = await assignmentCollection.insertOne(newAssignment);
      res.send(result);
    })
    app.get("/assignments/:id",verifyToken,async(req,res)=>{
      const id = req.params.id;
      const query = {classId:id};
      const result = await assignmentCollection.find(query).toArray();
      res.send(result);
    })
    
    app.put('/assignments/submit/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      try {
        // Increment the submission count for the assignment
        const result = await assignmentCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { submission: 1 } }
        );
    
        if (result.modifiedCount === 1) {
          res.send({ message: 'Assignment submitted successfully' });
        } else {
          res.status(404).send({ error: 'Assignment not found' });
        }
      } catch (error) {
        res.status(500).send({ error: 'Failed to submit assignment' });
      }
    });
    // evaluation related api
    app.post("/evaluations",verifyToken,async(req,res)=>{
      const newFeedback = req.body;
      const result = await FeedbackCollection.insertOne(newFeedback);
      res.send(result);
    })
    app.get('/with-feedback',async(req,res)=>{
      
     console.log("hello");
       const result = await FeedbackCollection.find().toArray();
       res.send(result);
      
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("EduManage is running");
});
app.listen(port, () => {
  console.log(`EduManage is running on port ${port}`);
});
