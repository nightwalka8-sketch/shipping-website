const express = require("express");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "mysecretkey";

/* ================= DATABASE ================= */
mongoose.connect("mongodb://127.0.0.1:27017/shippingDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

/* ================= MODELS ================= */

// USER
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});
const User = mongoose.model("User", userSchema);

// INVOICE
const invoiceSchema = new mongoose.Schema({
    name: String,
    address: String,
    item: String,
    price: Number,
    tracking: String,
    status: String,
    date: String
});
const Invoice = mongoose.model("Invoice", invoiceSchema);

/* ================= AUTH ================= */

// REGISTER
app.post("/register", async (req, res) => {
    const hashed = await bcrypt.hash(req.body.password, 10);

    const user = new User({
        username: req.body.username,
        password: hashed
    });

    await user.save();
    res.json("User created");
});

// LOGIN
app.post("/login", async (req, res) => {
    const user = await User.findOne({ username: req.body.username });

    if (!user) return res.send("User not found");

    const valid = await bcrypt.compare(req.body.password, user.password);
    if (!valid) return res.send("Wrong password");

    const token = jwt.sign({ id: user._id }, SECRET);
    res.json({ token });
});

/* ================= CREATE INVOICE ================= */
app.post("/create-invoice", async (req, res) => {
    const { name, address, item, price } = req.body;

    const invoice = new Invoice({
        name,
        address,
        item,
        price,
        tracking: "NW-" + Math.floor(Math.random() * 1000000),
        status: "Processing",
        date: new Date().toLocaleDateString()
    });

    await invoice.save();
    res.json(invoice);
});

/* ================= GET ALL ================= */
app.get("/invoices", async (req, res) => {
    const invoices = await Invoice.find();
    res.json(invoices);
});

/* ================= TRACK ================= */
app.get("/track/:code", async (req, res) => {
    const data = await Invoice.findOne({ tracking: req.params.code });

    if (!data) return res.send("Tracking not found");

    res.json(data);
});

/* ================= PDF ================= */
app.get("/invoice/:id", async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) return res.send("Invoice not found");

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${invoice._id}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(22).text("Night Walka Shipping Co.", { align: "center" });
    doc.moveDown();

    doc.fontSize(16).text("Shipping Invoice", { align: "center" });
    doc.moveDown(2);

    doc.text(`Invoice ID: ${invoice._id}`);
    doc.text(`Date: ${invoice.date}`);
    doc.moveDown();

    doc.text(`Customer: ${invoice.name}`);
    doc.text(`Address: ${invoice.address}`);
    doc.moveDown();

    doc.text("Item Details", { underline: true });
    doc.moveDown();

    doc.text(`Item: ${invoice.item}`);
    doc.text(`Price: $${invoice.price}`);

    doc.moveDown(2);
    doc.fontSize(14).text(`Total: $${invoice.price}`, { align: "right" });

    doc.moveDown(4);
    doc.fontSize(10).text("Thank you for choosing Night Walka Shipping!", {
        align: "center"
    });

    doc.end();
});

/* ================= SERVER ================= */
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});