let mediaRecorder;
let recordedChunks = [];
let stream;
let startTime;
let timerInterval;
let currentFacingMode = 'user'; // 'user' はインカメラ, 'environment' はアウトカメラ

const videoPreview = document.getElementById('preview');
const shutterBtn = document.getElementById('shutterBtn');
const shutterWrapper = document.querySelector('.shutter-wrapper');
const timerDisplay = document.getElementById('recordingTimer');
const recIndicator = document.getElementById('recIndicator');
const clockDisplay = document.getElementById('clock');
const switchBtn = document.getElementById('switchCamera');
const viewport = document.querySelector('.camera-viewport');

// 1. 時計の更新
function updateClock() {
    const now = new Date();
    clockDisplay.textContent = now.toLocaleTimeString('ja-JP', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
setInterval(updateClock, 1000);
updateClock();

// 2. カメラの起動
async function initCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: true
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        
        // アウトカメラの場合は左右反転を解除
        if (currentFacingMode === 'environment') {
            viewport.classList.add('back-camera');
        } else {
            viewport.classList.remove('back-camera');
        }
        
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("カメラへのアクセスを許可してください。");
    }
}

// 3. 録画の開始・停止制御
function startRecording() {
    recordedChunks = [];
    
    // サポートされているコーデックを確認
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                     ? 'video/webm;codecs=vp9' 
                     : 'video/mp4'; // iPhoneはMP4が一般的

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        showPreviewModal(url);
    };

    mediaRecorder.start();
    startTime = Date.now();
    startTimer();
    
    shutterWrapper.classList.add('recording');
    recIndicator.classList.add('active');
    timerDisplay.classList.add('active');
}

function stopRecording() {
    mediaRecorder.stop();
    stopTimer();
    
    shutterWrapper.classList.remove('recording');
    recIndicator.classList.remove('active');
    timerDisplay.classList.remove('active');
}

// 4. タイマー処理
function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerDisplay.textContent = '00:00';
}

// 5. モーダル表示
const modal = document.getElementById('previewModal');
const recordedVideo = document.getElementById('recordedVideo');
const saveBtn = document.getElementById('saveVideo');
const closeBtn = document.getElementById('closeModal');

function showPreviewModal(url) {
    recordedVideo.src = url;
    modal.classList.remove('hidden');
    
    saveBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_${new Date().getTime()}.mp4`;
        a.click();
    };
}

closeBtn.onclick = () => {
    modal.classList.add('hidden');
    recordedVideo.src = '';
};

// 6. イベントリスナー
shutterBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
};

switchBtn.onclick = () => {
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
    initCamera();
};

// 起動
initCamera();
