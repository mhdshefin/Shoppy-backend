const express = require('express')
const app = express()
const mongoose = require("mongoose")
const JWT = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const cors = require('cors')
const { error } = require('console')
const env = require('dotenv')
env.config()

const port = process.env.PORT || 3000 ;

app.use(express.json())
console.log(process.env.mongodb_URL);

const cors = require('cors');
app.use(cors({
    origin: 'https://shoppy-frontend.onrender.com', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    credentials: true 
}));



// Database connection with MongoDB 

mongoose.connect(process.env.mongodb_URL)
    .then(() => {
        console.log('Database connected to mongoDB');
        app.listen(port ,(err) => {
            if (!err) {
                console.log("Server runnining on port" + port);
            } else {
                console.log("Error:" + err);
            }
        })
    })
    .catch(() => {
        console.log('Database not connected to mongoDb' + error);

    })    


// API creaction

app.get('/', (req, res) => {
    res.send('Hello World')
})


const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});


const upload = multer({ storage: storage })

// API upload endpoint for images
app.use('/images', express.static('upload/images'))

app.post('/upload', upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `https://shoppy-backend-pt.onrender.com/images/${req.file.filename}`
    })
})

// product schema

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true
    },
    new_price: {
        type: Number,
        required: true
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now
    },
    avilable: {
        type: Boolean,
        default: true
    }
})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({})
    let id;
    if (products.length > 0) {
        let last_Product_Array = products.slice(-1)
        let last_product = last_Product_Array[0]
        id = last_product.id + 1
    } else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    })
    console.log(product);
    await product.save()
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})

// Delete product

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id })
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name,
    })
})

// Creating API for fetching all data

app.get('/allproducts', async (req, res) => {
    let products = await Product.find({})
    res.send(products)
})

// Creating schema for user place order

const orderSchema = new mongoose.model('order', {
    userId: {
        type: String,
        required: true
    },
    items: {

        type: Array,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    address: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        required: true, default: "Order Placed"
    },
    paymentMethod: {
        type: String,
        required: true
    },
    payment: {
        type: Boolean,
        required: true, default: false
    },
    date: {
        type: Number,
        required: true
    }
})



// Creating schema for User

const Users = mongoose.model('Users', {
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Object
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

// Creating user API

app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email })
    if (check) {
        return res.status(400).json({ success: false, error: "Existing user with same email" })
    }
    let cart = {}

    for (let i = 0; i < 300; i++) {
        cart[i] = 0
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })
    await user.save()

    const data = {
        user: {
            id: user.id,
        }
    }

    const token = JWT.sign(data, 'secret_ecom')
    res.json({ success: true, token })
})

// End point creating for user

app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = JWT.sign(data, 'secret_ecom')
            res.json({ success: true, token })
        } else {
            res.json({ success: false, error: "Wrong Password" })
        }
    } else {
        res.json({ success: false, error: "Wrong Email Id" })
    }
})

// API creating for newcollections

app.get('/newcollections', async (req, res) => {
    let product = await Product.find({}).sort({ date: -1 }).limit(8)
    res.send(product)
})

// API creating for popular in women

app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" }).limit(4)
    res.send(products)
})

// Creating middleware to fetch user

const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token')
    if (!token) {
        res.status(401).send({ error: "Please authenticate with valid token" })
    } else {
        try {
            const data = JWT.verify(token, 'secret_ecom')
            req.user = data.user;
            next()
        } catch (error) {
            res.status(401).send({ error: "Please authenticate with valid token" })
        }
    }
}

// Creating an endpoint for add to cart

app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Added", req.body.itemId)
    let userData = await Users.findOne({ _id: req.user.id })
    userData.cartData[req.body.itemId] += 1;
    await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: userData.cartData })
    res.send('Added')
})


// Creating an endpoint for remove from cart

app.post('/removefromcart', fetchUser, async (req, res) => {
    console.log("removed", req.body.itemId)
    let userData = await Users.findOne({ _id: req.user.id })
    if (userData.cartData[req.body.itemId])
        userData.cartData[req.body.itemId] -= 1;
    await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: userData.cartData })
    res.send('Removed')
})

// Creating an API for ADD CART ITEMS

app.post('/getcart', fetchUser, async (req, res) => {
    let userdata = await Users.findOne({ _id: req.user.id });
    res.json(userdata.cartData)
})
