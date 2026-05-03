const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const GRID_SIZE = 10;

const STATES = {
    START_SCREEN: -1,
    PLANTING: 0,
    ANIMATING_SHINE: 1,
    GROWING: 2,
    NARRATION: 3,
    DEFENDING: 4,
    PORTAL: 5,
    LVL2_TRANSITION: 6,
    LVL2_TRASH: 7,
    LVL2_BOSS: 8,
    LVL2_VICTORY: 9,
    GAMEOVER: 10
};

let gameState = STATES.START_SCREEN;
let highestLevelReached = 1;
let animationTimer = 0;
let treesGrown = 0;
let waterSources = [
    { x: 750, y: 250, width: 50, height: 100 },
    { x: 0, y: 250, width: 50, height: 100 }
];
let playerHasWeapon = false;

// Enemy tracking
let enemiesToSpawn = 10;
let enemiesKilled = 0;
let robots = [];
let spawnTimer = 0;

// Player Health
let playerHearts = 20;
let playerMaxHearts = 20;
let regenTimer = 0;
let iFrames = 0;
let moveCooldown = 0;

// Level 2 vars
let trashes = [];
let decomposedCount = 0;
let decomposer = { x: 400, y: 50, width: 100, height: 100 };
let boss = null;
let transitionProgress = 0;

const player = {
    x: 400,
    y: 300,
    size: 40,
    carryingSeed: false,
    carryingWater: false,
    carryingTrash: 0,
    attackCooldown: 0
};

const keys = { w: false, a: false, s: false, d: false, ' ': false };

const blocks = [
    { x: 100, y: 100, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 250, y: 150, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 450, y: 100, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 650, y: 200, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 150, y: 350, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 350, y: 300, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 550, y: 350, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 650, y: 450, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 250, y: 500, size: 50, hasSeed: false, growthStage: 0, hp: 100 },
    { x: 500, y: 500, size: 50, hasSeed: false, growthStage: 0, hp: 100 }
];

const seeds = [
    { x: 50, y: 50, size: 20, collected: false },
    { x: 350, y: 50, size: 20, collected: false },
    { x: 600, y: 50, size: 20, collected: false },
    { x: 750, y: 100, size: 20, collected: false },
    { x: 50, y: 250, size: 20, collected: false },
    { x: 450, y: 200, size: 20, collected: false },
    { x: 750, y: 150, size: 20, collected: false },
    { x: 50, y: 450, size: 20, collected: false },
    { x: 350, y: 450, size: 20, collected: false },
    { x: 650, y: 550, size: 20, collected: false }
];

// Images
const imgBgBefore = new Image(); imgBgBefore.src = 'assets/background-lvl-1-before.png';
const imgBgAfter = new Image(); imgBgAfter.src = 'assets/background-lvl-1-after.png';
const imgSeed = new Image(); imgSeed.src = 'assets/seed.png';
const imgHole = new Image(); imgHole.src = 'assets/seed-hole.png';
const imgPlayer = new Image(); imgPlayer.src = 'assets/player.png';
const imgPlayerWeapon = new Image(); imgPlayerWeapon.src = 'assets/player-weapon.png';
const imgGrownTree = new Image(); imgGrownTree.src = 'assets/growntree.png';
const imgLeftPond = new Image(); imgLeftPond.src = 'assets/left-pond.png';
const imgRightPond = new Image(); imgRightPond.src = 'assets/right-pond.png';

// Sounds
const bgMusic = new Audio('musics/bg.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;
const sfxAttack = new Audio('musics/attack.mp3');
const sfxHurt = new Audio('musics/hurt.mp3');
const sfxDead = new Audio('musics/dead.mp3');
const sfxItem = new Audio('musics/item-placing.wav');
const sfxWin = new Audio('musics/win.mp3');

function playSound(audioEl) {
    let clone = audioEl.cloneNode();
    clone.volume = 0.6;
    clone.play().catch(e => console.log(e));
}

// Setup event listeners
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
    if (e.key === ' ') keys[' '] = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
    if (e.key === ' ') keys[' '] = false;
});

function checkCollision(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
    return r1x < r2x + r2w && r1x + r1w > r2x && r1y < r2y + r2h && r1y + r1h > r2y;
}

function spawnRobot(lvl2 = false) {
    let rx, ry;
    let edge = Math.floor(Math.random() * 4);
    if (edge === 0) { rx = Math.random() * canvas.width; ry = -50; } // top
    else if (edge === 1) { rx = canvas.width + 50; ry = Math.random() * canvas.height; } // right
    else if (edge === 2) { rx = Math.random() * canvas.width; ry = canvas.height + 50; } // bottom
    else { rx = -50; ry = Math.random() * canvas.height; } // left

    robots.push({
        x: Math.floor(rx / GRID_SIZE) * GRID_SIZE,
        y: Math.floor(ry / GRID_SIZE) * GRID_SIZE,
        size: 40,
        hp: 100,
        maxHp: 100,
        attackCooldown: 0,
        moveDelay: 0,
        trashThrown: 0
    });
}

function startGame() {
    document.getElementById('start-screen-ui').classList.add('hidden');
    gameState = STATES.PLANTING;
    bgMusic.play().catch(e => console.log("Audio autoplay prevented"));
    document.getElementById('accomplishment').innerHTML = '<div class="cloud"><p>Pick up yellow seeds and place them on black blocks.</p></div>';
    document.getElementById('accomplishment').classList.remove('hidden');
    setTimeout(() => { document.getElementById('accomplishment').classList.add('hidden'); }, 5000);
}

// Make sure it's globally available for the button onclick
window.startGame = startGame;

function initLevel2() {
    gameState = STATES.LVL2_TRASH;
    highestLevelReached = 2; // Checkpoint saved!
    player.x = 400;
    player.y = 500;
    robots = [];
    trashes = [];
    decomposedCount = 0;
    boss = null;
    enemiesToSpawn = 15; // More enemies for lvl 2
    spawnTimer = 180;
    
    for (let i = 0; i < 10; i++) {
        let tx = Math.floor(Math.random() * ((canvas.width - 50)/GRID_SIZE)) * GRID_SIZE;
        let ty = Math.floor(Math.random() * ((canvas.height - 50)/GRID_SIZE)) * GRID_SIZE;
        if (tx < 50) tx = 50;
        if (ty < 150) ty += 150; // Keep away from decomposer
        trashes.push({ x: tx, y: ty, collected: false });
    }
}

function spawnBoss() {
    boss = {
        x: 350,
        y: 100,
        width: 100,
        height: 100,
        hp: 40, // 40 Hearts
        maxHp: 40,
        moveDelay: 0,
        attackCooldown: 0,
        chargeTimer: 0
    };
    gameState = STATES.LVL2_BOSS;
}

function triggerGameOver(reason) {
    gameState = STATES.GAMEOVER;
    bgMusic.pause();
    playSound(sfxDead);
    if (reason) {
        const acc = document.getElementById('accomplishment');
        acc.innerHTML = `<div class="cloud" style="color:red;border-color:darkred;"><p>${reason}</p></div>`;
        acc.classList.remove('hidden');
    }
    document.getElementById('gameover-ui').classList.remove('hidden');
    
    const btnLvl2 = document.getElementById('btn-restart-lvl2');
    if (highestLevelReached < 2) {
        btnLvl2.style.display = 'none';
    } else {
        btnLvl2.style.display = 'block';
    }
}

function restartGame(level) {
    document.getElementById('gameover-ui').classList.add('hidden');
    document.getElementById('accomplishment').classList.add('hidden');
    
    confetti = [];
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log(e));
    
    playerHearts = playerMaxHearts;
    iFrames = 60;
    player.carryingSeed = false;
    player.carryingWater = false;
    player.carryingTrash = 0;
    player.attackCooldown = 0;
    
    if (level === 1) {
        gameState = STATES.PLANTING;
        treesGrown = 0;
        playerHasWeapon = false;
        player.x = 400;
        player.y = 300;
        for (let b of blocks) {
            b.hasSeed = false;
            b.growthStage = 0;
            b.hp = 100;
        }
        for (let s of seeds) s.collected = false;
        document.getElementById('accomplishment').innerHTML = '<div class="cloud"><p>Pick up yellow seeds and place them on black blocks.</p></div>';
        document.getElementById('accomplishment').classList.remove('hidden');
        setTimeout(() => { document.getElementById('accomplishment').classList.add('hidden'); }, 5000);
        enemiesToSpawn = 10;
        enemiesKilled = 0;
        robots = [];
        spawnTimer = 0;
        transitionProgress = 0;
    } else if (level === 2) {
        initLevel2();
    }
}

window.restartGame = restartGame;

let confetti = [];
function createConfetti() {
    for (let i = 0; i < 200; i++) {
        confetti.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20 - 10,
            size: Math.random() * 8 + 4,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            life: 1.0
        });
    }
}

function update() {
    if (gameState === STATES.GAMEOVER || gameState === STATES.START_SCREEN) return;

    if (gameState === STATES.LVL2_VICTORY) {
        for (let c of confetti) {
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.4; // gravity
            c.life -= 0.005;
        }
        return;
    }

    // Player Regen
    regenTimer++;
    if (regenTimer >= 180) { // 3 seconds
        if (playerHearts < playerMaxHearts) playerHearts++;
        regenTimer = 0;
    }
    if (iFrames > 0) iFrames--;
    if (player.attackCooldown > 0) player.attackCooldown--;

    // Grid Movement
    if (moveCooldown > 0) moveCooldown--;
    if (moveCooldown <= 0 && gameState !== STATES.LVL2_TRANSITION) {
        let moved = false;
        if (keys.w) { player.y -= GRID_SIZE; moved = true; }
        else if (keys.s) { player.y += GRID_SIZE; moved = true; }
        else if (keys.a) { player.x -= GRID_SIZE; moved = true; }
        else if (keys.d) { player.x += GRID_SIZE; moved = true; }
        
        if (moved) {
            if (player.x < 0) player.x = 0;
            if (player.x >= canvas.width) player.x = canvas.width - player.size;
            if (player.y < 0) player.y = 0;
            if (player.y >= canvas.height) player.y = canvas.height - player.size;
            moveCooldown = 3; // Snap movement delay (decreased speed)
        }
    }

    if (gameState === STATES.PLANTING) {
        // Collect seeds
        if (!player.carryingSeed) {
            for (let seed of seeds) {
                if (!seed.collected && checkCollision(player.x, player.y, player.size, player.size, seed.x, seed.y, seed.size, seed.size)) {
                    seed.collected = true;
                    player.carryingSeed = true;
                    playSound(sfxItem);
                    break;
                }
            }
        }

        // Place seeds
        let allFilled = true;
        for (let block of blocks) {
            if (checkCollision(player.x, player.y, player.size, player.size, block.x, block.y, block.size, block.size)) {
                if (player.carryingSeed && !block.hasSeed) {
                    block.hasSeed = true;
                    player.carryingSeed = false;
                    playSound(sfxItem);
                }
            }
            if (!block.hasSeed) allFilled = false;
        }

        if (allFilled) {
            gameState = STATES.ANIMATING_SHINE;
            animationTimer = 100;
        }
    } else if (gameState === STATES.ANIMATING_SHINE) {
        animationTimer--;
        if (animationTimer <= 0) {
            gameState = STATES.GROWING;
            const acc = document.getElementById('accomplishment');
            acc.innerHTML = '<div class="cloud"><p>Earth is healing! Water the seeds to grow them into trees.</p></div>';
            acc.classList.remove('hidden');
            setTimeout(() => { acc.classList.add('hidden'); }, 4000);
        }
    } else if (gameState === STATES.GROWING) {
        // Water pickup
        if (!player.carryingWater && !player.carryingSeed) {
            for (let ws of waterSources) {
                if (checkCollision(player.x, player.y, player.size, player.size, ws.x, ws.y, ws.width, ws.height)) {
                    player.carryingWater = true;
                    playSound(sfxItem);
                    break;
                }
            }
        }

        // Watering plants
        if (player.carryingWater) {
            for (let block of blocks) {
                if (block.growthStage < 2 && block.hp > 0 && block.hasSeed) {
                    if (checkCollision(player.x, player.y, player.size, player.size, block.x, block.y, block.size, block.size)) {
                        block.growthStage++;
                        player.carryingWater = false;
                        playSound(sfxItem);
                        if (block.growthStage === 2) treesGrown++;
                        break;
                    }
                }
            }
        }
        
        if (treesGrown >= 5 && !playerHasWeapon) {
            playerHasWeapon = true;
            const acc = document.getElementById('accomplishment');
            acc.innerHTML = '<div class="cloud"><p>You got a weapon! Press Spacebar to attack.</p></div>';
            acc.classList.remove('hidden');
            setTimeout(() => { acc.classList.add('hidden'); }, 4000);
        }
        
        if (treesGrown >= 10) {
            gameState = STATES.NARRATION;
            animationTimer = 400; // ~6.5 seconds
            const acc = document.getElementById('accomplishment');
            acc.innerHTML = '<div class="cloud" style="color:#d35400;border-color:#e74c3c;"><p>WARNING: Enemies have deployed high tech to stop your solarpunk efforts. Protect the trees!</p></div>';
            acc.classList.remove('hidden');
        }
    } else if (gameState === STATES.NARRATION) {
        animationTimer--;
        if (animationTimer <= 0) {
            document.getElementById('accomplishment').classList.add('hidden');
            gameState = STATES.DEFENDING;
        }
    } else if (gameState === STATES.DEFENDING) {
        spawnTimer--;
        if (spawnTimer <= 0 && enemiesToSpawn > 0) {
            spawnRobot();
            enemiesToSpawn--;
            spawnTimer = 180; // 3 seconds delay
        }

        if (enemiesKilled >= 10 && robots.length === 0) {
            gameState = STATES.PORTAL;
            const acc = document.getElementById('accomplishment');
            acc.innerHTML = '<div class="cloud"><p>You saved the trees! Step into the portal to proceed to Level 2.</p></div>';
            acc.classList.remove('hidden');
            setTimeout(() => { acc.classList.add('hidden'); }, 4000); // Disappears after 4 seconds
        }
        
    } else if (gameState === STATES.PORTAL) {
        // Portal is at 425, 325 (center), radius 40. AABB approx 385, 285, 80, 80.
        if (checkCollision(player.x, player.y, player.size, player.size, 385, 285, 80, 80)) {
            gameState = STATES.LVL2_TRANSITION;
            document.getElementById('accomplishment').classList.add('hidden');
        }
    } else if (gameState === STATES.LVL2_TRANSITION) {
        transitionProgress += 5; // Pixels per frame
        if (transitionProgress > canvas.height / 2) {
            initLevel2();
        }
    } else if (gameState === STATES.LVL2_TRASH) {
        spawnTimer--;
        if (spawnTimer <= 0 && enemiesToSpawn > 0) {
            spawnRobot(true);
            enemiesToSpawn--;
            spawnTimer = 240; // 4 seconds
        }

        // Collect trash
        if (player.carryingTrash < 2) {
            for (let t of trashes) {
                if (!t.collected && checkCollision(player.x, player.y, player.size, player.size, t.x, t.y, 30, 30)) {
                    t.collected = true;
                    player.carryingTrash++;
                    playSound(sfxItem);
                    break;
                }
            }
        }

        // Deposit trash
        if (player.carryingTrash > 0) {
            if (checkCollision(player.x, player.y, player.size, player.size, decomposer.x, decomposer.y, decomposer.width, decomposer.height)) {
                decomposedCount += player.carryingTrash;
                player.carryingTrash = 0;
                playSound(sfxItem);
            }
        }

        // Boss spawns when NO uncollected trash remains AND all enemies are dead.
        let allClean = trashes.every(t => t.collected) && player.carryingTrash === 0;
        if (allClean && robots.length === 0 && enemiesToSpawn <= 0) {
            spawnBoss();
        }
    } else if (gameState === STATES.LVL2_BOSS) {
        if (boss.chargeTimer > 0) {
            boss.chargeTimer--;
            if (boss.chargeTimer <= 0) {
                // Charge finished! Deal damage if player is still in hitbox
                if (checkCollision(player.x, player.y, player.size, player.size, boss.x, boss.y, boss.width, boss.height)) {
                    playerHearts -= 3;
                    iFrames = 60;
                    playSound(sfxHurt);
                    
                    // Knockback
                    let dx = (player.x + player.size/2) - (boss.x + boss.width/2);
                    let dy = (player.y + player.size/2) - (boss.y + boss.height/2);
                    let len = Math.hypot(dx, dy);
                    if (len > 0) {
                        player.x += (dx / len) * 120;
                        player.y += (dy / len) * 120;
                        if (player.x < 0) player.x = 0;
                        if (player.x > canvas.width - player.size) player.x = canvas.width - player.size;
                        if (player.y < 0) player.y = 0;
                        if (player.y > canvas.height - player.size) player.y = canvas.height - player.size;
                    }
                    
                    if (playerHearts <= 0) {
                        triggerGameOver("Game Over! You were defeated.");
                    }
                }
            }
        } else {
            if (boss.moveDelay > 0) boss.moveDelay--;
            if (boss.moveDelay <= 0) {
                // Move boss toward player in grid
                let dx = player.x - boss.x;
                let dy = player.y - boss.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    boss.x += dx > 0 ? GRID_SIZE : -GRID_SIZE;
                } else {
                    boss.y += dy > 0 ? GRID_SIZE : -GRID_SIZE;
                }
                boss.moveDelay = 5; // Boss speed adapted for 10px grid
            }
            
            // Check collision to START charge
            if (iFrames <= 0) {
                if (checkCollision(player.x, player.y, player.size, player.size, boss.x, boss.y, boss.width, boss.height)) {
                    boss.chargeTimer = 18; // 0.3 seconds delay charge
                }
            }
        }

        // Player attacks boss
        if (keys[' '] && player.attackCooldown <= 0) {
            if (checkCollision(player.x - 20, player.y - 20, player.size + 40, player.size + 40, boss.x, boss.y, boss.width, boss.height)) {
                boss.hp -= 5; // 5 hearts of damage (40 total = 8 hits)
                player.attackCooldown = 30;
                playSound(sfxAttack);
                if (boss.hp <= 0) {
                    gameState = STATES.LVL2_VICTORY;
                    bgMusic.pause();
                    playSound(sfxWin);
                    createConfetti();
                    const acc = document.getElementById('accomplishment');
                    acc.innerHTML = '<div class="cloud"><p>VICTORY! You cleaned the room, defeated the boss, and saved Solarpunk Earth!</p></div>';
                    acc.classList.remove('hidden');
                }
            }
        }
    }

    // Shared Robot logic
    if (gameState === STATES.DEFENDING || gameState === STATES.LVL2_TRASH) {
        let remainingTrees = 0;
        if (gameState < STATES.LVL2_TRANSITION) {
            for (let b of blocks) {
                if (b.growthStage === 2 && b.hp > 0) remainingTrees++;
            }
            if (remainingTrees === 0) {
                triggerGameOver("Game Over! All trees destroyed.");
            }
        }

        for (let i = robots.length - 1; i >= 0; i--) {
            let robot = robots[i];
            if (robot.hp <= 0) {
                robots.splice(i, 1);
                if (gameState === STATES.DEFENDING) enemiesKilled++;
                continue;
            }

            if (robot.moveDelay > 0) robot.moveDelay--;
            
            // Periodically throw trash in Level 2
            if (gameState === STATES.LVL2_TRASH) {
                if (robot.trashThrown === undefined) robot.trashThrown = 0;
                // Only throw if in center region and less than 3 times
                if (robot.x > 100 && robot.x < 700 && robot.y > 100 && robot.y < 500) {
                    if (robot.trashThrown < 3 && Math.random() < 0.005) { 
                        trashes.push({ x: robot.x, y: robot.y, collected: false });
                        robot.trashThrown++;
                    }
                }
            }
            
            // Player collision
            if (checkCollision(player.x, player.y, player.size, player.size, robot.x, robot.y, robot.size, robot.size) && iFrames <= 0) {
                playerHearts -= 2;
                iFrames = 60;
                playSound(sfxHurt);
                if (playerHearts <= 0) {
                    triggerGameOver("Game Over! You were defeated.");
                }
            }

            // Find target
            let target = null;
            if (gameState === STATES.LVL2_TRASH) {
                target = player; // In level 2 they hunt player
            } else {
                let minDist = Infinity;
                for (let block of blocks) {
                    if (block.growthStage > 0 && block.hp > 0) {
                        let dist = Math.abs(robot.x - block.x) + Math.abs(robot.y - block.y);
                        if (dist < minDist) {
                            minDist = dist;
                            target = block;
                        }
                    }
                }
            }

            if (target) {
                let dx = target.x - robot.x;
                let dy = target.y - robot.y;
                let dist = Math.abs(dx) + Math.abs(dy);
                
                if (dist > 10 && robot.moveDelay <= 0) { // Adapted for 10px grid
                    if (Math.abs(dx) > Math.abs(dy)) {
                        robot.x += dx > 0 ? GRID_SIZE : -GRID_SIZE;
                    } else {
                        robot.y += dy > 0 ? GRID_SIZE : -GRID_SIZE;
                    }
                    robot.moveDelay = 8; // Robot moves faster per step on 10px grid
                } else if (dist <= 10 && gameState === STATES.DEFENDING) {
                    if (robot.attackCooldown <= 0) {
                        target.hp -= 20;
                        robot.attackCooldown = 60;
                        if (target.hp <= 0) {
                            let oldStage = target.growthStage;
                            target.growthStage = 0;
                            target.hasSeed = false; 
                            if (oldStage === 2) treesGrown--;
                        }
                    }
                }
            }
            if (robot.attackCooldown > 0) robot.attackCooldown--;

            // Player attacks robot
            if (playerHasWeapon && keys[' '] && player.attackCooldown <= 0) {
                if (checkCollision(player.x - 20, player.y - 20, player.size + 40, player.size + 40, robot.x, robot.y, robot.size, robot.size)) {
                    robot.hp -= 50;
                    player.attackCooldown = 30; // 0.5s cooldown
                    playSound(sfxAttack);
                }
            }
        }
    }
    
    if (playerHearts <= 0 && gameState !== STATES.GAMEOVER) {
        triggerGameOver("Game Over! You were defeated.");
    }
}

function drawHUD() {
    // Draw Health Bar
    ctx.fillStyle = '#c0392b';
    ctx.font = "20px Arial";
    ctx.fillText("Health: ", 10, 30);
    for (let i = 0; i < playerMaxHearts; i++) {
        if (i < playerHearts) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText("♥", 80 + (i * 20), 30);
        } else {
            ctx.fillStyle = '#7f8c8d';
            ctx.fillText("♡", 80 + (i * 20), 30);
        }
    }
    
    if (gameState === STATES.LVL2_TRASH) {
        ctx.fillStyle = '#fff';
        let uncollected = trashes.filter(t => !t.collected).length;
        ctx.fillText(`Trash Left in Room: ${uncollected}`, 550, 30);
    }
}

function draw() {
    if (gameState === STATES.START_SCREEN) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background logic
    if (gameState >= STATES.LVL2_TRASH) {
        ctx.fillStyle = '#34495e'; // Dark room
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        if (treesGrown >= 10) {
            if (imgBgAfter.complete && imgBgAfter.naturalWidth > 0) {
                ctx.drawImage(imgBgAfter, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = '#4CAF50'; // Fallback grass
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } else {
            if (imgBgBefore.complete && imgBgBefore.naturalWidth > 0) {
                ctx.drawImage(imgBgBefore, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = '#c2b280'; // Fallback dry ground
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    if (gameState < STATES.LVL2_TRANSITION) {
        // Shine animation from top-left
        if (gameState === STATES.ANIMATING_SHINE) {
            let opacity = (100 - animationTimer) / 100;
            let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, `rgba(255, 255, 200, ${opacity})`);
            grad.addColorStop(1, `rgba(255, 255, 200, 0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(canvas.width, canvas.height/2);
            ctx.moveTo(0, 0);
            ctx.lineTo(canvas.width/2, canvas.height);
            ctx.moveTo(0, 0);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.stroke();
        }

        // Water source
        if (gameState >= STATES.GROWING && gameState < STATES.DEFENDING) {
            for (let ws of waterSources) {
                if (ws.x === 0) { // Left Pond
                    if (imgLeftPond.complete && imgLeftPond.naturalWidth > 0) {
                        ctx.drawImage(imgLeftPond, ws.x, ws.y, ws.width, ws.height);
                    } else {
                        ctx.fillStyle = '#00BFFF';
                        ctx.fillRect(ws.x, ws.y, ws.width, ws.height);
                        ctx.fillStyle = '#fff';
                        ctx.font = "bold 14px Arial";
                        ctx.fillText("POND", ws.x + 5, ws.y + ws.height/2);
                    }
                } else { // Right Pond
                    if (imgRightPond.complete && imgRightPond.naturalWidth > 0) {
                        ctx.drawImage(imgRightPond, ws.x, ws.y, ws.width, ws.height);
                    } else {
                        ctx.fillStyle = '#00BFFF';
                        ctx.fillRect(ws.x, ws.y, ws.width, ws.height);
                        ctx.fillStyle = '#fff';
                        ctx.font = "bold 14px Arial";
                        ctx.fillText("POND", ws.x + 5, ws.y + ws.height/2);
                    }
                }
            }
        }

        // Draw blocks and plants
        for (let block of blocks) {
            if (treesGrown < 10) {
                if (imgHole.complete && imgHole.naturalWidth > 0) {
                    ctx.drawImage(imgHole, block.x, block.y, block.size, block.size);
                } else {
                    ctx.fillStyle = 'black';
                    ctx.fillRect(block.x, block.y, block.size, block.size);
                }
            } else {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(block.x, block.y, block.size, block.size);
            }
            
            if (block.growthStage === 0 && block.hasSeed) {
                if (imgSeed.complete && imgSeed.naturalWidth > 0) {
                    ctx.drawImage(imgSeed, block.x + 10, block.y + 10, 30, 30);
                } else {
                    ctx.fillStyle = '#ffcc00';
                    ctx.beginPath();
                    ctx.arc(block.x + 25, block.y + 25, 10, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (block.growthStage === 1) { 
                ctx.fillStyle = '#90EE90';
                ctx.fillRect(block.x + 20, block.y + 30, 10, -20);
            } else if (block.growthStage === 2) { 
                if (imgGrownTree.complete && imgGrownTree.naturalWidth > 0) {
                    ctx.drawImage(imgGrownTree, block.x - 10, block.y - 40, block.size + 20, block.size + 40);
                } else {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(block.x + 15, block.y + 15, 20, 35);
                    ctx.fillStyle = '#006400';
                    ctx.beginPath();
                    ctx.arc(block.x + 25, block.y, 25, 0, Math.PI*2);
                    ctx.fill();
                }
                
                // Tree HP Bar
                if (block.hp < 100) {
                    ctx.fillStyle = 'red';
                    ctx.fillRect(block.x, block.y - 15, block.size, 5);
                    ctx.fillStyle = '#32CD32';
                    ctx.fillRect(block.x, block.y - 15, block.size * (block.hp / 100), 5);
                }
            }
        }

        // Portal
        if (gameState === STATES.PORTAL) {
            ctx.fillStyle = 'purple';
            ctx.beginPath();
            ctx.arc(425, 325, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'fuchsia';
            ctx.beginPath();
            ctx.arc(425, 325, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw uncollected seeds
        if (gameState === STATES.PLANTING) {
            for (let seed of seeds) {
                if (!seed.collected) {
                    if (imgSeed.complete && imgSeed.naturalWidth > 0) {
                        ctx.drawImage(imgSeed, seed.x + 10, seed.y + 10, 30, 30);
                    } else {
                        ctx.fillStyle = '#ffcc00';
                        ctx.beginPath();
                        ctx.arc(seed.x + 25, seed.y + 25, 10, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }

    if (gameState === STATES.LVL2_TRANSITION) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, transitionProgress);
        ctx.stroke();
        return; // Don't draw player during transition
    }

    if (gameState >= STATES.LVL2_TRASH) {
        // Decomposer
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(decomposer.x, decomposer.y, decomposer.width, decomposer.height);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 16px Arial";
        ctx.fillText("RECYCLE", decomposer.x + 15, decomposer.y + 50);

        // Trashes
        for (let t of trashes) {
            if (!t.collected) {
                ctx.fillStyle = '#95a5a6'; // trash color
                ctx.beginPath();
                ctx.moveTo(t.x + 10, t.y + 40);
                ctx.lineTo(t.x + 25, t.y + 10);
                ctx.lineTo(t.x + 40, t.y + 40);
                ctx.fill();
            }
        }
    }

    // Draw Boss
    if (gameState === STATES.LVL2_BOSS && boss) {
        // Blink red when charging
        if (boss.chargeTimer > 0 && boss.chargeTimer % 10 < 5) {
            ctx.fillStyle = '#e74c3c'; // Bright red
            ctx.fillRect(boss.x - 5, boss.y - 5, boss.width + 10, boss.height + 10);
        } else {
            ctx.fillStyle = '#8e44ad';
            ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(boss.x + 10, boss.y + 10, boss.width - 20, boss.height - 20);
        }
        
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x + 20, boss.y + 30, 20, 20);
        ctx.fillRect(boss.x + 60, boss.y + 30, 20, 20);
        
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x, boss.y - 15, boss.width, 10);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(boss.x, boss.y - 15, boss.width * (boss.hp / boss.maxHp), 10);
    }

    // Draw Robots
    for (let robot of robots) {
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(robot.x, robot.y, robot.size, robot.size);
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(robot.x + 4, robot.y + 4, robot.size - 8, robot.size - 8);
        
        ctx.fillStyle = 'red';
        ctx.fillRect(robot.x + 8, robot.y + 10, 6, 6);
        ctx.fillRect(robot.x + 26, robot.y + 10, 6, 6);
        
        ctx.fillStyle = 'red';
        ctx.fillRect(robot.x, robot.y - 10, robot.size, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(robot.x, robot.y - 10, robot.size * (robot.hp / robot.maxHp), 5);
    }

    // Draw player
    ctx.save();
    ctx.translate(player.x + 20, player.y + 20); // Center of player (size is 40)
    
    if (keys[' '] && playerHasWeapon && player.attackCooldown > 15) {
        ctx.rotate(Math.PI / 6);
    }
    
    // Blink if iFrames
    if (iFrames % 10 < 5) {
        let currentImg = playerHasWeapon ? imgPlayerWeapon : imgPlayer;
        if (currentImg.complete && currentImg.naturalWidth > 0) {
            ctx.drawImage(currentImg, -20, -20, 40, 40);
        } else {
            ctx.fillStyle = playerHasWeapon ? 'purple' : '#3498db';
            ctx.fillRect(-20, -20, 40, 40);
            ctx.fillStyle = '#f1c40f'; 
            ctx.fillRect(-10, -10, 20, 20);
        }
    }
    ctx.restore();

    // Carrying Indicator
    if (player.carryingSeed) {
        if (imgSeed.complete && imgSeed.naturalWidth > 0) {
            ctx.drawImage(imgSeed, player.x + 10, player.y - 20, 20, 20);
        } else {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(player.x + 20, player.y - 10, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (player.carryingWater) {
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(player.x + 20, player.y - 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'blue';
        ctx.stroke();
    } else if (player.carryingTrash > 0) {
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.moveTo(player.x + 10, player.y - 5);
        ctx.lineTo(player.x + 20, player.y - 25);
        ctx.lineTo(player.x + 30, player.y - 5);
        ctx.fill();
        if (player.carryingTrash === 2) {
            ctx.beginPath();
            ctx.moveTo(player.x + 15, player.y - 15);
            ctx.lineTo(player.x + 25, player.y - 35);
            ctx.lineTo(player.x + 35, player.y - 15);
            ctx.fill();
        }
    }

    drawHUD();

    if (gameState === STATES.LVL2_VICTORY) {
        for (let c of confetti) {
            if (c.life > 0) {
                ctx.globalAlpha = Math.max(0, c.life);
                ctx.fillStyle = c.color;
                ctx.fillRect(c.x, c.y, c.size, c.size);
            }
        }
        ctx.globalAlpha = 1.0;
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
