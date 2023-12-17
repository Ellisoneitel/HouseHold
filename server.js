const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const session = require('express-session');


const saltRounds = 10;
const app = express();
const path = require('path');
const port = process.env.PORT || 3030;

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const URI = process.env.MONGODB_URI;

mongoose.connect(URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB');
});


const nameAgePairSchema = new mongoose.Schema({
    name: String,
    age: Number
});


const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    household: String,
    agifyHistory: [nameAgePairSchema]
}, { collection: 'UserData' });


const messageSchema = new mongoose.Schema({
    sender: String,
    timestamp: Date,
    messageId: mongoose.Schema.Types.ObjectId,
    content: String
});

const HouseHoldSchema = new mongoose.Schema({
    name: String,
    household: String,
    members: [String],
    messages: [messageSchema] 
}, { collection: 'HouseHolds' });


const User = mongoose.model('User', userSchema);


app.get("/", (req, res) => {
    if (req.session.loggedIn) {
        res.render('index', { body: 'accountDetails', username: req.session.username, household: req.session.household, error: null});
    } else {
        res.render('index', { body: 'landingpage', error: null});
    }

});

app.get("/Account", (req, res) => {
    if (req.session.loggedIn) {
        res.render('index', { body: 'accountDetails', username: req.session.username, household: req.session.household, error: null});
    } else {
        res.render('index', { body: 'landingpage', error: null});
    }
});

app.get("/CreateAccount", (req, res) => {
    res.render('index', { body: 'CreateAccount', error: null });
});

app.get("/login", (req, res) => {
    res.render('index', { body: 'loginBox', error: null});
});

app.get("/tasks", (req, res) => {
    res.render('index', { body: 'tasks', error: null});
});


app.get("/HouseHold", (req, res) => {
    if (req.session.household != "none") {
        res.render('index', { body: 'HouseHoldDetails', name: req.session.household, error: null});
    } else {
        res.render('index', { body: 'landingpage', error: null});
    }
})
app.get("/agify", (req, res) => {
    res.render('index', { body: 'agify', error: null});
})

app.get('/agifyGuess', async (req, res) => {
    const { name } = req.query;
    const username = req.session.username;

    if (!name) {
        return res.status(400).render('index', {body: 'agify', error: 'Name is required'});
    }

    try {
        const response = await axios.get(`https://api.agify.io/?name=${name}`);
        const age = response.data.age;

        await User.findOneAndUpdate(
            { username: username },
            { $push: { agifyHistory: { name: name, age: age } } },
            { new: true }
        );
        res.json({ age: age}); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data from Agify API');
    }
});

app.get('/AgifyHistory', async (req, res) => {
    const username = req.session.username; // Get the username from the session

    try {
        if (req.session.loggedIn) {
            const user = await User.findOne({ username });
            res.json(user.agifyHistory); // Send back the agifyHistory array
        } else {
            res.status(404).send('Log In to see History');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching history');
    }
});

app.post('/clearAgifyHistory', async (req, res) => {
    if (!req.session.loggedIn || !req.session.username) {
        return res.status(401).send('Unauthorized');
    }

    try {
        await User.updateOne(
            { username: req.session.username },
            { $set: { agifyHistory: [] } }
        );

        res.send('History cleared successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error clearing history');
    }
});

app.post('/CreateAccount', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.render('index', {
                body: 'CreateAccount',
                error: 'Username and password are required'
            });
        }else if (password.length < 6) {
            return res.render('index', {
                body: 'CreateAccount',
                error: 'Password must be at least 6 characters'
            });
        }
        
        // Check if the user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            res.render('index', {
                body: 'CreateAccount',
                error: 'Username already exists' // Pass the error message
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new user and save to the database
        const newUser = new User({ username, password: hashedPassword, household: "none" });
        await newUser.save();

        req.session.loggedIn = true;
        req.session.username = username;
        req.session.household = "none";
        
        res.render('index', {
            body: 'accountDetails',
            username: username,
            household: newUser.household,
            error: null
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error Creating Account');
    }
});



app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.render('index', {
                body: 'loginBox',
                error: 'Username and password are required'
            });
        }
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.loggedIn = true;
            req.session.username = username;
            req.session.household = user.household
            res.render('index', {
                body: 'accountDetails',
                username: username,
                household: req.session.household,
                error: null
            });
        } else {
            res.render('index', {body: 'loginBox', error: 'Invalid Credentials'})
        }
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});


app.post('/logout', (req, res) => {
    if (req.session.loggedIn) {
        req.session.destroy(err => {
            if (err) {
                console.log(err);
            }
            res.redirect('/');
        });
    }
});




app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

