require('dotenv').config()

const path = require('path')
const express = require('express')
const app = express()
const axios = require('axios')
const bodyParser = require('body-parser')
const Airtable = require('airtable')
const _ = require('lodash')

const port = process.env.PORT || 8080

// airtable
Airtable.configure({
    apiKey: process.env.AIRTABLE_TOKEN
})

var base = Airtable.base(process.env.AIRTABLE_BASE)

// express
app.use(express.static(
    path.join(__dirname, 'public')
))

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// root is actuall the admin interface
app.get('/', async (req, res) => {
    res.render('admin')
})

// main webapp url
app.get('/index', (req, res) => {
    res.render('index', {
        orientation: process.env.MENU_ORIENTATION || 'vertical',
        refreshTimer: process.env.REFRESH_TIMER || 30000
    })
})

app.get('/inventory', async (req, res) => {
    let items = await getItems()
    console.log('ITEMS', items)
    let grouped = _.groupBy(items, 'Category')
    res.json(grouped)
})

app.get('/categories', async (req, res) => {
    let items = await getItems()
    console.log('ITEMS', items)
    let grouped = _.groupBy(items, 'Category')
    res.render('categories', {
        cats: grouped
    })
})

app.get('/refresh', async (req, res) => {
    try {
        let r = await axios.post('http://192.168.0.86:5011/refresh')
        res.send('Refresh success!')
    } catch (err) {
        res.send('Refresh error! Try again')
    }
})

app.post('/changeurl', async (req, res) => {
    let toChange = req.body.url
    if(!toChange) {
        toChange = 'localhost/index'
    }
    toChange = toChange.replace('http://', '').replace('https://', '')
    try {
        let r = await axios.post(
            'http://localhost:5011/url',
            {
                url: toChange
            }
        )
        res.sendStatus(200)
    } catch (err) {
        console.error('changeurl error', err.message)
        res.send(err.message)
    }
})

app.listen(port, () => {
  console.log(`* started on port: ${port}`)
})

// const CloverClient = CloverRestful.client('https://apisandbox.dev.clover.com')
// const cloverToken = process.env.CLOVER_TOKEN
// const merchantId = process.env.CLOVER_MERCHANT

async function getItems() {
    return new Promise((resolve, reject) => {
        base('menu-signage').select({
            view: 'menu'
        }).firstPage((err, records) => {
            if (err) {
                console.error(err)
                reject(err)
                return
            }
            try {
                let data = []
                records.forEach(function(record) {
                    console.log('Retrieved', record.fields)
                    data.push(record.fields)
                })
                resolve(data)
            } catch (err) {
                console.log(err)
            }        
        })  
    })
}

