if (!window.AudioContext) {
    if (!window.webkitAudioContext) {
        alert('no audiocontext found');
    }
    window.AudioContext = window.webkitAudioContext;
}

/* Mic Vars */
var audioContext = new AudioContext();

var BUFF_SIZE = 2048;

var isMicInit = false;
var isVolumeCalibrated = false;
var ambientVolume = 0;
var currVolume = 0;
var micData = {};
var analyser;
var freqArray = new Uint8Array(BUFF_SIZE / 2);
var CALIBRATION_FRAMES = 120;

var calibrationArr = [];

// Normalize API call
if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
}

// Request mic access
navigator.getUserMedia({
    audio: true
}, function(stream) {
    micData.mediaStream = stream;

    micData.micStream = audioContext.createMediaStreamSource(micData.mediaStream);

    micData.scriptProcessor = audioContext.createScriptProcessor(BUFF_SIZE, 1, 1);

    micData.scriptProcessor.connect(audioContext.destination);

    analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = BUFF_SIZE / 2;

    micData.micStream.connect(analyser);

    // Connect to the processor
    micData.micStream.connect(micData.scriptProcessor);

    // Connect to the output
    // micData.micStream.connect(audioContext.destination);

    isMicInit = true;
}, onError);

function getMicInput() {
    if (isMicInit) {
        // Get mic volume across all frequencies
        analyser.getByteFrequencyData(freqArray);

        // Average it out
        var averageVolume = (freqArray.reduce(function(a, b) {
            return a + b;
        }) / freqArray.length);

        // console.log(averageVolume);

        // If we calibrated the background noise volume
        if (isVolumeCalibrated) {
            currVolume = averageVolume;
        } else { // Calibrate volume
            // Push this volume to the calibration array
            calibrationArr.push(averageVolume);

            // If we've collected enough data
            if (calibrationArr.length >= CALIBRATION_FRAMES) {
                isVolumeCalibrated = true;

                // Sum and average the volume
                ambientVolume = (calibrationArr.reduce(function(a, b) {
                    return a + b;
                }) / calibrationArr.length);
            }
        }
    }
}

function onError(e) {
    console.log(e);
}

//Generate the Canvas
var CANVAS_WIDTH = 1920;
var CANVAS_HEIGHT = 1080;

//HD Resolutions -1280x720 and 1920 × 1080 Full HD

var canvasElement = $("<canvas id ='GameCanvasScreen' width='" + CANVAS_WIDTH + "' height='" + CANVAS_HEIGHT + "'></canvas>");
var canvas = canvasElement.get(0).getContext("2d");
canvasElement.appendTo('body');

/**By Ryan Giglio*/
function scaleToSmallest() {
    var ratio = CANVAS_WIDTH / CANVAS_HEIGHT;

    if (($(window).width() / ratio) <= $(window).height()) {
        canvasElement.css('width', '100%').css('height', 'auto');
    } else {
        canvasElement.css('height', '100%').css('width', 'auto');
    }
}
scaleToSmallest();

$(window).on('resize', function() {
    scaleToSmallest();
});
//Draw tile map
drawMap(canvas);
// Game State


var states = {
    splash: 0,
    title: 1,
    Game: 2,
    End: 3
};
var currentState = states.Game;

//Game Loop
//var FPS = 60;

// shim layer with setTimeout fallback
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();
//Mouse Coordinate Positioning
/*function writeMessage(canvas, message) {
        var context = canvasid.getContext('2d');
        context.clearRect(0, 0, canvasid.width, canvasid.height);
        context.font = '18pt Calibri';
        context.fillStyle = 'black';
        context.fillText(message, 10, 25);
        console.log(message);
      }
			**/

/** function getMousePos(canvas, evt) {
        var rect = canvasid.getBoundingClientRect();
        return {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
      }

      var canvasid = document.getElementById('GameCanvasScreen');
      var context = canvas;

      canvasid.addEventListener('mousemove', function(evt) {
         mousePos = getMousePos(canvasid, evt);
        var message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
        writeMessage(canvas, message);
      }, false); **/



function gameloop() {
    controller();
    getMicInput();

    if (paused == false) {
        update();
        draw();

        //;
    }
    window.requestAnimFrame(gameloop);
}

var paused = false;

window.requestAnimFrame(gameloop);


//Keyboard Map
function setUpKeys() {
    window.keydown = {};

    function keyName(event) {
        return jQuery.hotkeys.specialKeys[event.which] ||
            String.fromCharCode(event.which).toLowerCase();
    }

    $(document).bind("keydown", function(event) {
        keydown[keyName(event)] = true;
    });

    $(document).bind("keyup", function(event) {
        keydown[keyName(event)] = false;
    });
};
setUpKeys();

var notyet = 0;

function clearTimer() {
    notyet = 0;
}


function pauseGame() {
    if (notyet == 1) {
        console.log("waiting")
        return;
    }
    notyet = 1;
    paused = !paused;
    setTimeout('clearTimer()', 500);
}

//console.log(keydown.esc);


//Canvas Utlity for preventing objects from going over the edge
Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

//Text Variables
var splashTextX = CANVAS_WIDTH / 3;
var splashTextY = 0;
var endTextX = CANVAS_WIDTH / 3;
var endTextY = CANVAS_HEIGHT;

//Sound creation
var GameLoopMusic_sound = new Howl({
    urls: ['sounds/In-Orbit.mp3'],
    autoplay: false,
    loop: true,
});
var explosion_sound = new Howl({
    urls: ['sounds/explosion.mp3', 'sounds/explosion.wav']
});
var shoot_sound = new Howl({
    urls: ['sounds/shoot.mp3', 'sounds/shoot.wav'],
    volume: 0.2
});

var horn_sound = new Howl({
    urls: ['sounds/horn.mp3', 'sounds/horn.wav'],
    volume: 0.3
});

//explosion_sound.play();

//Create The player

var INIT_X = 350;
var INIT_Y = 50;
var player = {
    // color: "#00A",
    sprite: Sprite("Top_View"),
    x: INIT_X,
    y: INIT_Y,
    width: 173,
    height: 88,
    life: 100,
    angle: 0, // In Radians: 0 is right, -1.57 up, 1.57 down, -+3.14 left
    speed: 0,
    keyboardThrust: 5,
    keyboardTurnSpeed: 0.05,
    points: 0,
    tempPoints: 0,
    update: function() {
      // Get the gamepads
      var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

      // If there's a gamepad available
      if (gamepads[0] !== null) {
          // Add wheel angle to boat angle
          // Axes range from -1 to 1
          // TURNING_RADIUS slows down your turning speed
          this.angle += (gamepads[0].axes[0] * Math.PI) / TURNING_RADIUS;
      }


      // If the current noise is louder than the background noise
      if (currVolume > ambientVolume) {
          // Set the new boat speed
          // FWD_THROTTLE slows down your movement
          this.speed = currVolume / FWD_THROTTLE;
      } else {
          this.speed = 0;
      }

      // Keyboard controls for development
      if (keydown.left) {
          this.angle -= this.keyboardTurnSpeed;
      }

      if (keydown.right) {
          this.angle += this.keyboardTurnSpeed;
      }

      if (keydown.up) {
          this.speed = this.keyboardThrust;
      }

      if (keydown.h) {
          horn_sound.play();
      }

      // Calculate distance to center
      var dx = WATER_CENTER_X - this.x;
      var dy = WATER_CENTER_Y - this.y;
      var centerDistance = Math.sqrt((dx * dx) + (dy * dy));

      // Calculate angle to center
      var centerAngle = Math.atan2(dy, dx);

      // Calculate velocity towards center
      // centerPull determines strength of pull
      var centerVelX = Math.cos(centerAngle) * centerPull;
      var centerVelY = Math.sin(centerAngle) * centerPull;

      // Calculate velocity of blow movement
      var velX = Math.cos(this.angle) * this.speed;
      var velY = Math.sin(this.angle) * this.speed;

      // Move Boat
      this.x += velX + centerVelX;
      this.y += velY + centerVelY;

      this.x = this.x.clamp(0 + shore.width + this.width - 200, CANVAS_WIDTH - this.width); //prevents character from going past canvas


      this.y = this.y.clamp(0, CANVAS_HEIGHT - this.height); //prevents character from going past canvas
    },
    draw: function() {
        // Translate the canvas to the back center of the boat
        canvas.translate(this.x, this.y + (this.height / 2));
        // Rotate the canvas so the boat draws turned
        canvas.rotate(this.angle);

        // Draw the boat
        this.sprite.draw(canvas, 0, -(this.height / 2));

        // Reset the canvas to pre-rotated
        canvas.rotate(-this.angle);
        canvas.translate(-this.x, -(this.y + (this.height / 2)));

    },
    shoot: function() {
        var bulletPosition = this.midpoint();
        shoot_sound.play();

        playerBullets.push(Bullet({
            speed: 5,
            x: bulletPosition.x,
            y: bulletPosition.y
        }))
    },
    launch: function() {
        var missilePostition = this.midpoint();
        console.log(Missle.width);
        playerMissiles.push(Missle({
            speed: 2,
            x: missilePostition.x - 500,
            y: missilePostition.y
        }))
    },
    midpoint: function() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    },
    explode: function() {
        this.active = false;
        explosion_sound.play();
        GameLoopMusic_sound.fadeOut(0, 2000);
        currentState = states.End;
        // An explosion sound and then end the game
    },
    lifeChange: function(change) {


        this.life = this.life + change; //Adds or subtracts health based on the value added in the function

        if (this.life <= 0) {
            this.explode();
        }

        return this.life;


    },
    reset: function() {
        this.x = INIT_X;
        this.y = INIT_Y;
        this.angle = 0;
        this.speed = 0;
        this.points = 0;
        this.tempPoints = 0;
    },
};

var INIT_CENTER_PULL = 1;
var centerPull = INIT_CENTER_PULL;

var TURNING_RADIUS = 100;
var CENTER_PULL_INCREMENT = 0.001;
var MAX_PULL = 4;
var FWD_THROTTLE = 10;


//var TO_RADIANS = Math.PI/180;
var ang = 0;
var img = new Image();
img.src = 'images/swirly.png';
var whirlpool = {
    sprite: Sprite("swirly"),
    width: 750,
    height: 750,
    x: 600,
    y: 50,
    draw: function() {
        //canvas.fillStyle = this.color;
        // canvas.fillRect(this.x, this.y, this.width, this.height);
        canvas.save(); //saves the state of canvas
        canvas.clearRect(0, 0, canvas.width, canvas.height); //clear the canvas
        canvas.translate(whirlpool.width + 400, whirlpool.height - 190); //let's translate
        canvas.rotate(Math.PI / 180 * (ang += 5)); //increment the angle and rotate the image
        //  this.sprite.draw(canvas, this.x/40000, this.y/9000);
        canvas.drawImage(img, -750 / 2, -750 / 2, whirlpool.width, whirlpool.height); //draw the image ;)

        // canvas.drawImage(img, -whirlpool.width / 2, -whirlpool.height / 2, whirlpool.width, whirlpool.height); //draw the image ;)
        canvas.restore(); //restore the state of canvas

        // draw it up and to the left by half the width
        // and height of the image
        //	context.drawImage(image, -(image.width/2), -(image.height/2));

        // and restore the co-ords to how they were when we began



        //  canvas.rotate(0.25);

    },

}
var powerups = [];
var wavecrashes = [];

function Powerup(P) {
    P = P || {};

    P.active = true;
    P.age = Math.floor(Math.random() * 500);

    P.sprite = Sprite("Sprite_32px");
    // P.color = "#A2B";

    P.x = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000,
        P.y = Math.floor(Math.random() * (1080 - 0 + 1)) + 0,
        P.xVelocity = 0
    P.yVelocity = 2;

    P.width = 32;
    P.height = 32;

    P.inBounds = function() {
        return P.x >= 0 && P.x <= CANVAS_WIDTH &&
            P.y >= 0 && P.y <= CANVAS_HEIGHT;
    };

    P.draw = function() {
        //canvas.fillStyle = this.color;
        //canvas.fillRect(this.x, this.y, this.width, this.height);
        this.sprite.draw(canvas, this.x, this.y);
    };

    P.explode = function() {
        this.active = false;
        //pickup_sound.play();
        // Extra Credit: Add an explosion graphic
    };
    var itsOn = true;
    //drowning


    P.update = function() {

        // Calculate distance to center
        var dx = WATER_CENTER_X - P.x;
        var dy = WATER_CENTER_Y - P.y;
        var centerDistance = Math.sqrt((dx * dx) + (dy * dy));

        // Calculate angle to center
        var centerAngle = Math.atan2(dy, dx);

        // Calculate velocity towards center
        // centerPull determines strength of pull, /4 so it's not as strong as player
        var centerVelX = Math.cos(centerAngle) * (centerPull / 4);
        var centerVelY = Math.sin(centerAngle) * (centerPull / 4);

        // Move pickup
        P.x += centerVelX;
        P.y += centerVelY;

        if (Math.random() < 0.5) {

            itsOn = !itsOn;
        }

        if (itsOn == true) {
            P.y = P.y + 1;
            //itsOn = false;
        } else {
            P.y = P.y - 1;
            //itsOn = true;
        }





        // P.xVelocity = 3 * Math.sin(P.age * Math.PI / 64);

        P.age++;

        P.active = P.active && P.inBounds();
    };

    return P;
};


function Wavecrash(W) {
    W = W || {};

    W.active = true;
    W.age = Math.floor(Math.random() * 500);

    W.sprite = Sprite("wavecrash");
    // P.color = "#A2B";

    W.x = 300 + Math.random() * CANVAS_WIDTH / 2;
    W.y = CANVAS_HEIGHT / 4 + Math.random() * CANVAS_HEIGHT / 2;
    W.xVelocity = 2
    W.yVelocity = 0;

    W.width = 32;
    W.height = 32;

    W.inBounds = function() {
        return W.x >= 0 && W.x <= CANVAS_WIDTH &&
            W.y >= 0 && W.y <= CANVAS_HEIGHT;
    };

    W.draw = function() {
        //canvas.fillStyle = this.color;
        //canvas.fillRect(this.x, this.y, this.width, this.height);
        this.sprite.draw(canvas, this.x, this.y);
    };

    W.explode = function() {
        this.active = false;
        //pickup_sound.play();
        // Extra Credit: Add an explosion graphic
    };



    W.update = function() {
        W.x -= W.xVelocity;
        W.y += W.yVelocity;
        //
        W.yVelocity = 3 * Math.sin(W.age * Math.PI / 64);
        W.age++;
        W.active = W.active && W.inBounds();
    };

    return W;
};
// var peoplePickup = {
//     sprite: Sprite("Sprite_32px"),
//     width: 50,
//     height: 50,
//     x: 50,
//     y: 50,
//     explode: (),
//     draw: function() {
//         this.sprite.draw(canvas, this.x, this.y);
//     },
//
// }

var shore = {
    sprite: Sprite("shore"),
    width: 320,
    height: 1920,
    x: 0,
    y: 0,
    draw: function() {
        this.sprite.draw(canvas, this.x, this.y);
    },

}

// Calculated here so the shore object exists already (yuck)
var WATER_CENTER_X = shore.width + ((CANVAS_WIDTH - shore.width) / 2);
var WATER_CENTER_Y = CANVAS_HEIGHT / 2;


function collisionDetection() {

    /*
     * private function initialize()
     *
     * Initializes the object
     *
     */
    this.initialize = function() {}


    this.hitTest = function(source, target) {
        var hit = false;
        var start = new Date().getTime();

        if (this.boxHitTest(source, target)) {
            if (this.pixelHitTest(source, target)) {
                hit = true;
            }
        }

        var end = new Date().getTime();

        if (hit == true) {
            //console.log( 'detection took: ' + (end - start) + 'ms' );
        }

        return hit;
    }


    this.boxHitTest = function(source, target) {
        return !(
            ((source.y + source.height) < (target.y)) ||
            (source.y > (target.y + target.height)) ||
            ((source.x + source.width) < target.x) ||
            (source.x > (target.x + target.width))
        );
    }


    this.pixelHitTest = function(source, target) {

        var top = parseInt(Math.max(source.y, target.y));
        var bottom = parseInt(Math.min(source.y + source.height, target.y + target.height));
        var left = parseInt(Math.max(source.x, target.x));
        var right = parseInt(Math.min(source.x + source.width, target.x + target.width));

        for (var y = top; y < bottom; y++) {
            for (var x = left; x < right; x++) {
                var pixel1 = source.pixelMap.data[(x - source.x) + "_" + (y - source.y)];
                var pixel2 = target.pixelMap.data[(x - target.x) + "_" + (y - target.y)];

                if (!pixel1 || !pixel2) {
                    continue;
                };

                if (pixel1.pixelData[3] == 255 && pixel2.pixelData[3] == 255) {
                    return true;
                }
            }
        }

        return false;
    }

    /*
     * public function buildPixelMap()
     *
     * Creates a pixel map on a canvas image. Everything
     * with a opacity above 0 is treated as a collision point.
     * Lower resolution (higher number) will generate a faster
     * but less accurate map.
     *
     *
     * @param source (Object) The canvas object
     * @param resolution (int)(DEPRECATED!) The resolution of the map
     *
     * @return object, a pixelMap object
     *
     */
    this.buildPixelMap = function(source) {
        var resolution = 1;
        var ctx = source.getContext("2d");
        var pixelMap = [];

        for (var y = 0; y < source.height; y++) {
            for (var x = 0; x < source.width; x++) {
                var dataRowColOffset = y + "_" + x; //((y * source.width) + x);
                var pixel = ctx.getImageData(x, y, resolution, resolution);
                var pixelData = pixel.data;

                pixelMap[dataRowColOffset] = {
                    x: x,
                    y: y,
                    pixelData: pixelData
                };

            }
        }
        return {
            data: pixelMap,
            resolution: resolution
        };
    }

    // Initialize the collider
    this.initialize();

    // Return our outward facing interface.
    return {
        hitTest: this.hitTest.bind(this),
        buildPixelMap: this.buildPixelMap.bind(this)
    };
};
var myNewCollission = new collisionDetection();
//Collision Detection
function collides(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}
var WaveForce = .8;
var WavePull = .8;
var yourInthePool = false;
velocityCap = 3;

function handleCollisions() {

    // if(yourInthePool === true){
    //
    //   player.velX = 0;
    //   player.velY = 0;
    //   yourInthePool = false;
    // }

    //console.log(player.velX);

    // If the player is within 50px of the center
    if (Math.abs(player.x - WATER_CENTER_X) < 50 && Math.abs(player.y - WATER_CENTER_Y) < 50) {
        // End the game
        currentState = states.End;
    }

    //PowerUp Collision
    powerups.forEach(function(powerup) {
        if (collides(powerup, player)) {
            powerup.explode();
            player.tempPoints = player.tempPoints + 1;
            //player.lifeChange(30);
        }
    });

    if (collides(shore, player)) {

        console.log(player.tempPoints);
        player.points = player.points + player.tempPoints;
        player.tempPoints = 0;
        console.log("Dropping off the kids at the pool");
        //player.points += player.tempPoints;
        //  pickup.explode();

    }
    wavecrashes.forEach(function(wavecrash) {
        if (collides(shore, wavecrash)) {


            wavecrash.explode();
        }

    })


}

/*** Parrallax background tutorial http://javacoffee.de/?p=866 **/
//Parallax background

/**
 * Data structure to hold layer data
 * @param s <string> Absolute path to the image
 * @param x <int> X coordinate
 * @param Y </int><int> Y coordinate
 */
function Layer(s, x, y) {
    this.img = new Image();
    this.img.src = s;
    this.x = x;
    this.y = y;
}


/**
 * Main ParallaxScrolling class
 * @param ctx <context> Canvas context
 * @param imgdata <array> Array with absolute image paths
 */
function ParallaxScrolling(canvas, imgdata) {
    var self = this;
    if (typeof imgdata === 'undefined') {
        imgdata = []; //fill it with paths to images for the parralax
    };
    this.canvas = canvas;

    // Initialize the layers
    this.layers = new Array(imgdata.length);
    for (i = 0; i < imgdata.length; i++) {
        this.layers[i] = new Layer(imgdata[i], 0, 0);
    }

    // Function: Move all layer except the first one
    this.Move = function() {
        for (var i = 1; i < self.layers.length; i++) {

            //    if(Math.random() < 0.3){

            if (self.layers[i].x > self.layers[i].img.width) self.layers[i].x = 0;
            self.layers[i].x += i;

            // }else{
            // //  if (self.layers[i].x > self.layers[i].img.width) self.layers[i].x = 0;
            //   self.layers[i].x -= i;
            // }


            //  debugger;
            //  if (self.layers[i].y > self.layers[i].img.width) self.layers[i].y = 0;
            // self.layers[i].y += i;
        }
    };

    // Function: Draw all layer in the canvas
    this.Draw = function() {
        self.Move();
        for (var i = 0; i < self.layers.length; i++) {
            var x1 = (self.layers[i].x - self.layers[i].img.width);
            self.canvas.drawImage(self.layers[i].img, 0, 0, self.layers[i].img.width, self.layers[i].img.height,
                self.layers[i].x, 0, self.layers[i].img.width, self.layers[i].img.height);

            self.canvas.drawImage(self.layers[i].img, 0, 0, self.layers[i].img.width, self.layers[i].img.height,
                x1, 0, self.layers[i].img.width, self.layers[i].img.height);
        }
    }
}

var layer = new Array('images/Whirlpool_Combined.png', 'images/transparent.png');
var parallax = new ParallaxScrolling(canvas, layer);

function controller() {
    //Pause the game
    if (keydown.p) {

        pauseGame();
        //  console.log(paused);

    }

}



var shoreGuys = {
    sprite: Sprite("Sprite_32px"),
    width: 32,
    height: 32,
    x: 10,
    y: 150,
    draw: function(points) {
      for (var i = 0; i < points; i++) {
        this.sprite.draw(canvas, 10, 150 + 45*i);
      }

    },

}




function populateShore(){

if(player.points >= 1){
      shoreGuys.draw(player.points);

}}

function update() { //Updates location and reaction of objects to the canvas




    if (currentState === states.splash) {

        //splashTextX += 1;
        splashTextY += 1;

        if (splashTextY >= 300) {

            currentState = states.title;
        }


    }



    if (currentState === states.title) {

        if (keydown.space) {

            currentState = states.Game;
        }


    }


    if (currentState === states.Game) {
        player.update();

        // Increase the pull towards the center
        centerPull += CENTER_PULL_INCREMENT;
        centerPull = centerPull.clamp(0, MAX_PULL);

        //Player actions

        //Powerup Update logic
        powerups.forEach(function(powerup) {
            powerup.update();
        });

        powerups = powerups.filter(function(powerup) {
            return powerup.active;
        });

        if (Math.random() < 0.01) {
            powerups.push(Powerup());
        }


        wavecrashes.forEach(function(powerup) {
            powerup.update();
        });

        wavecrashes = wavecrashes.filter(function(wavecrash) {
            return wavecrash.active;
        });

        if (Math.random() < 0.01) {
            wavecrashes.push(Wavecrash());
        }


        //Enemy Update logic


        //Handle Collision
        handleCollisions();




    }



    if (currentState === states.End) {


        endTextY = endTextY - 1;

        endTextY = endTextY.clamp(300, CANVAS_HEIGHT);

        if (keydown.r) {
          currentState = states.Game;
          player.reset();
          centerPull = INIT_CENTER_PULL;
        }
        
    }


}

function draw() { //Draws objects to the canvas

    canvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);




    if (currentState === states.splash) {

        canvas.fillStyle = "#000"; // Set color to black
        canvas.font = '25pt Calibri';
        var SPLASH_SCREEN_TEXT = "Team Splash Screen";
        splashTextX = canvas.measureText(SPLASH_SCREEN_TEXT).width;
        canvas.fillText(SPLASH_SCREEN_TEXT, (CANVAS_WIDTH / 2) - (splashTextX / 2), splashTextY);

    }


    if (currentState === states.title) {

        canvas.fillStyle = "#000"; // Set color to black
        canvas.font = 'bold 40pt Calibri';
        var GAME_NAME_TEXT = "GAME NAME";
        gameTextx = canvas.measureText(GAME_NAME_TEXT).width; //Centers the text based on length
        canvas.fillText(GAME_NAME_TEXT, (CANVAS_WIDTH / 2) - (gameTextx / 2) - 3, CANVAS_HEIGHT / 3);
        //The next two create a special text effect
        canvas.fillStyle = "#F00";
        canvas.fillText(GAME_NAME_TEXT, (CANVAS_WIDTH / 2) - (gameTextx / 2), CANVAS_HEIGHT / 3);

        canvas.fillStyle = "00F";
        canvas.fillText(GAME_NAME_TEXT, (CANVAS_WIDTH / 2) - (gameTextx / 2) + 3, CANVAS_HEIGHT / 3);


        canvas.fillStyle = "#F00";
        canvas.font = 'bold 20pt Calibri';
        var SPACEBAR_TEXT = "Press Space to Continue";
        spaceBarTextx = canvas.measureText(SPACEBAR_TEXT).width; //Centers the text based on length
        canvas.fillText(SPACEBAR_TEXT, (CANVAS_WIDTH / 2) - (spaceBarTextx / 2), CANVAS_HEIGHT - CANVAS_HEIGHT / 4);



    }

    if (currentState === states.Game) {
        parallax.Draw(); //draw background
        shore.draw();
        populateShore();
      canvas.fillStyle = "blue"; // Set color to black
      canvas.font = '20pt Calibri';
      canvas.fillText("Score:" + player.points , 115, 85);

        whirlpool.draw();
        //PowerUp Draw
        powerups.forEach(function(powerup) {
            powerup.draw();
        });

        wavecrashes.forEach(function(wavecrash) {
            wavecrash.draw();
        });
        //whirlpool Draw


        //  topleftQuad.draw();
        //  topRightQuad.draw();
        //  botleftQuad.draw();
        //botRightQuad.draw();
        //playerdraw
        player.draw();
        //peoplePickup.draw();
        //  console.log(player.y);

        //Life Bar top is pink static background
        canvas.fillStyle = "#8B8989";
        canvas.fillRect(20, 20, 200, 10);

        //Second bar is red dynamic one
        canvas.fillStyle = "#FF0000";
        canvas.fillRect(20, 20, (player.speed * FWD_THROTTLE) * 2, 10);
    }



    if (currentState === states.End) {


        canvas.fillStyle = "#F00"; // Set color to red
        canvas.font = '25pt Calibri';

        var GameOVER_TEXT = "Game Over";
        endTextX = canvas.measureText(GameOVER_TEXT).width; //Centers the text based on length
        //canvas.fillText(GameOVER_TEXT, (CANVAS_WIDTH/2) - (GameOVER_TEXTx/2) , CANVAS_HEIGHT-CANVAS_HEIGHT/4);

        canvas.fillText(GameOVER_TEXT, (CANVAS_WIDTH / 2) - (endTextX / 2), endTextY - 90);


        canvas.fillStyle = "#000"; // Set color to black
        canvas.font = '20pt Calibri';
        endTextX = canvas.measureText("First Firstnameson").width;
        canvas.fillText("First Firstnameson", (CANVAS_WIDTH / 2) - (endTextX / 2), endTextY - 45);


        canvas.fillStyle = "#000"; // Set color to black
        canvas.font = '20pt Calibri';
        canvas.fillText("Second Secondton", (CANVAS_WIDTH / 2) - (endTextX / 2), endTextY);



    }


}
