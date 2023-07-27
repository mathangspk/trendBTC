const ccxt = require('ccxt');
const moment = require('moment');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const apiKey = process.env.apiKey; // Replace with your actual Binance API key
const secret = process.env.secret; // Replace with your actual Binance API secret
const secretTele = process.env.secretTele;
const chatId1 = process.env.chatId;
console.log(apiKey)
// Thay thế 'YOUR_TELEGRAM_BOT_TOKEN' bằng mã token của bot Telegram của bạn
const bot = new TelegramBot(secretTele, { polling: true });
// Global variables to store the last known trends
let lastTrend1h = '';
let lastTrend5m = '';
// Function to send a trend notification through Telegram
function sendTrendNotification(trend) {
    const chatId = chatId1; // Replace this with your Telegram chat ID
    const message = `Trend Alert: Both 1h and 5m trends are ${trend}!`;
    sendMessage(chatId, message);
}
// Hàm gửi tin nhắn
function sendMessage(chatId, message) {
    bot.sendMessage(chatId, message)
        .then(() => {
            console.log('Message sent successfully!');
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

// Xử lý sự kiện khi nhận tin nhắn mới
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    console.log(msg)
    // Kiểm tra nếu tin nhắn là "/start" thì gửi tin nhắn chào mừng
    if (messageText === '/start') {
        const welcomeMessage = 'Xin chào! Tôi là bot của bạn. Hãy gửi cho tôi bất kỳ điều gì bạn muốn.';
        sendMessage(chatId, welcomeMessage);
    }
});



const binance = new ccxt.binance({
    apiKey, secret, 'options': {
        'adjustForTimeDifference': true,
        'verbose': true, // if needed, not mandatory
        'recvWindow': 50000, // not really needed
    },
},);
binance.setSandboxMode(true);
// Hàm xác định xu hướng
function detectTrend(ema8, ema13, ema21, closingPrice) {
    const tolerance = 5; // Độ lệch cho phép để xác định không có trend
    console.log("Do lech gia dong cua voi EMA8: ", Math.abs(closingPrice - ema8))
    console.log("Do lech gia dong cua voi EMA13: ", Math.abs(closingPrice - ema8))
    console.log("Do lech gia dong cua voi EMA21: ", Math.abs(closingPrice - ema8))
    if (closingPrice > ema8 && closingPrice > ema13 && closingPrice > ema21 && ema8 > ema13 && ema13 > ema21) {
        // sendMessage(2070483485, "Uptrend");
        return "Uptrend";
    } else if (closingPrice < ema8 && closingPrice < ema13 && closingPrice < ema21 && ema21 > ema13 && ema13 > ema8) {
        // sendMessage(2070483485, "Downtrend");
        return "Downtrend";
    } else if (
        Math.abs(closingPrice - ema8) < tolerance ||
        Math.abs(closingPrice - ema13) < tolerance ||
        Math.abs(closingPrice - ema21) < tolerance
    ) {
        // sendMessage(2070483485, "No Trend");
        return "No Trend";
    } else {
        // sendMessage(2070483485, "Sideways");
        return "Sideways";
    }
}

async function printBalance(btcPrice) {
    try {
        const balance = await binance.fetchBalance();
        // console.log(balance);
        const total = balance.total
        console.log(`Balance: BTC ${total.BTC}, USDT: ${total.USDT}`)
        console.log(`Total USD: ${(total.BTC - 1) * btcPrice + total.USDT} \n`)
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}
function calculateEMA(prices, period) {
    const multiplier = 2 / (1 + period);
    let ema = 0;

    // Calculate the initial EMA value as the average of the first 'period' closing prices
    if (prices.length >= period) {
        ema = prices.slice(0, period).reduce((acc, price) => acc + price.close, 0) / period;
    }

    // Calculate the EMA for the rest of the prices
    for (let i = period; i < prices.length; i++) {
        const latestPrice = prices[i].close;
        ema = (latestPrice * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
}
async function tick() {
    try {
        const prices_1h = await binance.fetchOHLCV('BTC/USDT', '1h', undefined, 400); //số lượng mẫu khá là quan trọng, đã cân chỉnh để chỉ số khá tương đồng với tradingview
        const bPrices_1h = prices_1h.map(price => {
            return {
                timestamp: moment(price[0]).format(),
                open: price[1],
                high: price[2],
                low: price[3],
                close: price[4],
                volume: price[5]
            };
        });
        const ema8 = calculateEMA(bPrices_1h, 8);
        const ema13 = calculateEMA(bPrices_1h, 13);
        const ema21 = calculateEMA(bPrices_1h, 21);
        const lastPrice_1h = bPrices_1h[bPrices_1h.length - 1].close;
        console.log(`(1h) EMA8: ${ema8.toFixed(2)}. EMA13: ${ema13.toFixed(2)}. EMA21: ${ema21.toFixed(2)}. Last Price: ${lastPrice_1h.toFixed(2)}`);
        const trend = detectTrend(ema8, ema13, ema21, lastPrice_1h)
        //console.log("xu huong: ", trend)

        const prices_5m = await binance.fetchOHLCV('BTC/USDT', '5m', undefined, 400);
        const bPrices_5m = prices_5m.map(price => {
            return {
                timestamp: moment(price[0]).format(),
                open: price[1],
                high: price[2],
                low: price[3],
                close: price[4],
                volume: price[5]
            };
        });
        //console.log(bPrices_5m)
        //console.log(bPrices.slice(0, -1))
        const ema8_5m = calculateEMA(bPrices_5m, 8);
        const ema13_5m = calculateEMA(bPrices_5m, 13);
        const ema21_5m = calculateEMA(bPrices_5m, 21);
        const lastPrice_5m = bPrices_5m[bPrices_5m.length - 1].close;
        console.log(`(5m) EMA8: ${ema8_5m.toFixed(2)}. EMA13: ${ema13_5m.toFixed(2)}. EMA21: ${ema21_5m.toFixed(2)}. Last Price: ${lastPrice_5m.toFixed(2)}`);
        const trend_5m = detectTrend(ema8_5m, ema13_5m, ema21_5m, lastPrice_5m)
        //console.log("xu huong: ", trend_5m)

        // Get the latest trends for both 1h and 5m intervals
        const trend1h = detectTrend(ema8, ema13, ema21, lastPrice_1h);
        const trend5m = detectTrend(ema8_5m, ema13_5m, ema21_5m, lastPrice_5m);

        console.log("(1h) Trend:", trend1h);
        console.log("(5m) Trend:", trend5m);

        // Check if both 1h and 5m trends are either "Uptrend" or "Downtrend"
        if (
            (trend1h === "Uptrend" || trend1h === "Downtrend") &&
            (trend5m === "Uptrend" || trend5m === "Downtrend")
        ) {
            // Check if the current trends are different from the last known trends
            if (trend1h !== lastTrend1h || trend5m !== lastTrend5m) {
                // Send a notification since both trends are either uptrend or downtrend
                sendTrendNotification(trend1h);
            }
            // Update the last known trends
            lastTrend1h = trend1h;
            lastTrend5m = trend5m;
        }
        // const averagePrice = bPrices.reduce((acc, price) => acc + price.close, 0) / 20
        // //console.log(bPrices.map(p => p.close), averagePrice, lastPrice);
        // // Thuat toan de mua ban
        // const direction = lastPrice > averagePrice ? 'sell' : 'buy'
        // const TRADE_SIZE = 20
        // const quantity = TRADE_SIZE / lastPrice
        // console.log(`Average Price: ${averagePrice}. Last Price: ${lastPrice}`)
        // const order = await binance.createMarketOrder('BTC/USDT', direction, quantity)
        // console.log(`${moment().format()}: ${direction} :${quantity} BTC at ${lastPrice}`)
        // // console.log(order)
        // printBalance(lastPrice)

    } catch (error) {
        console.error('Error fetching OHLCV data:', error);
    }
}
async function main() {
    await tick();
    setInterval(async () => {
        await tick();
    }, 60 * 1000);

}

main(); // Uncomment this line if you want to fetch OHLCV data
// printBalance();
