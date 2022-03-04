// const roomName = JSON.parse($("#room-name").text())
// const roomName = JSON.parse(document.getElementById('room-name').textContent);
const log = console.log;
var waiting_players = false;
var gameStarted = false;
var soundPaths = [
    { soundName: "Phone", path: "/static/audio/phonecall.wav" },
    { soundName: "Up", path: "/static/audio/smb_1-up.wav" },
    { soundName: "Coin", path: "/static/audio/smb_coin.wav" },
    { soundName: "Jump", path: "/static/audio/smb_jump-super.wav" },
    { soundName: "powerUp", path: "/static/audio/smb_powerup_appears.wav" }
]

let msg = { "id": "admin", "player_id": '', "message": "", 'score': '0', 'color_r': 0, 'color_g': 0, 'color_b': 0 };

const webSocket = new WebSocket(
    'ws://'
    + window.location.host
    + '/ws/pads/'

);

class Player {
    constructor(id, rank) {
        this.id = id;
        this.number = -1;
        this.answer;
        this.has_answered = false;
        this.rank = rank;
        this.score = 0;
        this.color_r = 0;
        this.color_g = 0;
        this.color_b = 0;
        this.sound = "";
    }
    update() {
        $(`#player_${this.number}_score`).text(this.score +
            (this.score > 1 ? " Points" : " Point"));
    }
}

class GameModes {
    // Create new instances of the same class as static attributes
    static QCM = new GameModes("qcm")
    static Quick = new GameModes("quick")

    constructor(mode) {
        this.mode = mode;
    }
}

class ExpectedAnswer {
    static A = new ExpectedAnswer("a");
    static B = new ExpectedAnswer("b");
    static C = new ExpectedAnswer("c");
    static D = new ExpectedAnswer("d");

    constructor(answer) {
        this.answer = answer;
    }
}


var currentGameMode = GameModes.QCM;
var expected_answer = ExpectedAnswer.A
var players = [];
var quick_players = [];
var soundList = []

webSocket.onmessage = function (e) {
    const data = JSON.parse(e.data);
    if (data.id != "admin") {

        if (waiting_players) {
            if (players.find(elt => elt.id == data.id)) return; //On s'assure que c'est pas le même joueur qui s'inscrit
            $('#waiting_players').addClass('hidden');
            $('#players_container').removeClass('hidden');
            var incomingPlayer = new Player(data.id, undefined);
            if (data.message == "Press") {
                incomingPlayer.color_r = data.color_r;
                incomingPlayer.color_g = data.color_g;
                incomingPlayer.color_b = data.color_b;
            }

            players.push(incomingPlayer);
            incomingPlayer.number = players.indexOf(incomingPlayer) + 1;

            $('#players_container').append(`
            
            <div class='box-Buzzer' id='box_Buzzer_${incomingPlayer.number}'>
               
                    <div class="player_name_score_container">
                        <div class='player_name'>
                            <h2>Joueur ${incomingPlayer.number}</h2>
                            <div class="player_color" id=player_${incomingPlayer.number}_color></div>
                        </div>
                        <div class='score_container'>
                            <div>
                                <label class='score' >SCORE : </label>
                                <label id='player_${incomingPlayer.number}_score' class='score' >${incomingPlayer.score} Point</label>  
                            </div>
                                           
                            <input class='btn btn-primary' id='btn_buzzer_${incomingPlayer.number}_minus' type='submit' name='btn-Buzzer_${incomingPlayer.number}_+' value='-1'>
                            <input class='btn btn-primary' id='btn_buzzer_${incomingPlayer.number}_reset' type='submit' name='btn-Buzzer_reset' value='Remise à zéro'>
                            <input class='btn btn-primary' id='btn_buzzer_${incomingPlayer.number}_plus' type='submit' name='btn-Buzzer_${incomingPlayer.number}_-' value='+1'>
                        </div>
                    </div>
                                      
                <div class='audio_container'>
                    <audio id=${incomingPlayer.number}_audio src="/static/audio/smb_jump-super.wav" type="audio/mpeg">
                            Your browser does not support the audio element.
                    </audio>
                    
                    <div class="dropdown">
                        <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            Dropdown button
                        </button>
                        <div id="sound_drop" class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                            <!-- <a class="dropdown-item" href="#">Action</a>
                            <a class="dropdown-item" href="#">Another action</a>
                            <a class="dropdown-item" href="#">Something else here</a> -->
                        </div>
                    </div>
                    <div>
                        <button id="${incomingPlayer.number}_play">Play</button>
                    </div>
                 
                </div>
                
            </div>

            `);

            //Audio
            soundPaths.forEach(sound => {
                $('#sound_drop').append(`
                    <div >
                        <a class="player_play" href="#">Play</a>
                        <button id=${incomingPlayer.number}_${sound.soundName} class="dropdown-item" data-path=${sound.path} >${sound.soundName}</button>
                    </div>
                `);
                $(`#${incomingPlayer.number}_${sound.soundName}`).on('click', function (_e) {
                    incomingPlayer.sound = sound.path;
                    $('#dropdownMenuButton').text(`${sound.soundName}`)
                    $(`#${incomingPlayer.number}_audio`).attr('src', `${sound.path}`);


                });
            });
            $(`#${incomingPlayer.number}_play`).on('click', function () {
                $(`#${incomingPlayer.number}_audio`)[0].play();
            });



            //msg web socket
            log(players);
            msg.player_id = incomingPlayer.id
            msg.id = 'admin';
            msg.message = 'OK';

            //On ne renvoie les couleurs que si le candidature
            msg.color_r = incomingPlayer.color_r;
            msg.color_g = incomingPlayer.color_g;
            msg.color_b = incomingPlayer.color_b;

            $(`#player_${incomingPlayer.number}_color`).css({
                "background-color": `rgb(${incomingPlayer.color_r}, ${incomingPlayer.color_g},${incomingPlayer.color_b})`,
                "width": "80px",
                "height": "20px",
            });
            // log(msg)
            webSocket.send(JSON.stringify(msg));

        }

        else if (gameStarted) {

            var player = players.find(elt => elt.id == data.id);
            if (player == undefined)
                return; //Si le joueur n'est pas en lice on ignore

            if (!player.has_answered) {
                //On evite de pouvoir changer sa réponse 
                if (currentGameMode == GameModes.QCM) {
                    player.answer = new ExpectedAnswer(data.message);
                    // player.answer = !player.has_answered ? new ExpectedAnswer(data.message) : player.answer;
                    // log(expected_answer)
                    // let msg = { "id": "admin", "player_id": player.id, "message": "", "score": player.score };
                    msg.id = 'admin';
                    if (player.answer.answer == expected_answer.answer) {
                        $(`#box_Buzzer_${player.number}`).addClass('good_answer');
                        player.score += 1;
                        player.update();
                        msg.message = "good";
                        msg.score = player.score;

                        msg.player_id = player.id;
                        // $('#player_' + player.number + '_score').text(player.score +
                        //     (player.score > 1 ? " Points" : " Point"));
                    }

                    else {
                        $(`#box_Buzzer_${player.number}`).addClass('bad_answer');
                        msg.message = "bad";
                        msg.player_id = player.id;
                    }
                    log(msg)
                    webSocket.send(JSON.stringify(msg));


                }
                else {
                    quick_players.push(player);
                    player.rank = quick_players.indexOf(player);
                    log(quick_players);

                    if (!$(`#box_Buzzer_${quick_players[0].number}`).hasClass('good_answer'))
                        $(`#box_Buzzer_${quick_players[0].number}`).addClass('good_answer');
                    quick_players[0].score += 1;
                    quick_players[0].update();
                    // let msg = { "id": "admin", "player_id": quick_players[0].id, "message": "faster", "score": quick_players[0].score };
                    msg.player_id = quick_players[0].id;
                    msg.score = quick_players[0].score
                    msg.message = 'faster';
                    msg.id = 'admin';
                    webSocket.send(JSON.stringify(msg));
                    // $('#player_' + player.number + '_score').text(player.score +
                    //     player.score > 1 ? " Points" : " Point");



                }
                player.has_answered = true;
            }





        }

    }

};

webSocket.onopen = function (_e) {
    msg.message = "reset";
    msg.player_id = '';
    webSocket.send(JSON.stringify(msg));
}
webSocket.onclose = function (_e) {
    console.error("le socket s'est fermé inopinément");
};



$(() => {

    $('#question_type_form').on('change', function (e) {
        currentGameMode = e.target.id == "qcm" ? GameModes.QCM : GameModes.Quick;
        if (currentGameMode == GameModes.Quick)
            $('#answer_form').addClass('hide');
        else
            $('#answer_form').removeClass('hide');
    });
    $('#answer_form').on('change', function (e) {
        expected_answer = new ExpectedAnswer(e.target.id);
    })

    $('#start_btn').on('click', function (e) {
        // message = { 'id': 'admin', 'player_id': "", 'message': "start", 'score':'0' };
        log($(e.target).val());
        if ($(e.target).val() == "Démarrer") {
            //Attente des joueurs
            $(e.target).val('Lancer la partie');
            $('#start_text').addClass("hidden");
            $('#waiting_players').removeClass('hidden');
            $('.form').removeClass('hidden');
            msg.message = "start"
            msg.player_id = '';
            msg.id = 'admin';
            msg.player_id = '';

            waiting_players = true;
            gameStarted = false;
        }

        else if ($(e.target).val() == 'Lancer la partie') {
            //lancement de partie
            if (players.length < 1)
                return;
            players.forEach(player => {
                $(`#btn_buzzer_${player.number}_plus`).on('click', function (_e) {
                    player.score += 1;
                    player.update();

                });
                $(`#btn_buzzer_${player.number}_minus`).on('click', function (_e) {
                    player.score -= 1;
                    player.update();
                });
                $(`#btn_buzzer_${player.number}_reset`).on('click', function (_e) {
                    player.score = 0;
                    player.update();
                });
            });
            $(e.target).val("Réinitialiser");
            msg.message = "game"
            msg.player_id = '';
            waiting_players = false;
            gameStarted = true;

            $('.ingame').removeClass("hidden");

        }
        else {
            //reset
            $('#start_text').removeClass("hidden");
            $('.form').addClass('hidden');
            $('#waiting_players').addClass('hidden');
            $(e.target).val("Démarrer");
            $('#players_container').text('');
            $('.ingame').addClass("hidden");
            msg.message = "reset"
            msg.player_id = '';
            waiting_players = false;
            gameStarted = false;
            players = [];
            quick_players = [];


        }
        log(msg);
        webSocket.send(JSON.stringify(msg));
    });

    $('#new_question_btn').click(function (_e) {
        players.forEach(elt => {
            $(`#box_Buzzer_${elt.number}`).hasClass('good_answer') ?
                $(`#box_Buzzer_${elt.number}`).removeClass('good_answer') :
                $(`#box_Buzzer_${elt.number}`).removeClass('bad_answer');
            elt.has_answered = false;
        });
        quick_players = []
        // let msg = { "id": "admin", "player_id": "", "message": "game", 'score':'0' };
        msg.id = "admin";
        msg.player_id = '';
        msg.message = '';
        msg.message = 'new_quest';
        webSocket.send(JSON.stringify(msg));
    });



})