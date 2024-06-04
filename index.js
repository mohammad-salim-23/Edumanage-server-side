const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
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
    await client.connect();
    const userCollection = client.db("EduManage").collection("users");
    const teacherCollection = client.db("EduManage").collection("teachers");
    const classCollection = client.db("EduManage").collection("class");
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
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    })
    app.get('/classes',verifyToken,async(req,res)=>{
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    app.patch('/classes/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      const query = {email:email};
     
      const updateDoc = {
        $set:{
          status:'approved'
        }
      }
      const filter={email:email};
      const result = await userCollection.updateOne(filter,updateDoc);
      res.send(result);
    })
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
