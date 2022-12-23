const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
// SSLCommerz
const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = process.env.NODE_SSL_STORE_ID
const store_passwd = process.env.NODE_SSL_STORE_PASS
const is_live = false //true for live, false for sandbox
// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Motor Mechanic server is running now ');
});
app.listen(port, () => {
  console.log('motor Mechanic port is running', port);
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.70yiu6o.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// JWT middleware 69-6,7 
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const serviceCollection = client.db('motorMechanic').collection('services');
    const orderCollection = client.db('motorMechanic').collection('orders');

    // get all services for show to UI 67-3 // shorting 70-5_1,2,3. // searching 70-5_4
    app.get('/services', async (req, res) => {
		const search = req.query.search
		console.log(search);
		let query = {};
		if (search.length) {
			query = {
				$text: {
					$search: search
				}
			}

		}
		const order = req.query.order === 'asc' ? 1 : -1;
		const cursor = serviceCollection.find(query).sort({ price: order });
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

    // ============= SSLCommerz Payment Gateway ================
    // create a order when user submit 67-5 // verify 69-8 // SSL 0-5 
    app.post('/orders', verifyJWT, async (req, res) => {
      const order = req.body;
      // const result = await orderCollection.insertOne(order);
      // res.send(result);
      // const { service, email, address } = order;
      // if (!service || !email || !address) {
      //   return res.send({ error: 'Please provide all the information' });
      // }
      const orderedService = await serviceCollection.findOne({_id: ObjectId(order.service), });
      console.log(orderedService);
      //  res.send(orderedService);
      const transactionId = new ObjectId().toString();
      const data = {
        total_amount: orderedService.price,
        currency: order.currency,
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: 'http://localhost:3030/success',
        fail_url: 'http://localhost:3030/fail',
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: order.customer,
        cus_email: order.email,
        cus_add1: order.address,
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: order.postcode,
        ship_country: 'Bangladesh',
    };
    // console.log(data)
    // res.send(data)
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
    sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({ url: GatewayPageURL });
    });
  });

    // orders api 67-6 // get orders from database // verify 69-7
    app.get('/orders', verifyJWT, async (req, res) => {
		const decoded = req.decoded;
		// console.log('inside orders api', decoded)
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: 'unauthorized access' });
      }
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

    // delete a order from UI and db 67-8 // verify 69-8
    app.delete('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // update order status 67-9 // verify 69-8
    app.patch('/orders/:id', verifyJWT, async (req, res) => {
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
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '7d',
      });
      res.send({ token });
    });
  } finally {
  }
}
run().catch((err) => console.error(err));
