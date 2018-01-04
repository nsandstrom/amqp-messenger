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