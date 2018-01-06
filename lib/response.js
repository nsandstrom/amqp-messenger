'use strict';

class Response{
	constructor(messenger, response_queue, options){
		this.messenger = messenger
		this.response_queue = response_queue
		this.options = options
	}

	send(message){
		this.messenger.sendToQueue(this.response_queue, JSON.stringify(message), this.options)
		// messenger.sendToQueue(properties.replyTo, reply, replyOptons)
	}

	json(message){
		console.log("json send wrapper")
		this.send(message)
	}
}

module.exports = Response;