// router/index.js

'use strict';

var Route = require('./route');


class Router{
	constructor() {
		this.routes = []
	}

	route(newRoute){
		let route = new Route(newRoute)
		this.routes.push(route)
		return route
	}

	use(base = "", routes) {
		if(routes == undefined) {
			routes = base
			base = ""
		}
		var self = this

		routes.routes.map( function(route){
			let new_route = Object.assign({}, route);
			// Update the path
			if(new_route.path == ""){
				new_route.path = base
			}
			else if(base == ""){
				new_route.path = new_route.path
			}
			else{
				new_route.path = base + "/" + new_route.path
			}
			// Update the regex
			let regex = Route.toRegex(new_route.path)
			new_route.params = regex.params
			new_route.regex = regex.pattern

			self.routes.push(new_route)
		});
		this.routes.sort(function(a,b) {return b.path.localeCompare(a.path)} );
	}

	match(path, method)
	{
		var match_result
		let route = this.routes.find(route => { match_result = path.match(route.regex); return match_result != null  })

		if (route == undefined) return false

		let params = {}

		for(let i = 0; i < route.params.length; i++) {
			params[route.params[i]] = match_result[i+1]
		}

		let func = route.methods[method]

		if (func == undefined) return false

		return {func: func, params: params}
	}

	toString(){
		let routeList = ""

		this.routes.forEach(function(route){
			Object.keys(route.methods).forEach(function(method){
				routeList += (method + "\t/" + route.path + "\n")
			})
		})
		return routeList
	}
}

module.exports = exports = Router
