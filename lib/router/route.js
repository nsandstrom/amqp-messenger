// router/route.js

'use strict';

function Route(path) {
	this.path = path;
	this.methods = {};

	let regex = Route.toRegex(path)

	this.params = regex.params
	this.regex = regex.pattern
}

Route.prototype.rpc = function(func) {
	this.methods.rpc = func
	return this
}

Route.prototype.pub = function(func) {
	this.methods.pub = func
	return this
}

Route.toRegex = function (text) {
	let regexWords = []
	let words = text.split("/")
	let params = []
	words.map(function(word){
		if(word[0] == ":") {
			params.push(   word.slice(1, word.length)  )
			word = "([\\w-]+)"
		}
		if (word != ""){
			regexWords.push(word)
		}
	})
	let pattern = new RegExp( '^' + regexWords.join("/") + "$"  )
	return {"pattern": pattern, "params": params }
}

module.exports = Route;
