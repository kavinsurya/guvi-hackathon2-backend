const express = require('express')
var cors = require('cors')
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();

const mongodb = require('mongodb');
const client = mongodb.MongoClient;

//middlewares
const app = express()
app.use(cors());
app.use(bodyParser.json())



//DB url 
const url = process.env.url;

//APi to view users
app.get('/users', async function (req, res) {
    try {
        let connection = await client.connect(url);
        let dataBase = connection.db("ticketBooking");
        let data = await dataBase.collection("users").find().toArray();
        await connection.close();
        res.status(200).json(data);
    } catch (error) {
        console.log(error);
    }

})



//Api to register new user
app.post('/register', async (req, res) => {
    try {
        let connection = await client.connect(url);
        let dataBase = connection.db("ticketBooking");
        let data = await dataBase.collection("users").findOne({ email: req.body.email })
        if (data) {
            res.status(400).json({
                message: "User already exists"
            });
        } else {
            let salt = await bcrypt.genSalt(10);
            let hash = await bcrypt.hash(req.body.password, salt);     
            req.body.password = hash;
            await dataBase.collection("users").insertOne(req.body);
            res.status(200).json({
                message: "Registration Successful"
            });
        }
        await connection.close();
    } catch (error) {
        console.log(error);
    }

})


//Api to Login the user
app.post('/login', async (req, res) => {
    try {
        let connection = await client.connect(url);
        let dataBase = connection.db('ticketBooking');
        let data = await dataBase.collection('users').findOne({ email: req.body.email });
        if (data) {
            let compare = await bcrypt.compare(req.body.password, data.password);
            if (compare) {
                res.status(200).json({
                    message: "Logged in Successfully"
                });
            } else {
                res.status(400).json({
                    message: "Login Failed"
                });
            }
        } else {
            res.status(401).json({
                message: "E-mail is not registered"
            })
        }
        await connection.close();
    } catch (error) {
        console.log(error);
    }
})


//Api to send the reset code via mail 
app.post('/sendMail', async (req, res) => {
    try {
        let connection = await client.connect(url);
        let db = connection.db("ticketBooking");
        let checkvalidity = await db.collection("users").findOne({ email: req.body.email });

        if (checkvalidity) {
            let data = await db.collection("reset").insertOne(req.body);
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.mail,
                    pass: process.env.password
                }
            });

            let mailOptions = {
                from: "kavinguvi@gmail.com",
                to: req.body.email,
                subject: "Password reset",
                html: `<div>
                <p>Hello ${checkvalidity.name},</p>

                <p>Enter the code <b>${req.body.code}</b> in the webpage!!</p>

                <p>Regards,</p>
                <p>Password reset team</p>
                </div>`
            }


            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log(err);
                    res.status(401).json({ message: "Error occured while sending mail" })
                } else {
                    res.status(200).json({ message: "Email sent !!" })
                }
            })
            await connection.close();
        } else {
            res.status(402).json({ message: "User doesn't exist in data base!" })
        }
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Error while sending mail !!" })
    }
})



//APi to validate the reset code

app.post('/code', async (req, res) => {
    let connection = await client.connect(url);
    let db = connection.db("ticketBooking");
    let ismatching = await db.collection('reset').findOne({ "code": req.body.code });
    if (ismatching !== null) {
        res.status(200).json({
            message: "success"
        });
    } else {
        res.status(400).json({
            message: "code doesn't match"
        });
    }
    await connection.close();
})



//Api to reset the password for an user
app.put('/resetpassword', async (req, res) => {
    let connection = await client.connect(url);
    let db = connection.db("ticketBooking");
    let isAvailable = await db.collection("users").findOne({ email: req.body.email });
    if (isAvailable) {
        var salt =  await bcrypt.genSalt(10);
        var bcryptPassword =  bcrypt.hashSync(req.body.password, salt);
        
        req.body.password = bcryptPassword;
        let updatepassword = await db.collection("users").updateOne({ "email": req.body.email }, { $set: { "password": req.body.password } });
        if (updatepassword) {
            res.status(200).json({
                message: "Password Updated successfully"
            })
        } else {
            res.status(400).json({
                message: "Password reset failed"
            })
        }
        await connection.close();
    } else {
        res.status(401).json({
            message: "Email doesn't exist"
        })
    }
})


//Api to create new movie
app.post('/createMovie', async (req, res) => {
    try {
        let connection = await client.connect(url);
        let dataBase = connection.db("ticketBooking");
        if (req.body.movie) {
            let data = await dataBase.collection("movies").findOne({ movie: req.body.movie })
            if (data) {
                res.status(400).json({
                    message: "Movie already exists"
                });
            } else {
                await dataBase.collection("movies").insertOne(req.body);
                res.status(200).json({
                    message: "Movie added Successfully"
                });
            } 
        } else{
            res.status(404).json({
                message: "Movie please enter movie details"
            });
        }
        
        await connection.close();
    } catch (error) {
        console.log(error);
    }

})

//Api to get movie list
app.get('/movies', async function (req, res) {
    try {
        let connection = await client.connect(url);
        let dataBase = connection.db("ticketBooking");
        let data = await dataBase.collection("movies").find().toArray();
        await connection.close();
        res.status(200).json(data);
    } catch (error) {
        console.log(error);
    }

})


app.delete('/movies/:id', async (req, res) => {
    try {
        let connection = await client.connect(url);
       
        let db = connection.db("ticketBooking");
        console.log(db);
        let deleteddata = await db.collection('movies').deleteOne({ "_id": mongodb.ObjectID(req.params.id) });
        console.log(req.params.id);
        console.log(deleteddata);
        await connection.close();
        res.json({ msg: "Movie deatils deleted successfully" });
    } catch (err) {
        res.json({ msg: "error in deleting details" })
    }
})



//Api to create new movie
app.post('/createtheatre', async (req, res) => {
    try {
        let connection = await client.connect(url);
        let dataBase = connection.db("ticketBooking");
        if (req.body.name) {
            let data = await dataBase.collection("theatres").findOne({ name: req.body.name })
            if (data) {
                res.status(400).json({
                    message: "Theatre already exists"
                });
            } else {
                await dataBase.collection("theatres").insertOne(req.body);
                res.status(200).json({
                    message: "Theatre added Successfully"
                });
            } 
        } else{
            res.status(404).json({
                message: " please enter Theatre details"
            });
        }
        
        await connection.close();
    } catch (error) {
        console.log(error);
    }

})

//Api to get movie list
app.get('/theatres', async function (req, res) {
    try {
        let connection = await client.connect(url);
        let dataBase = connection.db("ticketBooking");
        let data = await dataBase.collection("theatres").find().toArray();
        await connection.close();
        res.status(200).json(data);
    } catch (error) {
        console.log(error);
    }

})

app.delete('/theatres/:id', async (req, res) => {
    try {
        let connection = await client.connect(url);
       
        let db = connection.db("ticketBooking");
        console.log(db);
        let deleteddata = await db.collection('theatres').deleteOne({ "_id": mongodb.ObjectID(req.params.id) });
        console.log(req.params.id);
        console.log(deleteddata);
        await connection.close();
        res.json({ msg: "Theatre deatils deleted successfully" });
    } catch (err) {
        res.json({ msg: "error in deleting details" })
    }
})



//Api to send the reset code via mail 
app.post('/sentTickets', async (req, res) => {
    try {

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.mail,
                pass: process.env.password
            }
        });

        let mailOptions = {
            from: "kavinguvi@gmail.com",
            to: "kavinsurya002@gmail.com",
            subject: "Tickets Confirmation",
            html: ` <div>
            <div class="container" style="border: 1px solid slategray;text-align: center;  width: 70%; margin: 20px  auto;">
                <div style="border: solid 0 #4423ff;border-top-width: 5px;"></div>
    
                <img style=" display: block;margin: 10px auto;"
                    src="https://image.freepik.com/free-vector/cute-astronaut-with-popcorn-cartoon-vector-icon-illustration-science-food-icon_138676-1979.jpg"
                    height="100px" width="100px" alt="" srcset="">
                <hr style="width: 75%;">
                <div style="width: 60%;margin:auto;text-align: center;">
                    <h1>Your Ticket Confirmation</h1>
                    <p>You have received this email from www.moviebooking.com</p>
                    <p><b> Important Note, </b>Please carry this email confirmation along with your
                        Credit / Debit Card to collect tickets.</p>
                </div>
            </div>
    
            <div class="container" style="border: 1px solid slategray;  width: 70%;  margin: 20px auto;">
                <div style="border: solid 0 #4423ff;border-top-width: 5px;"></div>
    
    
                <h3 style="text-align: center">Dear,Kavinsurya</h3>
    
                <div
                    style="margin: 10px auto;
                    background-color: rgb(221, 221, 221);
                    padding: 2px;
                    padding-left: 10px;
                    border-radius: 10px;
                    width: 70%;">
                    <p><b>Booking Confirmation id:</b></p>
                </div>
    
                <div style="width: 90%;margin: 10px auto;">
                    <h3 style="text-align: center;">Important Notes</h3>
                    <ol>
                        <li style="padding: 5px;"> *Ticket Price is inclusive of all Taxes & Charges Convenience fee per
                            ticket is levied on all tickets.</li>
                        <li style="padding: 5px;">*F&B Price is inclusive of all Taxes </li>
                        <li style="padding: 5px;"> To collect your tickets from the INOX Box Office, It is mandatory to
                            present the MASTER / VISA card used by you to book tickets along with the booking confirmation
                            (SMS/Printout).</li>
                        <li style="padding: 5px;"> Children below the age of 18 years cannot be admitted for movies
                            certified 'A'. Please carry proof of age for movies certified 'A'.</li>
                        <li style="padding: 5px;"> Children above the age of 3 years will need a separate ticket please
                            purchase the same.</li>
                        <li style="padding: 5px;"> Rights of admission reserved by INOX Management . To counter unforeseen
                            delays, please collect your tickets half an hour before show time.</li>
                        <li style="padding: 5px;"> Outside eatable, beverages, chewing gum, cameras, electronic items,
                            weapons, cigarettes, light-ears matchsticks, gutkha, paan etc not allowed inside premises.</li>
                    </ol>
                </div>
    
                <h3 style="color: #4423ff;text-align: center;">Thank you and have a nice day</h3>
                <div style="text-align: center;">
                    <p>
                        Best regards, moviebooking Team
                    </p>
                    <p>
                        &#169; 2020 moviebooking Private Limited. All rights reserved.
                    </p>
                </div>
    
    
            </div>
    
    
        </div>`
        }


        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                res.status(401).json({ message: "Error occured while sending mail" })
            } else {
                res.status(200).json({ message: "Email sent !!" })
            }
        })

    }
    catch (error) {
        console.log(error);
        res.status(400).json({ message: "Error while sending mail !!" })
    }
})



app.listen(3000, () => {
    console.log('Listening to port 3000');
})