// router/route.js

'use strict';
class Route{

	constructor(path) {
		this.path = path;
		this.methods = {};

		let regex = Route.toRegex(path)

		this.params = regex.params
		this.regex = regex.pattern
	}

	get(func) {
		this.methods.get = func
		return this
	}

	post(func) {
		this.methods.post = func
		return this
	}

	pub(func) {
		this.methods.pub = func
		return this
	}

	static toRegex(text) {
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
}

module.exports = Route;
