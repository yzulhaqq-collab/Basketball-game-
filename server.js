const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));

// GAME STATE
let players = {};
let spectators = {};
let playerSlots = [];
let queue = [];

let ball = { x: 400, y: 200, dx: 0, dy: 0, owner: null };
let score = { p1: 0, p2: 0 };
let winner = null;

let hoopLeft = { x: 50, y: 200, w: 10, h: 80 };
let hoopRight = { x: 700, y: 200, w: 10, h: 80 };

// CONNECTION
io.on("connection", socket => {

  if (playerSlots.length < 2) {
    players[socket.id] = { x: playerSlots.length ? 600 : 100, y: 300, onGround: true };
    playerSlots.push(socket.id);
    socket.emit("role", "player");
  } else {
    spectators[socket.id] = true;
    queue.push(socket.id);
    socket.emit("role", "spectator");
    socket.emit("queuePosition", queue.length);
  }

  updateQueue();

  socket.on("move", data => {
    if (!players[socket.id]) return;
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].onGround = data.onGround;
  });

  socket.on("shoot", () => {
    if (ball.owner === socket.id) {
      ball.owner = null;
      ball.dx = 6;
      ball.dy = -10;
    }
  });

  socket.on("restart", () => rotatePlayers());

  socket.on("disconnect", () => {
    delete players[socket.id];
    delete spectators[socket.id];
    queue = queue.filter(id => id !== socket.id);
    playerSlots = playerSlots.filter(id => id !== socket.id);
    updateQueue();
  });

});

// GAME LOOP
setInterval(() => {
  if (winner) return;

  // BALL PHYSICS
  if (!ball.owner) {
    ball.dy += 0.5;
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y > 300) {
      ball.y = 300;
      ball.dy *= -0.5;
    }
  }

  // BLOCK → STEAL
  for (let id in players) {
    let p = players[id];
    let dist = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (dist < 40 && !p.onGround) {
      ball.owner = id;
      ball.dx = 0;
      ball.dy = 0;
    }
  }

  // FOLLOW OWNER
  if (ball.owner && players[ball.owner]) {
    let p = players[ball.owner];
    ball.x = p.x + 20;
    ball.y = p.y + 40;
  }

  // SCORING
  if (inHoop(ball, hoopRight)) {
    score.p1++;
    if (score.p1 >= 10) winner = "Player 1 Wins!";
    resetBall();
  }

  if (inHoop(ball, hoopLeft)) {
    score.p2++;
    if (score.p2 >= 10) winner = "Player 2 Wins!";
    resetBall();
  }

  io.emit("updatePlayers", players);
  io.emit("ballUpdate", ball);
  io.emit("scoreUpdate", score);
  io.emit("winner", winner);

}, 1000 / 60);

// HELPERS
function inHoop(b, h) {
  return b.x > h.x && b.x < h.x + h.w && b.y > h.y && b.y < h.y + h.h;
}

function resetBall() {
  ball = { x: 400, y: 200, dx: 0, dy: 0, owner: null };
}

function updateQueue() {
  queue.forEach((id, i) => {
    io.to(id).emit("queuePosition", i + 1);
  });
}

function rotatePlayers() {
  playerSlots.forEach(id => {
    spectators[id] = true;
    queue.push(id);
  });

  players = {};
  playerSlots = [];

  for (let i = 0; i < 2; i++) {
    let next = queue.shift();
    if (next) {
      players[next] = { x: i ? 600 : 100, y: 300, onGround: true };
      playerSlots.push(next);
      io.to(next).emit("role", "player");
    }
  }

  updateQueue();
  score = { p1: 0, p2: 0 };
  winner = null;
  resetBall();
}

http.listen(3000, () => console.log("Server running"));