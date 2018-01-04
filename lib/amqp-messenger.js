'use strict';

// This is my own wrapper for amqplib. Only written for a very narrow usecase.
// Don't expect anything of it

var amqp = require('amqplib');
var uuid = require('node-uuid');
var Router = require('./router')

function AmqpMessenger() {
	//Constructor

	this.connection = undefined
	this.channel = undefined
	this.reply_queue = undefined

	this.router = new Router
}

AmqpMessenger.prototype.Router = Router;

AmqpMessenger.prototype.connect = function(host){
	console.log("Amqp connect")
	return new Promise((resolve, reject) => {
		(async () => {
			try {
				if (this.connection !== undefined){
					reject("already connected")
					return 0
				}
				this.connection = "connecting"
				
				var conn = await amqp.connect(host);
				let ch = await conn.createChannel();

				let queue = await ch.assertQueue('', {exclusive: true})
				this.reply_queue = queue.queue

				this.connection = conn
				this.channel = ch

				console.log("Amqp connection done")
				resolve(true);
			} catch (error) {
				this.connection = undefined
				reject(error)
			}
		})();
	});
}

AmqpMessenger.prototype.disconnect = async function(){
	this.connection.close()
	console.log("Amqp connection closed")
}

AmqpMessenger.prototype.use = function(arg1, arg2){
	this.router.use(arg1, arg2)
}

AmqpMessenger.prototype.listen = function(queue, options){
	this.channel.consume(queue, this.parseRouter, options);
}

AmqpMessenger.prototype.parseRouter = function(message){
	// Verify Json content
	try {
		let body = JSON.parse(message.content.toString())
		
		// Verify requestPath
		if(body.request == undefined) {
			console.log("No route request")
			messenger.channel.ack(message);
			return 0
		}
		console.log(body.request)

		let requestPath = body.request
		let data = body.data
		let properties = message.properties

		
		// Get or Post
		let type
		if(properties.replyTo == undefined)	type = "pub"
		else	type = "rpc"

		console.log("type: %s", type)
		// match route
		let match = messenger.router.match(requestPath, type)
		// parse params

		// call function
		// reply if neaded
		if (match == false) {		// No match to process
			console.log("no matching route")
		}
		else if(type == "rpc") {	// Process and send reply
			let reply = match.func(match.params, data)
			let replyOptons = {correlationId: properties.correlationId}
			
			messenger.sendToQueue(properties.replyTo, reply, replyOptons)
			
		}
		else if(type == "pub") {	// Process without reply
			match.func(match.params, data)
		}
	} catch (error) {
		console.log("failed to process routing")
		console.log(error)
	}
	// ack
	messenger.channel.ack(message);
}

AmqpMessenger.prototype.initQueue = function(name, options){
	return this.channel.assertQueue(name, options);
}

AmqpMessenger.prototype.ack = function(message){
	this.channel.ack(message);
}

AmqpMessenger.prototype.consume = function(queue, worker, options = {}){
	this.channel.consume(queue, worker, options);
}

AmqpMessenger.prototype.get = function(queue, options = {}){
	// Issue! Messages are dropped from queue, even when no ack is sent
	return new Promise((resolve, reject) =>{
		(async () => {
			try {
				var keep_trying = true
				var reply
				setTimeout(function(){
					keep_trying = false
					reject()
				}, 1000)
				while(keep_trying){
					let reply = await this.channel.get(queue, options);
					if (reply != false) 
					{
						keep_trying = false
						resolve(reply)
					}
					await messenger.delayFor(50);
				}
			} catch (error) {
				console.log(error)
				reject(error)
			}
		})();
	})
}

AmqpMessenger.prototype.request = function(queue, request, data = "", options = {}){
	return new Promise((resolve, reject) =>{
		(async () => {
			try {
				let message = {request: request, data: data}
				let correlationId = uuid();
				options.replyTo = this.reply_queue
				options.correlationId = correlationId
				// await this.channel.assertQueue(queue);
				await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), options );
				// console.log("sent:\t\t %s", correlationId)
				let reply = await messenger.get(this.reply_queue)
				// console.log("received:\t %s", reply.properties.correlationId)
				if (reply.properties.correlationId != correlationId) reject(false)

				resolve(reply)
			} catch (error) {
				console.log(error)
				reject(error)
			}
		})();
	})
}

AmqpMessenger.prototype.sendToQueue = function(queue, message, options){
	return this.channel.sendToQueue(queue, Buffer.from(message), options );
}
AmqpMessenger.prototype.send = function(queue, request, data = "", options = {}){
	return new Promise((resolve, reject) =>{
		(async () => {
			try {
				let message = {request: request, data: data}
				// await this.channel.assertQueue(queue);
				let sent = await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), options );
				resolve(sent)
			} catch (error) {
				reject(error)
			}
		})();
	})
}

AmqpMessenger.prototype.delayFor = function(msecs){
	return new Promise(resolve => setTimeout(resolve, msecs));
}

var messenger = module.exports = exports = new AmqpMessenger