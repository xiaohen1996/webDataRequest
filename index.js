const fs = require("fs");
const http = require("http");
const https = require("https");
const url = require("url");

const credentials = require("./auth/credentials.json");

const port = 3000;
const server = http.createServer();

server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
    console.log(`Now Listening on Port ${port}`);
}

server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){
        const form = fs.createReadStream("html/index.html");
		res.writeHead(200, {"Content-Type": "text/html"})
		form.pipe(res);
    }
    else if (req.url.startsWith("/Submit")){
		let {amount, number} = url.parse(req.url,true).query;
        if(number > 19 || amount < 0 || number < 1){
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end(`<h1>404 Not Found, Please enter valid amount or excuse number less than 20.</h1>`);
        }
		get_currency_information(amount, number, res);
    }
    else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end(`<h1>404 Not Found</h1>`);
    }
}
function get_currency_information(amount, number, res){
    const currency_endpoint = `https://api.apilayer.com/fixer/convert?from=USD&to=EUR&amount=${amount}`;
    const currency_request = https.get(currency_endpoint, {method:"GET", headers:credentials});
    currency_request.once("response", process_stream);
    currency_request.end();
    function process_stream (currency_stream){
        let currency_data = "";
        currency_stream.on("data", chunk => currency_data += chunk);
        currency_stream.on("end", () => serve_results(currency_data,number,res));
    }  
}
function serve_results(currency_data,number,res){
    let currency_object = JSON.parse(currency_data);
    let currency = currency_object.result;
    res.writeHead(200, {"Content-Type": "text/html"});
	res.write(`<h1>Currency result:</h1><ul>${currency}</ul>`);
    get_excuses(number,res);
    
}
function get_excuses(number,res){
    const excuse_endpoint = `https://excuser.herokuapp.com/v1/excuse/${number}`;
    const excuse_request = https.get(excuse_endpoint, {method:"GET"});
	res.write(`<h1>generate ${number} excuses :</h1>`);
    excuse_request.once("response",process_excuse_stream);
    function process_excuse_stream(excuse_stream){
        let excuse_data = "";
        excuse_stream.on("data", chunk => excuse_data += chunk);
        excuse_stream.on("end", () => serve_excuses(excuse_data,number,res));
    }
}
function serve_excuses(excuse_data,number,res){
    let excuse_object = JSON.parse(excuse_data);
    for(let i = 0; i < number; i++){
        res.write((i + 1) + ". " + excuse_object[i].excuse + '<br/>');
    }
    res.end();
    return;
}