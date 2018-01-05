var messenger = require('..');

var amqpHostname = 'amqp://rabbitmq:rabbitmq@localhost'
var targetQueue = 'test_queue'

// Set up a router

// Define worker funtions
function run_test(req){
	console.log("Will run test: %s", req.params.id)
	console.log(req.body)
}

function show_test(req, res){
	console.log(req)
	res.send({status: "OK"})
}

function edit_test(req, res){
	setTimeout(function(){
		let reply = "Test updated with: " + req.body
		res.send({status: reply})
	}, 500);
}

let testRouter = new messenger.Router()

testRouter.route(":id").get(show_test).post(edit_test).pub(run_test)

messenger.use("tests", testRouter)

console.log(messenger.router.toString())

messenger.connect(amqpHostname).then(function() {
	messenger.initQueue(targetQueue, {durable: true}).then(function(q) {
		messenger.listen(targetQueue)
	});
}).catch(console.warn);

setTimeout(function(){
	// Send a persistant message
	console.log("Send a message after 0.5 sec")
	let reqPath = "tests/1"
	let send_options = { persistent: true }
	let data = { timeSpan: 10 }
	messenger.send(targetQueue, reqPath, data, send_options ).then(function() {
		console.log("Message sent")
	}).catch(console.warn);
}, 500);

setTimeout(function(){
	// Send a request
	console.log("Send a GET after 1 sec")
	let reqPath = "tests/1"
	let send_options = {}
	let data = ""

	messenger.get(targetQueue, reqPath).then(function(message) {
		var body = message.content.toString();
		console.log("Received: " + body);
		messenger.ack(message);
	}).catch(console.warn);
}, 	1000);

setTimeout(function(){
	// Send a request
	console.log("Send a POST after 1.5 sec")
	let reqPath = "tests/1"
	let send_options = {}
	let data = "New important parameter"

	messenger.post(targetQueue, reqPath, data).then(function(message) {
		var body = message.content.toString();
		console.log("Received: " + body);
		messenger.ack(message);
	}).catch(console.warn);
}, 	1500);


setTimeout(function(){
	// Disconnect when all is done
	messenger.disconnect()
},  2500);
