const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
// middlewares
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Motor Mechanic server is running now ');
});
app.listen(port, () => {
  console.log('motor Mechanic port is running', port);
});

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.70yiu6o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// function verifyJWT(req, res, next){
//     const authHeader = req.headers.authorization;

//     if(!authHeader){
//         return res.status(401).send({message: 'unauthorized access'});
//     }
//     const token = authHeader.split(' ')[1];

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
//         if(err){
//             return res.status(403).send({message: 'Forbidden access'});
//         }
//         req.decoded = decoded;
//         next();
//     })
// }

async function run() {
	try {
	  const serviceCollection = client.db('motorMechanic').collection('services');
	  const orderCollection = client.db('motorMechanic').collection('orders');
  
	  // get all services for show to UI 67-3
	  app.get('/services', async (req, res) => {
		const query = {};
		const cursor = serviceCollection.find(query);
		const services = await cursor.toArray();
		res.send(services);
	  });
  // get one service (specific) with service id 67-3
	  app.get('/services/:id', async (req, res) => {
		const id = req.params.id;
		const query = { _id: ObjectId(id) };
		const service = await serviceCollection.findOne(query);
		res.send(service);
	  });
// create a order when user submit 67-5
	  app.post('/orders', async (req, res) => {
		const order = req.body;
		const result = await orderCollection.insertOne(order);
		res.send(result);
	  });
  
	  // orders api 67-6 // get orders from database
	  app.get('/orders', async (req, res) => {
		let query = {};
		if (req.query.email) {
		  query = {
			email: req.query.email,
		  };
		}
		const cursor = orderCollection.find(query);
		const orders = await cursor.toArray();
		res.send(orders);
	  });

	  // delete a order from UI and db 67-8
	  app.delete('/orders/:id', async (req, res) => {
		const id = req.params.id;
		const query = { _id: ObjectId(id) };
		const result = await orderCollection.deleteOne(query);
		res.send(result);
	  });
  
  // update order status 67-9
	  app.patch('/orders/:id', async (req, res) => {
		const id = req.params.id;
		const status = req.body.status;
		const query = { _id: ObjectId(id) };
		const updatedDoc = {
		  $set: {
			status: status,
		  },
		};
		const result = await orderCollection.updateOne(query, updatedDoc);
		res.send(result);
	  });

	  // JWT 69-5
	  app.post('/jwt', (req, res) =>{
		const user = req.body;
		const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '7d'})
		res.send({token})
	})

	} finally {
	}
  }
  run().catch((err) => console.error(err));