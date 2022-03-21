const express = require('express');
const app = express();
const path = require('path')
const http = require('http')
const {instrument} = require("@socket.io/admin-ui");
const PORT = process.env.PORT || 3000
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const Stack = require('stack-lifo');

const prompts = ["answer with a q at the beginning", "answer with a bodypart other then your finger", "answer as if your an auctioneer",
		"ahos latest creation", "answer with sounds that would come from cave", "answer ina a wisconsin accent"];


instrument(io, {
	auth: false
});

//Set static folder
app.use(express.static(path.join(__dirname, "public")))
app.get('/', function(req,res) {
	res.sendFile(path.join(__dirname, './public/index.html'))
})

//Start server
server.listen(PORT, () => console.log('Sever running on port ' + PORT))


//handle a socket connection
io.on('connection', socket => {

	console.log('New WS connection' + socket.id);

	socket.emit('connected', { message : "You are Connected"});



		//when host creates game function is called
	socket.on('hostCreatedGame', function(){
		console.log('host has created game');

		//generates a room number
		let roomNum = (Math.random() * 1000 ) | 0;
		//emits roomCreated with room number to host
		socket.emit("roomCreated", {roomid: roomNum});
		//host joins the room to creat it
		this.join(roomNum.toString());

		console.log(socket.rooms);



	})

	socket.on('playerJoin', function (data) {

		//info printing
		console.log(data.roomNumber);

		console.log(io.of('/').adapter.rooms);

		//makes sure the room has a host before allowing players to join
		if(io.of('/').adapter.rooms.has(data.roomNumber)) {
			//joins the room
			this.join(data.roomNumber);

			console.log(io.of('/').adapter.rooms);
			//emits that a player is joining the room to the host
			socket.to(data.roomNumber).emit('playerJoinedRoom', {pName: data.playerName});
			//sets num players = to the size of the room
			var numPlayers = io.of('/').adapter.rooms.get(data.roomNumber).size;

			console.log(numPlayers);
			//if this is the first player they get to be player one
			if (numPlayers === 2) {
				socket.emit('player1');
			}

			console.log(data.playerName + " joining room: " + data.roomNumber);

		}

		else{
			console.log("room does not exist");
		}

	})

	socket.on('playerReqStart', function (data) {

		//emits to all sockets in room
		io.in(data.roomNum.toString()).emit('startGame');

		console.log("Game started for room: " + data.roomNum);
	})

	socket.on('answer', function (data) {

		console.log(data);

		socket.to(data.roomNum).emit("playerResponse", data);

	})

	/**
	 * 	The amount of time to answer the questions is over
	 * 	@param data - room number
	 */
	socket.on('timesUp', function (data) {

		console.log("Times UP!");

		console.log(data.roomNum);

		socket.emit('startVoting');


	})


	socket.on('playersVote', function (data) {


		console.log('players start voting emission');

		io.to(data.roomNum.toString()).emit('playerStartVoting', data);

		console.log("after io emission");

	})

	socket.on('voteForPlayerOne', function (data) {

		socket.to(data.roomNum.toString()).emit('voteForPlayerOne');

	})

	socket.on('voteForPlayerTwo', function (data) {

		socket.to(data.roomNum.toString()).emit('voteForPlayerTwo');

	})

	socket.on('votingFinished', function (data) {

		io.to(data.sock).emit('displayResults');

	})

	socket.on('duelDisplayed', function (data) {

		console.log("duelDisplayed");

		io.to(data.roomNum.toString()).emit('nextDuel')
	})
	socket.on('roundTwo', function (data) {

		console.log("succesfully emmited 'roundTwo'")

		io.to(data.roomNum.toString()).emit("playerNeedsPrompt", data)
	})

	socket.on('playerPromptIs', function (data) {

		socket.to(data.sock.toString()).emit('yourPrompt', {prompt: data.prompt})

	})


});
