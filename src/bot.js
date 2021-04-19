//Dependencies.
const { Client, Message } = require('discord.js')
const config = require('./config.json')
const axios = require('axios').default
const contractAddress = "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3" //SAFEMOON Contract Address

//Create an instance of client
const client = new Client()
const command = require('./command')
const mongo = require('./mongo')
const setup = require('./setup')

//Login
client.login(config.token)
client.on('ready', async () => {
    console.log(client.user.tag + ' has logged in.')

    await mongo().then(mongoose => {
        try {
            console.log('connected to mongo')
        } finally {
            mongoose.connection.close()
        }
    });

    setup(client)

    let price = await getPrice()
    client.user.setPresence({
        status: "online",
        activity: {
            name: "Price: " + price,
            type: "WATCHING"
        }
    }).catch(console.error)

    /**
     * Price Command.
     */
    command(client, ['price'], (message) => {
        postPrice(message.channel.id)
    })
});

/**
 * Update the discord rich presence price every 5 minutes.
 */
setInterval(async () => {
    let price = await getPrice()
    client.user.setPresence({
        status: "online",
        activity: {
            name: "Price: " + price,
            type: "WATCHING" // PLAYING, WATCHING, LISTENING, STREAMING,
        }
    }).catch(console.error)
}, 300 * 1000)

/**
 * Function for obtaining the price from pancakeswap's API.
 * @returns Pancakeswap's API data
 */
async function getPancakePrice() {
    try {
        let response = await axios.get('https://api.pancakeswap.info/api/tokens')
        return response.data
    } catch (err) {
        console.log(err)
        return "Failed"
    }
}

/**
 * Function for obtaining the total burned supply from BSCSCAN.
 * @returns total Burned Supply to-date.
 */
async function getBurnedTotal() {
    try {
        let response = await axios.get('https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=0x8076C74C5e3F5852037F31Ff0093Eeb8c8ADd8D3&address=0x0000000000000000000000000000000000000001&tag=latest&apikey=YOUR_API_KEY_GOES_HERE');
        let value = response.data['result']
        value = (value / 1_000_000_000_000_000_000_000).toFixed(4)
        return value
    } catch (err) {
        console.log(err)
        return "Failed"
    }
}

/**
 * Function for obtaining data from CoinMarketCap's Api.
 * @returns CoinMarketCap's widget API json data
 */
async function getCMCData() {
    try {
        let response = await axios.get('https://3rdparty-apis.coinmarketcap.com/v1/cryptocurrency/widget?id=8757')
        return response.data
    } catch (err) {
        console.log(err)
        return "Failed"
    }
}

/**
 * Method for getting the current price.
 * @returns price
 */
async function getPrice() {
    try {
        let panData = await getPancakePrice()
        let panBase = panData['data']['0x8076C74C5e3F5852037F31Ff0093Eeb8c8ADd8D3']
        return price = parseFloat(panBase['price']).toFixed(9)
    } catch (err) {
        console.log(err)
        return "Failed"
    }
}

/**
 * Function for sending the stand-alone price to a specific channel.
 */
let previousPrice, price
async function postPrice(channelId) {
    try {
        let price = await getPrice()
        let channel = client.channels.cache.get(channelId)
        if (price > 0) {
            let emoji = price > previousPrice ? "<:GreenSafu:828471113754869770>" : "<:RedSafu:828471096734908467>"
            await channel.send(emoji + " " + price)
            previousPrice = price
        }
    } catch (err) {
        console.log(err)
        return "Failed"
    }
}

module.exports.postPrice = postPrice

/**
 * Function for sending the Embedded price display.
 */
async function postEmbeded(channelId) {
    try {
        let price = await getPrice()
        //let volume = (dexGuruData['volume24hUSD'] / 1_000_000).toFixed(4)
        let channel = client.channels.cache.get(channelId)

        let burnTotal = await getBurnedTotal()
        let timeStamp = Date.now()

        let cmcData = await getCMCData()
        let cmcBase = cmcData.data[8757]
        let cmcQuote = cmcBase['quote']['USD']
        let circ_supply = 1000 - burnTotal
        let marketCap = (circ_supply * 1_000_000 * price).toFixed(4)

        let change1h = cmcQuote['percent_change_1h'].toFixed(4)
        let change24h = cmcQuote['percent_change_24h'].toFixed(4)
        let change7d = cmcQuote['percent_change_7d'].toFixed(4)

        await channel.send({
            embed: {
                "title": "**" + contractAddress + "**",
                "description": "This bot will automatically post new stats every 5 minutes.",
                "url": "https://bscscan.com/address/" + contractAddress,
                "color": 2029249,
                "timestamp": timeStamp,
                "footer": {
                    "text": "SafeMoon Price Bot - Values based on USD."
                },
                "thumbnail": {
                    "url": "https://i.imgur.com/cAjC1Pz.png"
                },
                "author": {
                    "name": "SafeMoon Price Bot",
                    "url": "https://safemoon.net"
                },
                "fields": [
                    {
                        "name": "💸 Price",
                        "value": "$" + price,
                        "inline": true
                    },
                    {
                        "name": "🧊 Volume",
                        "value": "Disabled"/*"$" + volume + "M"*/,
                        "inline": true
                    },
                    {
                        "name": "💰 Market Cap",
                        "value": marketCap + "M",
                        "inline": true
                    },
                    {
                        "name": "🏦 Total Supply",
                        "value": "1000T",
                        "inline": true
                    },
                    {
                        "name": "🔥 Total Burned",
                        "value": burnTotal + "T",
                        "inline": true
                    },
                    {
                        "name": "💱 Circ Supply",
                        "value": circ_supply.toFixed(2) + "T",
                        "inline": true
                    },
                    {
                        "name": "💯 1hr Change",
                        "value": change1h > 0 ? "⬆️ " + change1h + "%" : "⬇️ " + change1h + "%",
                        "inline": true
                    },
                    {
                        "name": "📈 24hr Change",
                        "value": change24h > 0 ? "⬆️ " + change24h + "%" : "⬇️ " + change24h + "%",
                        "inline": true
                    },
                    {
                        "name": "📈 7D Change",
                        "value": change7d > 0 ? "⬆️ " + change7d + "%" : "⬇️ " + change7d + "%",
                        "inline": true
                    }
                ]
            }
        });
    } catch (err) {
        console.log(err)
    }
}

module.exports.postEmbeded = postEmbeded
