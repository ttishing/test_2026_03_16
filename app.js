let mediaRecorder;
let recordedChunks = [];
let stream;
let lastTap = 0;

const videoPreview = document.getElementById('preview');
const tapArea = document.getElementById('tapArea');
const statusMsg = document.getElementById('statusMsg');
const startScreen = document.getElementById('startScreen');
const recordingScreen = document.getElementById('recordingScreen');
const startButton = document.getElementById('startButton');

// 桁要素の取得
const h1 = document.getElementById('h1');
const h2 = document.getElementById('h2');
const m1 = document.getElementById('m1');
const m2 = document.getElementById('m2');
const s1 = document.getElementById('s1');
const s2 = document.getElementById('s2');

// 横長固定録画用のキャンバス
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// フルHD横向き解像度
canvas.width = 1920;
canvas.height = 1080;

// 1. 時計の更新
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    
    h1.textContent = hours[0];
    h2.textContent = hours[1];
    m1.textContent = mins[0];
    m2.textContent = mins[1];
    s1.textContent = secs[0];
    s2.textContent = secs[1];
}
setInterval(updateClock, 500);
updateClock();

// 2. カメラの起動
async function initCamera() {
    if (stream && stream.active) return;
    try {
        const constraints = {
            video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: true
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        
        // キャンバスへの描画ループ（録画用）
        function drawFrame() {
            if (!videoPreview.paused && !videoPreview.ended) {
                // 黒背景で塗りつぶし
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // ビデオのサイズを取得
                const vw = videoPreview.videoWidth;
                const vh = videoPreview.videoHeight;
                
                // 横長(1920x1080)に収まるようにスケーリング計算
                const canvasRatio = canvas.width / canvas.height;
                const videoRatio = vw / vh;
                
                let drawW, drawH, drawX, drawY;
                
                if (videoRatio > canvasRatio) {
                    drawW = canvas.width;
                    drawH = canvas.width / videoRatio;
                    drawX = 0;
                    drawY = (canvas.height - drawH) / 2;
                } else {
                    drawH = canvas.height;
                    drawW = canvas.height * videoRatio;
                    drawX = (canvas.width - drawW) / 2;
                    drawY = 0;
                }

                ctx.drawImage(videoPreview, drawX, drawY, drawW, drawH);
            }
            requestAnimationFrame(drawFrame);
        }
        drawFrame();
        
    } catch (err) {
        console.error("Camera error:", err);
    }
}

// 3. 録画制御
function startRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    recordedChunks = [];

    // UI切り替え
    startScreen.classList.add('hidden');
    recordingScreen.classList.remove('hidden');
    tapArea.classList.add('recording');

    // キャンバスからストリームを取得 (30fps)
    const canvasStream = canvas.captureStream(30);
    
    // 音声トラックを追加（元のストリームから）
    if (stream.getAudioTracks().length > 0) {
        canvasStream.addTrack(stream.getAudioTracks()[0]);
    }

    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/quicktime'];
    let mimeType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';

    try {
        mediaRecorder = new MediaRecorder(canvasStream, { mimeType });
        mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            if (recordedChunks.length === 0) return;
            const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rec_${new Date().getTime()}.mp4`;
            a.click();
            statusMsg.classList.remove('hidden');
            setTimeout(() => statusMsg.classList.add('hidden'), 2000);

            // UIを元に戻す
            recordingScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
            tapArea.classList.remove('recording');
        };

        mediaRecorder.start(1000);
    } catch (err) {
        console.error("Recorder error:", err);
        // エラー時はUIを戻す
        recordingScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        tapArea.classList.remove('recording');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

// 4. イベントリスナー
startButton.addEventListener('click', () => {
    initCamera().then(() => {
        startRecording();
    });
});

// ダブルクリック/ダブルタップで停止
tapArea.addEventListener('dblclick', (e) => {
    stopRecording();
    e.preventDefault();
});

// モバイル用にダブルタップも処理
tapArea.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
        stopRecording();
        e.preventDefault();
    }
    lastTap = currentTime;
});

// 初期起動
window.addEventListener('load', initCamera);
// モバイルでの初回タップでカメラ許可を促す
window.addEventListener('touchstart', initCamera, { once: true });
