const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path'); // ✅ ADDED

const User = require('./user');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==========================
// 🔐 SECRET KEY
// ==========================
const SECRET = "mysecretkey";

// ==========================
// 🔥 MONGODB CONNECTION
// ==========================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: "shippingDB"
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// ==========================
// 📦 SHIPMENT SCHEMA
// ==========================
const ShipmentSchema = new mongoose.Schema({
  tracking: String,
  customer: String,
  address: String,
  item: String,
  price: Number,
  status: { type: String, default: 'Processing' }
});

const Shipment = mongoose.model('Shipment', ShipmentSchema);

// ==========================
// 🔐 AUTH MIDDLEWARE
// ==========================
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ==========================
// 👤 REGISTER
// ==========================
app.post('/register', async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  const user = new User({
    username: req.body.username,
    password: hashed
  });

  await user.save();
  res.json("User created");
});

// ==========================
// 🔑 LOGIN
// ==========================
app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(400).send("Wrong password");

  const token = jwt.sign({ id: user._id }, SECRET);
  res.json({ token });
});

// ==========================
// 📦 CREATE SHIPMENT
// ==========================
app.post('/create', async (req, res) => {
  const { customer, address, item, price } = req.body;
  const tracking = 'NW-' + Math.floor(Math.random() * 1000000);

  const shipment = new Shipment({ tracking, customer, address, item, price });
  await shipment.save();

  res.json({ tracking });
});

// ==========================
// 🔍 TRACK SHIPMENT
// ==========================
app.get('/track/:tracking', async (req, res) => {
  const shipment = await Shipment.findOne({ tracking: req.params.tracking });
  res.json(shipment);
});

// ==========================
// 📊 PROTECTED DASHBOARD
// ==========================
app.get('/all', auth, async (req, res) => {
  const shipments = await Shipment.find();
  res.json(shipments);
});

// ==========================
// 🌐 SERVE FRONTEND (THIS IS WHAT YOU NEEDED)
// ==========================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================
// 🚀 START SERVER
// ==========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => console.log('Server running on port ' + PORT));