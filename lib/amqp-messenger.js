'use strict';

// This is my own wrapper for amqplib. Only written for a very narrow usecase.
// Don't expect anything of it

var amqp = require('amqplib');
var uuid = require('node-uuid');
var Router = require('./router')
var Response = require('./response')

class AmqpMessenger{
	constructor() {
		//Constructor
		this.Router = Router

		this.connection = undefined
		this.channel = undefined
		this.reply_queue = undefined

		this.router = new Router
	}

	connect(host){
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

	disconnect(){
		this.connection.close()
		this.channel = undefined
		this.connection = undefined
		console.log("Amqp connection closed")
	}

	use(arg1, arg2){
		this.router.use(arg1, arg2)
	}

	listen(queue, options){
		this.channel.consume(queue, this.parseRouter, options);
	}

	parseRouter(message){
		// Verify Json content
		try {
			let body = JSON.parse(message.content.toString())

			// Verify requestPath
			if(body.request == undefined) {
				console.log("No route request")
				messenger.channel.ack(message);
				return 0
			}

			let requestPath = body.request
			let method = body.method
			let data = body.data
			let properties = message.properties

			console.log("%s:\t%s", method, requestPath)
			// match route
			let match = messenger.router.match(requestPath, method)

			// build request and response
			// call function
			if (match == false) {		// No match to process
				console.log("no matching route")
			}
			else if(method == "pub") {	// Process without reply
				let req = {params: match.params, body: data}
				match.func(req)
			}
			else if(properties.replyTo != undefined) {	// If response address is missing
				let replyOptions = {correlationId: properties.correlationId}
				let res = new Response(messenger, properties.replyTo, replyOptions)

				if(method == 'get') {
					let req = {params: match.params}
					match.func(req, res)
				}
				else if ( method == 'post'){
					let req = {params: match.params, body: data}
					match.func(req, res)
				}

			}

		} catch (error) {
			console.log("failed to process routing")
			console.log(error)
		}
		// ack
		messenger.channel.ack(message);
	}

	initQueue(name, options){
		return this.channel.assertQueue(name, options);
	}

	ack(message){
		this.channel.ack(message);
	}

	consume(queue, worker, options = {}){
		this.channel.consume(queue, worker, options);
	}

	getReply(queue, options = {}){
		// Issue! Messages are dropped from queue, even when no ack is sent
		return new Promise((resolve, reject) =>{
			(async () => {
				try {
					var keep_trying = (60000 / 50)
					// var reply
					while(keep_trying > 0 && this.connection != undefined ){
						let reply = await this.channel.get(queue, options);
						if (reply != false)
						{
							keep_trying = 0
							resolve(reply)
						}
						keep_trying -= 1
						await messenger.delayFor(50);
					}
				} catch (error) {
					console.log(error)
					reject(error)
				}
			})();
		})
	}

	get(queue, request, options){
		let method = 'get'
		return messenger.request(method, queue, request, undefined, options)
	}

	post(queue, request, data, options){
		let method = 'post'
		return messenger.request(method, queue, request, data, options)
	}

	request(method, queue, request, data = "", options = {}){
		return new Promise((resolve, reject) =>{
			(async () => {
				try {
					let message = {method: method, request: request, data: data}
					let correlationId = uuid();
					options.replyTo = this.reply_queue
					options.correlationId = correlationId
					// await this.channel.assertQueue(queue);
					await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), options );
					// console.log("sent:\t\t %s", correlationId)
					let reply = await messenger.getReply(this.reply_queue)
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

	sendToQueue(queue, message, options){
		return this.channel.sendToQueue(queue, Buffer.from(message), options );
	}

	send(queue, request, data = "", options = {}){
		return new Promise((resolve, reject) =>{
			(async () => {
				try {
					let message = {method: 'pub', request: request, data: data}
					// await this.channel.assertQueue(queue);
					let sent = await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), options );
					resolve(sent)
				} catch (error) {
					reject(error)
				}
			})();
		})
	}

	delayFor(msecs){
		return new Promise(resolve => setTimeout(resolve, msecs));
	}
}

var messenger = module.exports = exports = new AmqpMessenger
