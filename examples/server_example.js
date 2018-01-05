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