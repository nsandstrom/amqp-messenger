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
	setTimeout(function(){
		res.send({status: "OK"})
	}, 500);
}

let testRouter = new messenger.Router()

testRouter.route(":id").rpc(show_test).pub(run_test)

messenger.use("tests", testRouter)

console.log(messenger.router.toString())

messenger.connect(amqpHostname).then(function() {
	messenger.initQueue(targetQueue, {durable: true}).then(function(q) {
		messenger.listen(targetQueue)
	});
}).catch(console.warn);

setTimeout(function(){
	// Send a persistant message
	console.log("Send a message after 1 sec")
	let reqPath = "tests/1"
	let send_options = { persistent: true }
	let data = { timeSpan: 10 }
	messenger.send(targetQueue, reqPath, data, send_options ).then(function() {
		console.log("Message sent")
	}).catch(console.warn);
}, 500);

setTimeout(function(){
	// Send a request
	console.log("Send a request after 2 sec")
	let reqPath = "tests/1"
	let send_options = {}
	let data = ""

	messenger.request(targetQueue, reqPath, data).then(function(message) {
		var body = message.content.toString();
		console.log("Received: " + body);
		messenger.ack(message);
	}).catch(console.warn);
}, 	1000);


setTimeout(function(){
	// Disconnect when all is done
	messenger.disconnect()
},  2500);
