# AMQP Service messenger

    npm install amqpMessenger


An experimental library for using Amqp as an inter service messenger protocol.
Based on [amqplib](https://www.npmjs.com/package/amqplib) AMQP 0-9-1 library.
Created for a short university project, and not really intended for use outside that

Features:

 - Sends messages and RPC requests
 - Implements express-style router
 - Expects Json data
 - Uses promises

Limitations:

 - Expects only Json data
 - Uses one channel per application
 - No tests
 - Insufficient error handling
 - written for a very narrow use-case
 - No callback api


## Server/Router example

```javascript
var messenger = require('@n_sandstrom/amqp-messenger');

var amqpHostname = 'amqp://rabbitmq:rabbitmq@localhost'

// Set up a router
// This server processes tasks regarding weather

// Define worker funtions
function list_rain_tasks(params, data){return "all rain tasks.."}
function show_rain_task(params, data){return ( "rain task at " + params.location) }
function process_rain_task(params, data){}
function list_temperature_tasks(params, data){return "all temperature tasks.."}
function show_temperature_task(params, data){return ( "temperature task at " + params.location) }
function process_temperature_task(params, data){}


let rainRouter = new messenger.Router()
let temperatureRouter = new messenger.Router()

rainRouter.route("").rpc(list_rain_tasks)
rainRouter.route(":location").rpc(show_rain_task).pub(process_rain_task)

temperatureRouter.route("").rpc(list_temperature_tasks)
temperatureRouter.route(":location").rpc(show_temperature_task).pub(process_temperature_task)

let mainRouter = new messenger.Router()
mainRouter.use("rain", rainRouter)
mainRouter.use("temperature", temperatureRouter)

messenger.use(mainRouter)

console.log(messenger.router.toString())

messenger.connect(amqpHostname).then(function() {
  messenger.initQueue('weather_queue', {durable: true}).then(function(q) {
    messenger.listen('weather_queue')
  });
}).catch(console.warn);
```
    $ node example.js 
    rpc /rain
    rpc /rain/:location
    pub /rain/:location
    rpc /temperature
    rpc /temperature/:location
    pub /temperature/:location

    Amqp connect
    Amqp connection done


## Client example
```javascript
var messenger = require('@n_sandstrom/amqp-messenger');
var amqpHostname = 'amqp://rabbitmq:rabbitmq@localhost'
var targetQueue = 'weather_queue'

messenger.connect(amqpHostname).then(function() {
  messenger.initQueue(targetQueue, {durable: true}).then(function() {
  });
}).catch(console.warn);

setTimeout(function(){
  // Send a persistant message
  // Tell the server to process rain forecast in Stockholm
  console.log("Send a message after 1 sec")
  let reqPath = "rain/stockholm"
  let send_options = { persistent: true }
  let data = { timeSpan: 10 }
  messenger.send(targetQueue, reqPath, data, send_options ).then(function() {
    console.log("Message sent")
  }).catch(console.warn);
}, 1000);

setTimeout(function(){
  // Send a request
  // Request temperature forecast in Visby
  console.log("Send a request after 2 sec")
  let reqPath = "temperature/visby"
  let send_options = {}
  let data = ""

  messenger.request(targetQueue, reqPath, data).then(function(message) {
    var body = message.content.toString();
    console.log("Received: " + body);
    messenger.ack(message);
  }).catch(console.warn);
}, 2000);

setTimeout(function(){
  // Disconnect when all is done
  messenger.disconnect()
},  3000);
```
    $ node send_example.js 
    Amqp connect
    Amqp connection done
    Send a message after 1 sec
    Message sent
    Send a request after 2 sec
    Received: temperature task at visby
    Amqp connection closed


## Usage

### Common functions

#### connect
```r
connect(path)
```
Connects to AMQP broker. Add credentials to path if needed.  
amqp://user:password@host

---

#### initQueue
```r
initQueue(queue, [options])
```
Asserts a queue. Wrapper for amqplib#assertQueue

---

#### disconnect
```r
disconnect()
```
Disconnects from broker

---

### Server functions

#### listen
```r
listen(queue, [options])
```
Listens for incomming messages on current routes

---

#### use
```r
use([prefix], Router)
```
Add a router to server

---

#### ack
```r
ack(message)
```
Acknowledge a message

---

### Client functions

#### send
```r
send(queue, request_path, [data], [options])
```
Send a message. No reply expected

---

#### request
```r
request(queue, request_path, [data], [options])
```
Send a request. Returns a promise wich resolves as a message

---

### Router functions

#### use
```r
use([prefix], Router)
```
Add routes. Nested with prefix

---

#### route
```r
route(route)
```
Adds a route to router. Use ':' to parse parameters (ex "user/:id")
Returns a Route

---

#### Route.rpc
```r
Route.rpc(function_name)
```
Adds a function reference to 'rpc'-calls on route
Returns a Route

---

#### Route.pub
```r
Route.pub(function_name)
```
Adds a function reference to 'pub'-calls on route
Returns a Route

---