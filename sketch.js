let capture;
let handPose;
let hands = [];

// 遊戲狀態與變數
let gameState = "WAITING"; // WAITING, COUNTDOWN, RESULT, MENU, RESTARTING, GAMEOVER
let countdownValue = 3;
let timerStart = 0;
let resultStartTime = 0;
let computerChoice = "";
let playerGesture = "None";
let resultMessage = "";

function preload() {
  // 載入 ml5.js 的 handPose 模型
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.size(640, 480); // 設定固定偵測解析度以維持穩定性
  capture.hide(); // 隱藏預設產生的 HTML 影片元件

  // 開始對攝影機影像進行手勢偵測
  handPose.detectStart(capture, gotHands);
  textAlign(CENTER, CENTER);
}

function draw() {
  background('#999999');

  let w = width * 0.5;
  let h = height * 0.5;
  let x = (width - w) / 2;
  let y = (height - h) / 2;

  push();
  // 將座標原點移至影像顯示區域的右上角，並進行水平翻轉
  translate(x + w, y);
  scale(-1, 1);
  image(capture, 0, 0, w, h);

  // 繪製手勢關鍵點連線
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    // 根據需求將特定編號的關鍵點串成線
    drawConnect(hand.keypoints, [0, 1, 2, 3, 4], w, h);
    drawConnect(hand.keypoints, [5, 6, 7, 8], w, h);
    drawConnect(hand.keypoints, [9, 10, 11, 12], w, h);
    drawConnect(hand.keypoints, [13, 14, 15, 16], w, h);
    drawConnect(hand.keypoints, [17, 18, 19, 20], w, h);
  }
  pop();

  
  // 處理遊戲邏輯與 UI 顯示
  handleGameLogic();
  displayUI();
}

function gotHands(results) {
  hands = results;
  if (hands.length > 0) {
    playerGesture = classifyGesture(hands[0]);
  } else {
    playerGesture = "None";
  }
}

// 簡易手勢分類演算法
function classifyGesture(hand) {
  let kps = hand.keypoints;
  // 比對指尖與關節的 Y 座標 (p5 中 Y 越小越高)
  let indexUp = kps[8].y < kps[6].y;
  let middleUp = kps[12].y < kps[10].y;
  let ringUp = kps[16].y < kps[14].y;
  let pinkyUp = kps[20].y < kps[18].y;
  
  // 偵測大拇指朝上/朝下 (利用拇指尖編號 4 與拇指根部編號 2 的 Y 座標比較)
  // 並且其他手指需收起 (Rock 狀態)
  let othersClosed = !indexUp && !middleUp && !ringUp && !pinkyUp;
  
  // 拇指朝上：4號點比所有其他關鍵點都高 (Y值最小)
  let isThumbsUp = true;
  for(let i=5; i<=20; i++) { if(kps[4].y > kps[i].y) isThumbsUp = false; }
  
  // 拇指朝下：4號點比所有其他關鍵點都低 (Y值最大)
  let isThumbsDown = true;
  for(let i=5; i<=20; i++) { if(kps[4].y < kps[i].y) isThumbsDown = false; }

  if (isThumbsUp && !indexUp) return "Thumbs Up";
  if (isThumbsDown && othersClosed) return "Thumbs Down";
  if (indexUp && middleUp && ringUp && pinkyUp) return "Paper";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "Rock";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "Scissors";
  return "Unknown";
}

function handleGameLogic() {
  if (gameState === "COUNTDOWN") {
    let elapsed = (millis() - timerStart) / 1000;
    countdownValue = 3 - floor(elapsed);
    
    if (countdownValue <= 0) {
      // 倒數結束，電腦隨機出拳
      const options = ["Rock", "Paper", "Scissors"];
      computerChoice = random(options);
      
      // 判定勝負
      if (playerGesture === "Unknown" || playerGesture === "None" || playerGesture === "Wait...") {
        resultMessage = "NO HAND DETECTED!";
      } else if (playerGesture === computerChoice) {
        resultMessage = "TIE!";
      } else if (
        (playerGesture === "Rock" && computerChoice === "Scissors") ||
        (playerGesture === "Paper" && computerChoice === "Rock") ||
        (playerGesture === "Scissors" && computerChoice === "Paper")
      ) {
        resultMessage = "YOU WIN!";
      } else {
        resultMessage = "COMPUTER WINS!";
      }
      gameState = "RESULT";
      resultStartTime = millis(); // 記錄結果產生的時間
    }
  } 
  
  if (gameState === "RESULT") {
    // 顯示結果 3 秒後進入選單
    if (millis() - resultStartTime > 3000) {
      gameState = "MENU";
    }
  } 
  
  if (gameState === "MENU") {
    // 在選單狀態偵測讚或倒讚
    if (playerGesture === "Thumbs Up") {
      gameState = "RESTARTING";
      resultStartTime = millis();
    } else if (playerGesture === "Thumbs Down") {
      exitGame();
    }
  } 
  
  if (gameState === "RESTARTING") {
    if (millis() - resultStartTime > 1000) {
      restartGame();
    }
  }
}

function displayUI() {
  fill(255);
  noStroke();
  
  // 即時顯示玩家手勢
  textSize(32);
  text("YOUR GESTURE: " + playerGesture, width / 2, height * 0.85);

  if (gameState === "WAITING") {
    textSize(48);
    text("CLICK TO START", width / 2, height / 2);
  } else if (gameState === "COUNTDOWN") {
    textSize(120);
    text(countdownValue, width / 2, height / 2);
  } else if (gameState === "RESULT") {
    textSize(32);
    fill('#FFD700'); // 金色顯示電腦出拳
    text("COMPUTER CHOSE: " + computerChoice, width / 2, height * 0.15);
    
    textSize(80);
    fill(255);
    text(resultMessage, width / 2, height / 2);
    
    textSize(24);
    text("WAITING FOR MENU...", width / 2, height * 0.92);
  } else if (gameState === "MENU") {
    textSize(40);
    fill(255);
    text("CONTINUE?", width / 2, height / 2 - 40);
    textSize(28);
    fill('#00FF00'); // 綠色
    text("👍 Thumbs Up = REPLAY", width / 2, height / 2 + 30);
    fill('#FF3333'); // 紅色
    text("👎 Thumbs Down = EXIT", width / 2, height / 2 + 80);
  } else if (gameState === "RESTARTING") {
    textSize(48);
    fill(0, 255, 0);
    text("繼續遊戲...", width / 2, height / 2);
  } else if (gameState === "GAMEOVER") {
    background(0);
    textSize(64);
    fill(255, 0, 0);
    text("GAME OVER", width / 2, height / 2);
    textSize(24);
    fill(255);
    text("Refresh the page to restart", width / 2, height / 2 + 80);
  }
}

function restartGame() {
    gameState = "COUNTDOWN";
    timerStart = millis();
    countdownValue = 3;
    resultMessage = "";
    computerChoice = "";
}

function exitGame() {
  gameState = "GAMEOVER";
  noLoop(); // 停止繪圖迴圈
  capture.stop(); // 停止攝影機
}

function mousePressed() {
  // 僅在最初等待畫面時可用點擊開始
  if (gameState === "WAITING") {
    restartGame();
  }
  }
}

function drawConnect(keypoints, indices, displayW, displayH) {
  stroke(0, 255, 0); // 設定連線為綠色
  strokeWeight(3);
  noFill();
  beginShape();
  for (let idx of indices) {
    let kp = keypoints[idx];
    // 將偵測到的座標（基於影片原始尺寸）映射到畫面實際顯示的尺寸（w, h）
    let vx = map(kp.x, 0, capture.width, 0, displayW);
    let vy = map(kp.y, 0, capture.height, 0, displayH);
    vertex(vx, vy);
  }
  endShape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
