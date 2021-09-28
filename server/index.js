const express = require('express')
const app = express()
const mysql = require('mysql')
const bodyParser = require('body-parser')
const cors = require('cors')
const bcrypt = require('bcrypt')
const { createToken } = require('./jwt')
const cookieParser = require('cookie-parser')
const { verify, decode } = require('jsonwebtoken')
const { destroyCookie } = require('nookies')



// Here I am accessing my database
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'db_crud'
})

app.use(bodyParser.urlencoded({extended: true}))
app.use(cors({
    credentials: true,
    origin: 'http://localhost:3000'
}))
app.use(express.json())
app.use(cookieParser())


console.log('SECRET', )

// Endpoint to get the reviews based on the email
app.get('/api/get/:userEmail', (req, res) => {
    const userEmail = req.params.userEmail
    const sqlSelect = 'SELECT * FROM movie_reviews WHERE user_email = ?;'

    db.query(sqlSelect, userEmail, (err, result) => {
        // console.log(err)
        res.send(result)
    })
})

app.post('/api/insert', (req, res) => {
    const sqlInsert = 'INSERT INTO movie_reviews (movie_name, movie_review, user_email) VALUES (?,?,?);'
    // I use question marks to say I don't want to insert constant values, I want to set dynamic values in query time

    // We are assigned the properties of the object we passed on our axios post in frontend
    const { movieName, movieReview, userEmail } =  req.body
    console.log('userEmail', userEmail)

    // Here I am setting to the columns the value of the variables
    db.query(sqlInsert, [movieName, movieReview, userEmail], (err, result) => {
        console.log(userEmail)
    })
})

app.delete('/api/delete/:movieName/:userEmail', (req, res) => {
    const name = req.params.movieName
    const userEmail = req.params.userEmail
    console.log('parama', req.params)
    const sqlDelete = 'DELETE FROM movie_reviews WHERE movie_name = ? AND user_email = ?'
    db.query(sqlDelete, [name, userEmail])
})

app.put('/api/update', (req, res) => {
    const name = req.body.movieName
    const review = req.body.movieReview
    const userEmail = req.body.userEmail
    console.log(name, review, userEmail)
    const sqlUpdate = 'UPDATE movie_reviews SET movie_review = ? WHERE movie_name = ? AND user_email = ?'
    db.query(sqlUpdate, [review, name, userEmail], (err, result) => {
        if (err) console.log('err',err)
        if (result) console.log('res', result)
    })
})

// Endpoint to register the new users
app.post('/api/insert/users', (req, res) => {
    const { username, email, password, imageUrl } = req.body

    const sqlInsert = 'INSERT INTO users (users_username, users_email, users_password, users_imageurl) VALUES (?,?,?,?);'
    db.query(sqlInsert, [username, email, password, imageUrl], (err, result) => {
        if (err) console.log(err)
    })
})

// Endpoint to get all the users of db
app.get('/api/getUsers', (req, res) => {
    const sqlSelect = 'SELECT * FROM db_crud.users;'
    console.log('oiiiiiii')
    db.query(sqlSelect, (err, result) => {
        res.send(result)
        console.log('erro' + err, 'result' + result)
    })
})

// =========== REGISTER ENDPOINT =========== //
app.post('/api/register', (req, res) => {
    const { username, email, password, imageUrl } = req.body;
    const sqlSelect = "SELECT * FROM users";
  
    bcrypt.hash(password, 10).then((hashPassword) => {
        db.query(sqlSelect, (err, users) => {
            if (err) console.log(err)
            const isEmailUsed = users.some((item) => item.users_email === email);
            console.log(isEmailUsed)
            if (isEmailUsed) {
                res.json({ message: "This Email Already Exists" })
            } else {
                const sqlInsert = 'INSERT INTO users (users_username, users_email, users_password, users_imageurl) VALUES (?,?,?,?);';
                db.query(sqlInsert, [username, email, hashPassword, imageUrl ], (sqlErr, sqlRes) => {
                    if (sqlErr) console.log('SQLERR', sqlErr)
                    if (sqlRes) res.status(200).json({ message: "User created" })
                })
            }
        })

    })
})


// =========== LOGIN ENDPOINT =========== //
app.post('/api/login', (req, res) => {
    const { email, password } = req.body

    const sqlSelect = "SELECT * FROM db_crud.users WHERE users_email = ?"
    db.query(sqlSelect, email, (err, [user]) => {
        if (err) return res.json({ error: err })
        if (user) {
            const dbHashPassword = user.users_password

            // I'm grabin the password the user typed, and comparing to the password hashed wich is storaged in db.
            bcrypt.compare(password, dbHashPassword).then((isEqual) => {
                if (isEqual){
                    const accessToken = createToken(user)
                    res.cookie('access-token', accessToken);
                    res.json({ message: "Logged In" });
                } else {
                    res.json({ message: "Wrong Username and Password Combination" })
                }
            }).catch(err => {
                console.log(err)
            })
        } else {
            res.json({ message: "User Not Found" })
        }
    })
}) 

// =========== AUTH ENDPOINT =========== //
app.get('/api/auth/:accessToken', (req, res) => {
    const accessToken = req.params.accessToken
    if (!accessToken) return res.json({ error: 'User Not Authenticated', authenticated: false })
    
    try {
        const validToken = verify(accessToken, process.env.ACCESS_TOKEN_SECRET_KEY)
        console.log('validToken', validToken)
        if (validToken) {
            res.json({ message: 'authenticated', authenticated: true })
        } else {
            res.json({ message: 'invalid token', authenticated: false })
        }
    } catch (err) {
        return res.json({ message: err, authenticated: false })
        // return res.json({ error: err })
    }
})

// =========== USER INFOS ENDPOINT =========== //
app.get('/api/get-user/:accessToken', (req, res) => {
    const token = req.params.accessToken
    const user = decode(token) 
    res.send(user)
})

// =========== UPDATE USER INFOS ENDPOINT =========== //
app.get('/api/update-user/:email', (req, res) => {
    const email = req.params.email
    const sqlSelect = 'SELECT * FROM users WHERE users_email = ?'
    db.query(sqlSelect, email, (err, [user]) => {
        if (err) console.log('OLHA O ERRO ', err)
        const accessToken = createToken(user)
        console.log('accessToken', accessToken)
        res.cookie('access-token', accessToken)
    })
})

app.get('/delete-cookie', (req, res) => {
    
})

// Endpoint for update user information
app.post('/api/updateUsers', (req, res) => {
    const { username, email, password, image, pastEmail, strToday } = req.body
    const sqlSelect = "SELECT * FROM users";

    bcrypt.hash(password, 10).then((hashPassword) => {
        db.query(sqlSelect, (err, users) => {
            const isEmailUsed = users.some((item) => item.users_email === email);
            console.log('IS EMAIL USED', isEmailUsed)
            if (isEmailUsed) {
                res.json({ message: 'Email is Already Been Used' })
            } else {
                const sqlUpdate = "UPDATE users SET users_username = ?, users_email = ?, users_password = ?, users_imageUrl = ?, alterationDate = ? WHERE users_email = ?"
                db.query(sqlUpdate, [username, email, hashPassword, image, strToday, pastEmail], (err, updres) => {
                    if (err) console.log('UPDATE QUERY', err)
                    
    
                    db.query('SELECT * FROM db_crud.users WHERE users_email = ?', email, (err, [user]) => {
                        if (err) console.log('SELECT WHERE USERS_EMAIL', err)
                        const accessToken = createToken(user)
                        res.json({ message: "User updated", accessToken: accessToken})
                        
                    })
                })
            }
        })

    }).catch(err => console.log('bcrypt err', err))
})

// Endpoint for update email of the review table in db
app.put('/api/updateEmailReview', (req, res) => {
    const { pastEmail, email } = req.body
    const sqlUpdate = "UPDATE movie_reviews SET user_email = ? WHERE user_email = ?"
    db.query(sqlUpdate, [email, pastEmail])
})

app.put('/api/createAlteration', (req, res) => {
    const { alterationDate, email } = req.body
    const sqlInsert = "UPDATE users SET alterationDate = ? WHERE users_email = ?"
    db.query(sqlInsert, [alterationDate, email])
})

app.listen(3001, () => {
    console.log("Hello World")
})