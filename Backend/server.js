require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error(err));

// --- SCHEMAS ---
const vehicleSchema = new mongoose.Schema({
    type: String, price: String, phone: String, village: String,
    lat: Number, lng: Number, image: String,
    available: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 }
});

const bookingSchema = new mongoose.Schema({
    customerPhone: String, ownerPhone: String, vehicleType: String,
    village: String, date: String, time: String,
    status: { type: String, default: 'Pending' },
    rated: { type: Boolean, default: false }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// --- UPLOAD ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use('/uploads', express.static(UPLOAD_DIR));
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- DISTANCE HELPER ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- ROUTES ---

// 1. Accept/Reject Booking
app.patch('/booking-action/:id', async (req, res) => {
    const { status } = req.body;
    const b = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(b);
});

// 2. Toggle Availability
app.patch('/vehicle-status/:id', async (req, res) => {
    const v = await Vehicle.findById(req.params.id);
    v.available = !v.available;
    await v.save();
    res.json(v);
});

// 3. Rating System
app.post('/rate-vehicle', async (req, res) => {
    const { vehicleId, bookingId, rating } = req.body;
    const v = await Vehicle.findById(vehicleId);
    v.rating = ((v.rating * v.totalRatings) + rating) / (v.totalRatings + 1);
    v.totalRatings += 1;
    await v.save();
    await Booking.findByIdAndUpdate(bookingId, { rated: true });
    res.json({ message: "Rated!" });
});

app.post('/register', upload.single('image'), async (req, res) => {
    const imageUrl = req.file ? `https://vehicle-setu-backend.onrender.com/uploads/${req.file.filename}` : "";
    const newV = new Vehicle({ ...req.body, image: imageUrl, lat: parseFloat(req.body.lat), lng: parseFloat(req.body.lng) });
    await newV.save();
    res.json({ message: "Success" });
});

app.get('/search', async (req, res) => {
    const { type, userLat, userLng, maxDist } = req.query;
    const vehicles = await Vehicle.find({ type: { $regex: new RegExp(type, 'i') }, available: true });
    const withDist = vehicles.map(v => ({
        ...v._doc, distance: parseFloat(getDistance(userLat, userLng, v.lat, v.lng).toFixed(1)), id: v._id
    })).filter(v => v.distance <= maxDist).sort((a,b) => a.distance - b.distance);
    res.json(withDist);
});

app.post('/book', async (req, res) => {
    const newB = new Booking(req.body);
    await newB.save();
    res.json(newB);
});

app.get('/owner-data', async (req, res) => {
    const { phone } = req.query;
    const vehicles = await Vehicle.find({ phone });
    const bookings = await Booking.find({ ownerPhone: phone }).sort({ _id: -1 });
    res.json({ vehicles, bookings });
});

app.get('/customer-data', async (req, res) => {
    const { phone } = req.query;
    const bookings = await Booking.find({ customerPhone: phone }).sort({ _id: -1 });
    res.json({ bookings });
});

app.listen(5000, () => console.log("🚀 Server Ready"));