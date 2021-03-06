# AMQP Service messenger

    npm install @n_sandstrom/amqp-messenger


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
// This server processes tasks regarding weather forecasts

// Define worker funtions
function list_rain_tasks(req, res){res.send("all rain tasks..")}
function show_rain_task(req, res){res.send( "rain task at " + req.params.location) }
function process_rain_task(req){}
function list_temperature_tasks(req, res){res.send("all temperature tasks..")}
function show_temperature_task(req, res){res.send( "temperature task at " + req.params.location) }
function create_temperature_task(req, res){res.send( "create task for " + req.body.location) }
function process_temperature_task(req){}


let rainRouter = new messenger.Router()
let temperatureRouter = new messenger.Router()

rainRouter.route("").get(list_rain_tasks)
rainRouter.route(":location").get(show_rain_task).pub(process_rain_task)

temperatureRouter.route("").get(list_temperature_tasks).post(create_temperature_task)
temperatureRouter.route(":location").get(show_temperature_task).pub(process_temperature_task)

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
},  1000);

setTimeout(function(){
  // Send a request
  // Request temperature forecast in Visby
  console.log("Send a request after 2 sec")
  let reqPath = "temperature/visby"

  messenger.get(targetQueue, reqPath).then(function(message) {
    var body = message.content.toString();
    console.log("Received: " + body);
    messenger.ack(message);
  }).catch(console.warn);
},  2000);

setTimeout(function(){
  // Send a request
  // Create a task for Oslo
  console.log("Post data after 3 sec")
  let reqPath = "temperature"
  let data = {location: "Oslo"}

  messenger.post(targetQueue, reqPath, data).then(function(message) {
    var body = message.content.toString();
    console.log("Received: " + body);
    messenger.ack(message);
  }).catch(console.warn);
},  3000);  

setTimeout(function(){
  // Disconnect when all is done
  messenger.disconnect()
},  4000);
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
Connects to AMQP broker. Add credentials to path if needed:  
`amqp://user:password@host`

---

#### initQueue
```r
initQueue(queue, [options])
```
Asserts a queue. Wrapper for amqplib#assertQueue.

---

#### disconnect
```r
disconnect()
```
Disconnects from broker.

---

### Server functions

#### listen
```r
listen(queue, [options])
```
Listens for incomming messages on current routes.

---

#### use
```r
use([prefix], Router)
```
Add a router to server.

---

#### ack
```r
ack(message)
```
Acknowledge a message.

---

### Client functions

#### send
```r
send(queue, request_path, [data], [options])
```
Send a message. No reply expected.

---

#### get
```r
get(queue, request_path, [options])
```
Send a get. Returns a promise wich resolves as a message.

---

#### post
```r
post(queue, request_path, [data], [options])
```
Send a post. Returns a promise wich resolves as a message.

---

### Router functions

#### use
```r
use([prefix], Router)
```
Add routes. Nested with prefix.

---

#### route
```r
route(route)
```
Adds a route to router. Use ':' to parse parameters (ex "user/:id").  
Returns a Route

---

#### Route.get
```r
Route.get(function_name)
```
Adds a function reference to 'get'-calls on route.  
Returns a Route

---
#### Route.post
```r
Route.post(function_name)
```
Adds a function reference to 'post'-calls on route.  
Returns a Route

---

#### Route.pub
```r
Route.pub(function_name)
```
Adds a function reference to 'pub'-calls on route.  
Returns a Route

---