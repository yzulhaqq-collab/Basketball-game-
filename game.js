const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const socket = io();

// GAME STATE
let players = {};
let ball = { x: 400, y: 200 };
let score = { p1: 0, p2: 0 };
let winner = null;

let role = "spectator";
let queuePosition = null;

let player = {
  x: 100,
  y: 300,
  dy: 0,
  onGround: true,
  color: Math.random() > 0.5 ? "blue" : "red"
};

let keys = {};
// MOBILE CONTROLS
document.getElementById("left").ontouchstart = () => keys["a"] = true;
document.getElementById("left").ontouchend = () => keys["a"] = false;

document.getElementById("right").ontouchstart = () => keys["d"] = true;
document.getElementById("right").ontouchend = () => keys["d"] = false;

document.getElementById("jump").ontouchstart = () => keys["w"] = true;
document.getElementById("jump").ontouchend = () => keys["w"] = false;

document.getElementById("shoot").ontouchstart = () => socket.emit("shoot");

// START BUTTON
document.getElementById("startBtn").onclick = () => {
  gameState = "playing";
};
let gameState = "menu";

// SOCKET EVENTS
socket.on("role", r => role = r);
socket.on("updatePlayers", p => players = p);
socket.on("ballUpdate", b => ball = b);
socket.on("scoreUpdate", s => score = s);
socket.on("winner", w => winner = w);
socket.on("queuePosition", pos => queuePosition = pos);

// INPUT
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// MENU + ACTION KEYS
document.addEventListener("keydown", e => {
  if (gameState === "menu" && e.key === "Enter") {
    gameState = "playing";
  }

  if (e.key === "r") {
    socket.emit("restart");
  }

  if (e.code === "Space") {
    socket.emit("shoot");
  }
});

// UPDATE
function update() {
  if (gameState !== "playing") return;
  if (role !== "player") return;

  // movement
  if (keys["a"]) player.x -= 5;
  if (keys["d"]) player.x += 5;

  // jump
  if (keys["w"] && player.onGround) {
    player.dy = -10;
    player.onGround = false;
  }

  // gravity
  player.dy += 0.5;
  player.y += player.dy;

  // ground collision
  if (player.y >= 300) {
    player.y = 300;
    player.dy = 0;
    player.onGround = true;
  }

  // send movement
  socket.emit("move", player);
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, 800, 400);

  // MENU
  if (gameState === "menu") {
    ctx.fillStyle = "black";
    ctx.font = "40px Arial";
    ctx.fillText("🏀 Basketball PvP", 200, 150);

    ctx.font = "20px Arial";
    ctx.fillText("Press ENTER to Play", 250, 220);
    return;
  }

  // DRAW PLAYERS
  for (let id in players) {
    let p = players[id];
    // DOODLE PLAYER
// body
ctx.fillStyle = p.color || "blue";
ctx.fillRect(p.x, p.y + 20, 30, 30);

//outline 
ctx.strokeStyle = "black";
ctx.strokeRect(p.x, p.y + 20, 30, 30);

// head
ctx.beginPath();
ctx.arc(p.x + 15, p.y + 10, 10, 0, Math.PI * 2);
ctx.fill();


// eyes
ctx.fillStyle = "white";
ctx.fillRect(p.x + 8, p.y + 5, 5, 5);
ctx.fillRect(p.x + 17, p.y + 5, 5, 5);
  }

  // DRAW BALL
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
  ctx.fill();

  // SCORE
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("P1: " + (score.p1 || 0), 20, 30);
  ctx.fillText("P2: " + (score.p2 || 0), 700, 30);

  // WINNER
  if (winner) {
    ctx.font = "30px Arial";
    ctx.fillText(winner, 250, 200);
  }

  // SPECTATOR UI
  if (role === "spectator") {
    ctx.font = "16px Arial";
    ctx.fillText("👀 Watching", 350, 20);

    if (queuePosition) {
      ctx.fillText("Queue: #" + queuePosition, 350, 40);
    }
  }
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();