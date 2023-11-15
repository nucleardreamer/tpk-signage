require('dotenv').config()

const path = require('path')
const express = require('express')
const app = express()
const axios = require('axios')
const bodyParser = require('body-parser')
const Airtable = require('airtable')
const _ = require('lodash')

const cache = require(path.join(__dirname, 'cache.js'))

const port = process.env.PORT || 8080

// these are config options that get populated by an airtable call at the start of this program, see the end of the file
var config = {}

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
        refreshTimer: process.env.REFRESH_TIMER || 30000,
        config
    })
})

app.get('/inventory', async (req, res) => {
    let items = await getItems()
    let grouped = _.groupBy(items, 'Category')
    res.json(grouped)
})

app.get('/categories', async (req, res) => {
    let items = await getItems()
    // the whole list of items, keyed by every category
    let grouped = _.groupBy(items, 'Category')

    // if ?filter=true is on the request, we will use the airtable 'menu_filter' value from the config (which gets loaded at start) and pick only the menu category keys that are set. Most likley scenario if this doesn't work is that the field in airtable is spelled wrong or has illegal characters
    let filter = req.query.menu_filter === 'true'
    if (filter) {
        grouped = _.pick(
            grouped,
            config.menu_filter.split(',')
        )
    }

    res.render('categories', {
        cats: grouped
    })
})

app.get('/refresh', async (req, res) => {
    try {
        let r = await axios.post('http://localhost:5011/refresh')
        res.send('Refresh success!')
    } catch (err) {
        res.send('Refresh error! Try again')
    }
})


app.get('/reboot', async (req, res) => {
    try {
        let r = await axios.post(
            `${process.env.BALENA_SUPERVISOR_ADDRESS}/v1/reboot?apikey=${process.env.BALENA_SUPERVISOR_API_KEY}`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
        res.send('Rebooting device! This will take about ~3-4 minutes')
    } catch (err) {
        console.error('reboot error', err.message)
        res.send(err.message)
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
        res.send('Changing URL! Refresh this page to do it again.')
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
        }).firstPage(async (err, records) => {
            if (err) {
                console.error(err)
                let cachedData = await cache.getCache('menu.json')
                resolve(cachedData)
                return
            }
            try {
                let data = []
                records.forEach(function(record) {
                    if (!_.isEmpty(record.fields)) {
                        data.push(record.fields)
                    }
                })
                await cache.writeCache('menu.json', data)
                resolve(data)
            } catch (err) {
                console.log(err)
                let cachedData = await cache.getCache('menu.json')
                resolve(cachedData)
            }        
        })  
    })
}

async function getConfig() {
    return new Promise((resolve, reject) => {
        base('menu-configuration').select({
            view: 'options'
        }).firstPage(async (err, records) => {
            if (err) {
                console.error(err)
                let cachedData = await cache.getCache('config.json')
                resolve(cachedData)
                return
            }
            try {
                let data = {}
                records.forEach(function(record) {
                    if (!_.isEmpty(record.fields)) {
                        console.log('* Config retrieved -', record.fields.Option + ':', record.fields.Value)
                        data[record.fields.Option] = record.fields.Value
                    }
                })
                // write new cache from latest response
                await cache.writeCache('config.json', data)
                resolve(data)
            } catch (err) {
                console.log(err)
                let cachedData = await cache.getCache('config.json')
                resolve(cachedData)
            }        
        })  
    })
}

(async function () {
    try {
        config = await getConfig()
    } catch (e) {
        console.error('* Start function, cant getConfig')
    }
})()
