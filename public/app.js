;
jQuery(function($) {
	'use strict';

	const IO = {


		//Called when page is initially loaded
		init: function () {
			IO.socket = io.connect();
			IO.bindEvents();
		},


		/**
		 * app.js will listen for these evens and call their functions
		 **/
		bindEvents: function () {
			IO.socket.on('connected', IO.onConnected);
			IO.socket.on('roomCreated', IO.onRoomCreated);
			IO.socket.on('playerJoinedRoom', IO.onPlayerJoinedRoom);
			IO.socket.on('player1', IO.onPlayer1);
			IO.socket.on('startGame', IO.onStart);
			IO.socket.on('playerResponse', IO.onPlayerResponse);
			IO.socket.on('startVoting', IO.onStartVoting);
			IO.socket.on('playerStartVoting', IO.onPlayerStartVoting);
			IO.socket.on('voteForPlayerOne', IO.onVoteForOne);
			IO.socket.on('voteForPlayerTwo', IO.onVoteForTwo);


			//maybe use?
			IO.socket.on('qRec', IO.onQRec);
			IO.socket.on('everyoneDone', IO.onEveryoneDone);
			IO.socket.on('getDuel', IO.onGotDuel);
			IO.socket.on('results', IO.onResults);
			IO.socket.on('leaderboard', IO.onLeaderboard);


		},

		/**
		 * On connection saves socket ID of player or host
		 */
		onConnected: function (data) {
			App.mySocketID = IO.socket.id;
			console.log(IO.socket.id);
			console.log(data.message);
		},

		onRoomCreated: function (data) {
			App.Host.hostPreScreen(data);
		},

		onPlayerJoinedRoom: function (data) {

			App.Host.playerJoinedRoom(data);

		},

		onPlayer1: function () {
			App.Player.setPlayer1();
		},

		onStart: function () {

			console.log("game info: ");
			console.log("game started");
			console.log("Role: " + App.myRole);

			if(App.myRole === 'Player')
			{
				App.Round.roundStart();
			}
			else {
				App.Host.startGame()
			}
		},

		/**
		 *
		 */
		onPlayerResponse: function (data) {
			if (App.myRole === "Host") {
				App.Host.savePlayerResponse(data);
			}
		},

		onStartVoting: function () {

			if(App.myRole === "Host") {

				App.Host.voting();

			}
		},


		onPlayerStartVoting: function (data) {

			console.log("voting started");

			if (data.pOne.id === App.mySocketID || data.pTwo.id === App.mySocketID) {
				App.Player.displayBlank();
			}
			else {
				App.Player.vote(data);
			}
		},

		onVoteForOne: function () {

			if (App.myRole ==='Host') {
				App.Host.votingResults('playerOne');
			}
		},

		onVoteForTwo: function () {

			if (App.myRole ==='Host') {
				App.Host.votingResults('playerTwo');
			}
		},



		//maybe use?
		onQRec: function () {
			App.Game.receiveQ(data);
		},

		onEveryoneDone: function () {
			App.Round.startDuel();
		},

		onGotDuel: function () {
			App.Host.duel(data);
			App.Player.showVote(data);
		},

		onResults: function () {
			App.Player.displayBlank();
			App.Host.displayDuelResults(data);
		},

		onLeaderboard: function () {
			App.Player.displayBlank();
			App.Host.displayLeaderboard();
		}

	};


	const App = {

		gameId: 0,

		myRole: '',

		mySocketID: '',

		currentRound: 0,


		init: function() {
			App.cacheElements();
			App.showInitScreen();
			App.bindEvents();
		},

		cacheElements: function () {
			App.$doc = $(document)
			App.$gameArea =$('#gameArea');

			App.$introScreen =  $('#intro-screen').html();

			//host screens
			App.$hostJoinGame =  $('#hostJoinGame').html();
			App.$hostWaitingScreen =  $('#roundStart').html();
			App.$hostDuelScreen =  $('#hostDuelScreen').html();
			App.$hostDisplayLeaderboard =  $('#hostDisplayLeaderboards').html();
			App.$endOfGame =  $('#endOfGame').html();

			//player screens
			App.$playerJoinGame = $('#playerJoinGame').html();
			App.$playerSetsName = $('#playerSetsName').html();
			App.$playerAnswer = $('#playerAnswer').html();
			App.$playerWaitingScreen = $('#playerWaitingScreen').html();
			App.$playerVotingScreen = $('#playerVotingScreen').html();

		},		/**
		 * Listens for events on the webpage
		 */
		bindEvents: function () {

			App.$doc.on('click', '#createGame', App.Host.onCreateClick);
			App.$doc.on('click', "#joinGame", App.Player.onJoinClick);
		//	App.$doc.on('click', "#startGame", App.Host.startGame);
			App.$doc.on('click', "#submit", App.Player.setName);
			App.$doc.on('click', "#startGame", App.Player.startGameClick);
			App.$doc.on('click', "#submitAnswer", App.Game.answer);
			App.$doc.on('click', '#one', App.Player.voteOne);
			App.$doc.on('click', '#two', App.Player.voteTwo);
			//App.$doc.on('click', "#back", App.Host.showInitScreen);
			//App.$doc.on('click', "#box1", App.Player.vote(1));
			//App.$doc.on('click', "#box2", App.Player.vote(2));
			//App.$doc.on('click', "#playAgain", App.Host.startGame());
			App.$doc.on('click', '#quit', App.showInitScreen);


		},




		showInitScreen: function () {
			App.$gameArea.html(App.$introScreen);
		},


		Game: {

			responses: [],

			qNum: 0,


			start: function () {
				console.log("Start Function! Question Number is: " + this.qNum);
				//keeps track of amount of questions answered per round
				if (this.qNum === 2){
					this.qNum = 0;
					App.Round.answerSubmitted();
				}
				else {
					this.qNum++;
					if (App.Round.roundNum === 1) {
						this.blankQ();
					} else if (App.Round.roundNum === 2) {
						this.qRequest();
					} else {
						// On round three setting qnum to 2 ends the round after 1 submission
						this.qNum = 2
						this.qRequest();
					}
				}

			},

			//ask server for question

			qRequest: function () {

				IO.socket.emit("roundTwo", {roomNum: App.Host.roomNum});

				App.$gameArea.html(App.$playerWaitingScreen);

			},

			//display questions when received

			receiveQ: function (data) {
				//display question
			},


			blankQ: function () {
				App.$gameArea.html(App.$playerAnswer)
			},

			// take in response
			//emit response
			answer: function () {

				let playerAnswer = $('#questionAnswer').val();

				IO.socket.emit('answer', {
					question: null,
					response: playerAnswer,
					name: App.Player.playerName,
					id: App.mySocketID,
					roomNum: App.Player.hostRoomNumber});

				App.Game.start();

			},

			/**
			 * Display end screen
			 */
			end: function () {

			}



		},

		Round : {

			roundNum : 0,

			/**
			 * Increments round num
			 * Calls Game.start()
			 */
			roundStart: function (){
				if (this.roundNum >= 2){
					App.Game.end();
				}


				this.roundNum++;

				console.log("Round Number: " + this.roundNum);

				App.Game.start();

			},

			/**
			 * 	Change Screen when done answering
			 */
			answerSubmitted: function () {
				App.Player.displayBlank();
			},

			/**
			 * Host display
			 * Voting
			 */
			startDuel: function () {
				App.Host.askForDuel();
			}


		},

		Player : {

			hostSocketId: '',

			hostRoomNumber: '',

			playerName: '',

			playerOne: false,

			/**
			 *
			 */
			onJoinClick: function () {
				console.log("A player has joined the game")
				console.log(App.mySocketID)
				App.$gameArea.html(App.$playerJoinGame)
			},

			/**
			 * Sets the player name,
			 * Calls method to display name
			 */
			setName: function () {

				let data = {
					name: $('#name').val(),
					roomNum: $('#roomNum').val()
				}

				App.Player.playerName = data.name;
				App.Player.hostRoomNumber = data.roomNum;
				App.myRole = "Player";


				console.log("Player Info:")
				console.log(App.myRole);
				console.log(App.Player.playerName);
				console.log(App.Player.hostRoomNumber);

				IO.socket.emit('playerJoin', {roomNumber: App.Player.hostRoomNumber, playerName: App.Player.playerName});
				App.Player.displayBlank();
			},

			/**
			 *   Appends the start button to this players waiting screen so that they can start the game
			 */
			setPlayer1: function () {

				//sets this player to player 1
				this.playerOne = true;

				//appends the start button
				$("#startInject")
					.append("<button id='startGame'>Start Game</button>");
			},

			/**
			 * Emits to the server that the game is ready to start
			 */
			startGameClick: function () {

				IO.socket.emit('playerReqStart', {roomNum: App.Player.hostRoomNumber});

			},


			/**
			 * Display text field
			 * Display question
			 */
			userInput: function () {

			},

			/**
			 * Changes player screen to show voting options
			 */
			showVote: function () {

			},

			/**
			 * Emits the q num that the player voted for
			 * @param vote
			 */
			vote: function (data) {

				App.$gameArea.html(App.$playerVotingScreen);

				$('#box1')
					.html('<button id="one">' + data.pOne.response+'</button>');

				$('#box2')
					.html('<button id="two">' + data.pTwo.response+'</button>')
			},

			voteOne: function () {

				IO.socket.emit('voteForPlayerOne', {roomNum: App.Player.hostRoomNumber})

			},

			voteTwo: function () {
				IO.socket.emit('voteForPlayerTwo', {roomNum: App.Player.hostRoomNumber})
			},


			/**
			 * Displays a blank screen while player has to wait on host or other players
			 */
			displayBlank: function () {
				App.$gameArea.html(App.$playerWaitingScreen);
				$('#playerName')
					.html(App.Player.playerName);
			}
		},


		Host : {

			roomNum: null,

			/**
			 * players[{name: string, points: int}]
			 */
			players : [],

			answerArray: [],

			numPlayers: 0,

			timeIsUp : false,

			duelPick: null,

			pOneVote : 0,

			pTwoVote: 0,

			/**
			 * When create game is selected emits event to get room code
			 */
			onCreateClick: function () {
				IO.socket.emit('hostCreatedGame');
				console.log("host created game");
			},


			/**
			 * Dispalys the room code and current number of players
			 * @param data - Room Code
			 */
			hostPreScreen: function (data) {

				App.Host.roomNum = data.roomid;

				App.myRole = "Host";

				App.$gameArea.html(App.$hostJoinGame);

				$('#roomCode')
					.html(data.roomid);

				$('#playerCount')
					.html("Player Count: " + App.Host.players.length);

				console.log(data.roomid);
			},


			/**
			 * Updates host screen with player name
			 * @param data - player name
			 */
			playerJoinedRoom: function (data) {

				App.Host.numPlayers = App.Host.numPlayers + 1;


				$('#playerCount')
					.append('<p/>')
					.text('Player Count: ' + App.Host.numPlayers)

				$('#player').append('<p>Player : ' + data.pName + ' has joined the game.</p>');

				App.Host.players.push(data.playerName);




			},

			/**
			 * 	Displays a waiting screen and a timer
			 * 	Ends round when timer is up
			 */
			startGame: function () {

				App.Host.timeIsUp = false;

				App.$gameArea.html(App.$hostWaitingScreen);

				let seconds = 90;

				//counts down from 90 seconds
				let countDown = setInterval(function () {

					//when time is up tell the server so that all clients move to the next round
					if (seconds === 0) {
						IO.socket.emit('timesUp', {roomNum: App.Host.roomNum});
						clearInterval(countDown);
					}

					//checks to make sure that time isn't already up
					if(App.Host.timeIsUp) {
						clearInterval(countDown);
					}

					//makes the timer
					$('#timer')
						.append('<p/>')
						.text(seconds);

					seconds--;


				},1000);
			},

			/**
			 * When a player finishes answering their questions for the round their info is stored like this.
			 * @param data - Answer {
			 * 		Question: q
			 * 		Answer: a
			 * 		Player Name: name
			 * 		Room Code: roomNum
			 * 		SocketID: id
			 * 		Picked Bool: picked
			 * }
			 */
			savePlayerResponse: function (data) {
					this.answerArray.push(data);
					console.log(this.answerArray);


					if (this.answerArray.length === this.players.length * 2) {
						IO.socket.emit('timesUp', {roomNum: App.Host.roomNum});
						App.Host.timeIsUp = true;
					}
			},

			/**
			 * Starts voting by picking the first two people to play
			 */
			voting: function () {
				console.log("voting");
				//picks a response to display
				this.duelPick = this.pick()

				console.log(this.duelPick );

				let playerOneResponse = this.duelPick [0][0];

				let playerTwoResponse = this.duelPick [1][0];

				IO.socket.emit("playersVote", {roomNum: App.Host.roomNum, playerOneResponse: playerOneResponse, playerTwoResponse: playerTwoResponse});

				App.Host.duel(this.duelPick);

			},

			/**
			 * Picks a question out of the answerArray
			 */
			pick: function () {

				console.log(this.answerArray.length);

				let rand = Math.round((Math.random() * 1000) % (this.answerArray.length - 1));

				console.log(rand);

				let response1 = this.answerArray.splice(rand, 1);

				console.log(this.answerArray.length);

				let rand2 = Math.round((Math.random() *1000) % (this.answerArray.length - 1));

				console.log(rand2);

				while (this.answerArray[rand2].name === response1.name) {
					rand2  = (Math.random() *1000) % this.answerArray.length;
				}

				let response2 = this.answerArray.splice(rand2, 1);

				let array = [response1, response2];

				return array;
			},


			/**
			 * Displays Player, answers, maybe question
			 */
			duel: function (data) {

				App.$gameArea.html(App.$hostDuelScreen);

				console.log(data);

				$('#answer1')
					.html(
						'<p>' + data[0][0].response +'</p>'
					)

				$('#answer2')
					.html(
						'<p>' + data[1][0].response +'</p>'
					)

			},

			votingResults: function (data) {

				if (data === 'playerOne') {
					this.pOneVote++;
				}
				else if(data === 'playerTwo') {
					this.pTwoVote++;
				}

				if (this.pOneVote + this.pTwoVote === this.players.length - 2) {
					IO.socket.emit('votingFinished', {roomNum: App.Host.roomNum, sock: App.mySocketID});
				}

			},

			/**
			 * Diplay the results of duel on the host screen for a certain amount of time
			 * @param data - player names and who they voted for
			 */
			displayDuelResults: function (data) {
				IO.socket.emit('duelDisplayed')
			},


			/**
			 * Display everyone's current scores
			 * @param data
			 */
			displayLeaderboard: function (data) {

				//call startRound
			}
		}
	};





	IO.init();
	App.init();

})
