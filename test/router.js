var messenger = require('..');

// Set up a router
// This server processes tasks regarding weather forecasts

// Define worker funtions
function list_rain_tasks(params, data){return "all rain tasks.."}
function show_rain_task(params, data){return ( "rain task at " + params.location) }
function process_rain_task(params, data){}
function list_temperature_tasks(params, data){return "all temperature tasks.."}
function show_temperature_task(params, data){return ( "temperature task at " + params.location) }
function process_temperature_task(params, data){}


let rainRouter = new messenger.Router()
let temperatureRouter = new messenger.Router()

rainRouter.route("").get(list_rain_tasks)
rainRouter.route(":location").get(show_rain_task).pub(process_rain_task)

temperatureRouter.route("").get(list_temperature_tasks)
temperatureRouter.route(":location").get(show_temperature_task).pub(process_temperature_task)

let mainRouter = new messenger.Router()
mainRouter.use("rain", rainRouter)
mainRouter.use("temperature", temperatureRouter)

messenger.use(mainRouter)

console.log(messenger.router.toString())
