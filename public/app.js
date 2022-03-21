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
			IO.socket.on('playerStartVoting', IO.onPlayersVote);
			IO.socket.on('voteForPlayerOne', IO.onVoteForOne);
			IO.socket.on('voteForPlayerTwo', IO.onVoteForTwo);
			IO.socket.on('displayResults', IO.onDisplayResults);
			IO.socket.on('nextDuel', IO.onNextDuel);
			IO.socket.on('playerNeedsPrompt', IO.onPlayerNeedsPrompt)
			IO.socket.on('yourPrompt', IO.onYourPrompt);


		},

		/**
		 * On connection saves socket ID of player or host
		 */
		onConnected: function (data) {
			App.mySocketID = IO.socket.id;
			console.log(IO.socket.id);
			console.log(data.message);
		},

		//when host creates room
		onRoomCreated: function (data) {
			App.Host.hostPreScreen(data);
		},


		//whenPlayer joins room
		onPlayerJoinedRoom: function (data) {

			App.Host.playerJoinedRoom(data);

		},

		/**
		 * First player joins in set as player one
		 */
		onPlayer1: function () {
			App.Player.setPlayer1();
		},


		/**
		 * When the server tells clients to start the game
		 */
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
		 * When players make a submission the host stores the data
		 */
		onPlayerResponse: function (data) {
			if (App.myRole === "Host") {
				App.Host.savePlayerResponse(data);
			}
		},

		/**
		 * Server tells clients to start voting
		 */
		onStartVoting: function () {

			if(App.myRole === "Host") {

				App.Host.voting();

			}
		},

		/**
		 * All players vote except for the players who are being voted on
		 * @param data -
		 */
		onPlayersVote: function (data) {

			console.log("voting started");

			if (App.myRole === "Player") {
				if (data.pOne.id === App.mySocketID || data.pTwo.id === App.mySocketID) {
					App.Player.displayBlank();
				} else {
					App.Player.vote(data);
				}
			}
		},

		onVoteForOne: function () {

			console.log("vote for player one");

			if (App.myRole ==='Host') {
				App.Host.votingResults('playerOne');
			}
		},

		onVoteForTwo: function () {

			console.log("vote for player two");

			if (App.myRole ==='Host') {
				App.Host.votingResults('playerTwo');
			}
		},

		onDisplayResults: function () {
			console.log("results displayed")

			if (App.myRole === 'Host') {
				App.Host.displayDuelResults();
			}
		},

		onNextDuel: function (){

			console.log("next duel")
			if(App.myRole === "Host") {

				if (App.Host.answerArray.length === 0){
					App.Host.displayLeaderboard();
				}
				else {
					App.Host.voting();
				}

			}
		},

		/**
		 * When a player needs their prompt, this method will display and ask the host to send them
		 * the prompt back
		 * @param data - {roomNum, sock}
		 */
		onPlayerNeedsPrompt: function (data) {

			console.log("successful emission of 'playerNeedsPrompt'")

			if(App.myRole === "Host") {
				App.Host.pickPrompt(data);
			}
		},

		/**
		 * Gives the question to the player to display on their screen
		 * @param data - the question to be displayed
		 */
		onYourPrompt: function (data) {
			App.Game.promptQ(data);
		}


	};


	const App = {

		gameId: 0,

		myRole: '',

		mySocketID: '',

		currentRound: 0,


		init: function () {
			App.cacheElements();
			App.showInitScreen();
			App.bindEvents();
		},

		cacheElements: function () {
			App.$doc = $(document)
			App.$gameArea = $('#gameArea');

			App.$introScreen = $('#intro-screen').html();

			//host screens
			App.$hostJoinGame = $('#hostJoinGame').html();
			App.$hostWaitingScreen = $('#roundStart').html();
			App.$hostDuelScreen = $('#hostDuelScreen').html();
			App.$hostDisplayLeaderboard = $('#hostDisplayLeaderboards').html();
			App.$endOfGame = $('#endOfGame').html();

			//player screens
			App.$playerJoinGame = $('#playerJoinGame').html();
			App.$playerSetsName = $('#playerSetsName').html();
			App.$playerAnswer = $('#playerAnswer').html();
			App.$playerWaitingScreen = $('#playerWaitingScreen').html();
			App.$playerVotingScreen = $('#playerVotingScreen').html();

		}, /**
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

			currentQuestion: null,


			start: function () {
				console.log("Start Function! Question Number is: " + this.qNum);
				//keeps track of amount of questions answered per round
				if (this.qNum === 2) {
					this.qNum = 0;
					App.Round.answerSubmitted();
				} else {
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

				console.log('IN qRequest function')

				IO.socket.emit("roundTwo", {roomNum: App.Player.hostRoomNumber, sock: App.mySocketID});

				App.$gameArea.html(App.$playerWaitingScreen);

			},

			blankQ: function () {
				App.$gameArea.html(App.$playerAnswer)
			},

			promptQ: function (data) {

				this.currentQuestion = data.prompt

				App.$gameArea.html(App.$playerAnswer)

				let prompt = document.createTextNode(this.currentQuestion)

				document.getElementById('question').appendChild(prompt);

			},

			// take in response
			//emit response
			answer: function () {

				let playerAnswer = $('#questionAnswer').val();

				IO.socket.emit('answer', {
					question: this.currentQuestion,
					response: playerAnswer,
					name: App.Player.playerName,
					id: App.mySocketID,
					roomNum: App.Player.hostRoomNumber
				});

				App.Game.start();

			},

			/**
			 * Display end screen
			 */
			end: function () {

			}


		},

		Round: {

			roundNum: 0,

			/**
			 * Increments round num
			 * Calls Game.start()
			 */
			roundStart: function () {
				if (this.roundNum >= 2) {
					App.Game.end();
				}


				this.roundNum++;

				console.log("Round Number: " + this.roundNum);

				App.Game.start();

			},

			/**
			 *    Change Screen when done answering
			 */
			answerSubmitted: function () {
				App.Player.displayBlank();
			},


		},

		Player: {

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

				IO.socket.emit('playerJoin', {
					roomNumber: App.Player.hostRoomNumber,
					playerName: App.Player.playerName
				});
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
			 * Displays the voting boxes on players screens
			 * @param data - Players responses to be displayed and the prompt they answered.
			 */
			vote: function (data) {

				App.$gameArea.html(App.$playerVotingScreen);

				$('#box1')
					.html('<button id="one">' + data.pOne.response + '</button>');

				$('#box2')
					.html('<button id="two">' + data.pTwo.response + '</button>')
			},

			/**
			 * Triggered when the first button is pressed
			 */
			voteOne: function () {

				console.log("voted for 1")
				IO.socket.emit('voteForPlayerOne', {roomNum: App.Player.hostRoomNumber})
				App.Player.displayBlank();

			},

			/**
			 * Triggered when the second button is pressed.
			 */
			voteTwo: function () {

				console.log("voted for 2")
				IO.socket.emit('voteForPlayerTwo', {roomNum: App.Player.hostRoomNumber})
				App.Player.displayBlank();
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


		Host: {

			roomNum: null,

			/**
			 * players[{name: string, points: int}]
			 */
			players: [],

			answerArray: [],

			numPlayers: 0,

			timeIsUp: false,

			duelPick: null,

			pOneVote: 0,

			pTwoVote: 0,


			/**
			 * When create game is selected emits event to get room code
			 */
			onCreateClick: function () {
				IO.socket.emit('hostCreatedGame');
				console.log("host created game");
			},


			/**
			 * Displays the room code and current number of players
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

				App.Host.players.push(data.pName);


			},

			/**
			 *    Displays a waiting screen and a timer
			 *    Ends round when timer is up
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
					if (App.Host.timeIsUp) {
						clearInterval(countDown);

					}

					//makes the timer
					$('#timer')
						.append('<p/>')
						.text(seconds);

					seconds--;


				}, 1000);
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

				console.log(this.duelPick);

				let pOne = this.duelPick [0][0];

				let pTwo = this.duelPick [1][0];

				console.log(pTwo);

				console.log(pOne);

				IO.socket.emit("playersVote", {roomNum: App.Host.roomNum, pOne: pOne, pTwo: pTwo});

				App.Host.duel(this.duelPick);

			},

			/**
			 * Picks a question out of the answerArray
			 */
			pick: function () {
				console.log("Answer Array Length: " + this.answerArray.length);

				let rand = Math.round((Math.random() * 1000) % (this.answerArray.length - 1));

				console.log(rand);

				let response1 = this.answerArray.splice(rand, 1);

				console.log("Answer Array Length: " + this.answerArray.length);

				let rand2;

				let response2

				if (this.answerArray.length === 1) {
					response2 = this.answerArray.splice(0, 1);
				}
				//if the array size is bigger than 1 the elements need to be picked randomly, but if it
				//equal to one then it will go out of bounds.
				else {
					rand2 = Math.round((Math.random() * 1000) % (this.answerArray.length - 1));

					console.log(rand2);

					while (this.answerArray[rand2].name === response1.name) {
						rand2 = (Math.random() * 1000) % this.answerArray.length;
					}

					 response2 = this.answerArray.splice(rand2, 1);
				}

				return [response1, response2];
			},


			/**
			 * Displays Player, answers, maybe question
			 */
			duel: function (data) {

				App.$gameArea.html(App.$hostDuelScreen);
				console.log(data);

				$('#answer1')
					.html(
						'<p>' + data[0][0].response + '</p>'
					)

				$('#answer2')
					.html(
						'<p>' + data[1][0].response + '</p>'
					)

			},

			votingResults: function (data) {

				if (data === 'playerOne') {
					this.pOneVote++;
				} else if (data === 'playerTwo') {
					this.pTwoVote++;
				}

				if (this.pOneVote + this.pTwoVote === this.players.length - 2) {
					console.log("voting finished");
					IO.socket.emit('votingFinished', {roomNum: App.Host.roomNum, sock: App.mySocketID});
				}

			},

			/**
			 * Display the results of duel on the host screen for a certain amount of time
			 * @param data - player names and who they voted for
			 */
			displayDuelResults: function () {
				$('#answer1')
					.append(
						'<p>' + App.Host.pOneVote + '</p>'
					)

				$('#answer2')
					.append(
						'<p>' + App.Host.pTwoVote
						+ '</p>'
					)

				this.pOneVote = 0;
				this.pTwoVote = 0;

				let seconds = 3;

				//counts down from 15 seconds
				let countDown = setInterval(function () {

					//when time is up tell the server so that all clients move to the next round
					if (seconds === 0) {
						IO.socket.emit('duelDisplayed', {roomNum: App.Host.roomNum});
						clearInterval(countDown);
					}

					seconds--;


				}, 1000);
			},



			/**
			 * Display everyone's current scores
			 * todo: Order player by score, emission for starting next round
			 * @param data
			 */
			displayLeaderboard: function (data) {
				App.$gameArea.html(App.$hostDisplayLeaderboard);

				let firstDiv = document.createElement("div")

				document.getElementById("leaderBody").appendChild(firstDiv)


				for (let i = 0; i < App.Host.players.length; i++) {
					App.Host.addDiv(i, firstDiv)
				}
				let seconds = 5;

				let countDown = setInterval(function () {

					if (seconds === 0) {
						IO.socket.emit('playerReqStart', {roomNum: App.Host.roomNum});
						clearInterval(countDown);
					}

					seconds--;

				},1000)
			},

			addDiv: function (i, firstDiv) {

				let currentDiv = firstDiv

				console.log(App.Host.players);

				let divCreate = document.createElement("div")

				let playerName = document.createTextNode(App.Host.players[i])


				if (i === 0) {
					firstDiv.appendChild(playerName)
				}
				else {

					divCreate.appendChild(playerName)

					document.getElementById("leaderBody").insertBefore(divCreate, currentDiv.nextSibling)
				}
			},

			/**
			 * Picks a prompt to be given to a player
			 *
			 * @param data - socketID, roomNum
			 */
			pickPrompt: function (data) {

				let questionStack = new Stack();
				let previousConnection = 0;
				let currentConnection = data.sock;
				let question;

				if (previousConnection === currentConnection || questionStack.isEmpty()) {
					//pick a question
					let rand = Math.round((Math.random() * 1000) % (App.Host.prompts.length - 1));

					question = App.Host.prompts.splice(rand, 1);

					//push the question into the stack
					questionStack.push(question);
				}
				else {
					question = questionStack.pop()
				}

				//emission of data

				IO.socket.emit('playerPromptIs', {prompt: question, sock: data.sock})
			},
		}
	}




	IO.init();
	App.init();

})
