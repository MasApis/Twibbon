const uploadInput = document.getElementById('uploadInput');
const userPhoto = document.getElementById('userPhoto');
const twibbonFrame = document.getElementById('twibbonFrame');
const zoomSlider = document.getElementById('zoomSlider');
const zoomControls = document.getElementById('zoomControls');
const downloadBtn = document.getElementById('downloadBtn');
const canvasWrapper = document.getElementById('canvasWrapper');
const hiddenCanvas = document.getElementById('hiddenCanvas');
const frameItems = document.querySelectorAll('.frame-item');

// State presisi
let imgScale = 1;
let baseScale = 1; // Skala dasar agar foto pas dengan frame
let imgX = 0;
let imgY = 0;
let isDragging = false;
let startX, startY;
let originalWidth = 0;
let originalHeight = 0;

// --- 1. PILIH BINGKAI (Diperbarui dengan Virtual Preloading) ---
frameItems.forEach(item => {
    item.addEventListener('click', function() {
        // Cegah proses jika frame yang diklik adalah frame yang sedang aktif
        if (this.classList.contains('active')) return;

        frameItems.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        const newSrc = this.getAttribute('data-src');
        
        // OPTIMASI: Buat gambar virtual untuk load di memori (belakang layar)
        const imgLoader = new Image();
        imgLoader.src = newSrc;
        
        // Ganti frame utama HANYA jika gambar baru sudah selesai dirender di memori
        imgLoader.onload = () => {
            twibbonFrame.src = newSrc;
        };
    });
});

// Reset posisi foto kalau frame diganti dan foto sudah diupload
twibbonFrame.addEventListener('load', function() {
    
    // OPTIMASI: Kunci bentuk (rasio) kontainer agar tidak kempes/loncat saat ganti frame
    if (this.naturalWidth && this.naturalHeight) {
        canvasWrapper.style.aspectRatio = `${this.naturalWidth} / ${this.naturalHeight}`;
    }
    
    if (!userPhoto.classList.contains('hidden')) {
        calculateBasePosition();
    }
});

// --- 2. UPLOAD FOTO ---
uploadInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            userPhoto.src = event.target.result;
            userPhoto.classList.remove('hidden');
            zoomControls.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Hitung posisi saat foto selesai diload
userPhoto.addEventListener('load', calculateBasePosition);

function calculateBasePosition() {
    if (!userPhoto.src) return;
    
    // Ambil ukuran natural foto
    originalWidth = userPhoto.naturalWidth;
    originalHeight = userPhoto.naturalHeight;
    
    // Ambil ukuran bingkai yang tampil di layar
    const frameW = twibbonFrame.clientWidth;
    const frameH = twibbonFrame.clientHeight;
    
    // Hitung skala dasar agar foto menutupi seluruh frame (object-fit: cover)
    const ratioX = frameW / originalWidth;
    const ratioY = frameH / originalHeight;
    baseScale = Math.max(ratioX, ratioY);
    
    imgScale = baseScale;
    zoomSlider.value = 100; // 100 = Skala Dasar
    
    // Posisikan foto tepat di tengah bingkai
    imgX = (frameW - (originalWidth * imgScale)) / 2;
    imgY = (frameH - (originalHeight * imgScale)) / 2;
    
    updatePhotoTransform();
}

function updatePhotoTransform() {
    userPhoto.style.transform = `translate(${imgX}px, ${imgY}px) scale(${imgScale})`;
}

// --- 3. ZOOM SLIDER (Center Zoom) ---
zoomSlider.addEventListener('input', function() {
    const previousScale = imgScale;
    imgScale = baseScale * (this.value / 100);
    
    // Jaga agar zoom tetap terpusat di tengah layar
    const frameW = twibbonFrame.clientWidth;
    const frameH = twibbonFrame.clientHeight;
    const centerX = frameW / 2;
    const centerY = frameH / 2;
    
    const scaleRatio = imgScale / previousScale;
    
    imgX = centerX - (centerX - imgX) * scaleRatio;
    imgY = centerY - (centerY - imgY) * scaleRatio;
    
    updatePhotoTransform();
});

// --- 4. DRAG & DROP GESER FOTO ---
function startDrag(e) {
    if (userPhoto.classList.contains('hidden')) return;
    isDragging = true;
    const pageX = e.pageX || (e.touches && e.touches[0].pageX);
    const pageY = e.pageY || (e.touches && e.touches[0].pageY);
    
    startX = pageX - imgX;
    startY = pageY - imgY;
}

function doDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const pageX = e.pageX || (e.touches && e.touches[0].pageX);
    const pageY = e.pageY || (e.touches && e.touches[0].pageY);
    
    imgX = pageX - startX;
    imgY = pageY - startY;
    updatePhotoTransform();
}

function stopDrag() { isDragging = false; }

canvasWrapper.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', doDrag);
window.addEventListener('mouseup', stopDrag);

canvasWrapper.addEventListener('touchstart', startDrag);
window.addEventListener('touchmove', doDrag, { passive: false });
window.addEventListener('touchend', stopDrag);

// --- 5. RENDER DOWNLOAD HD PRESISI ---
downloadBtn.addEventListener('click', function() {
    const ctx = hiddenCanvas.getContext('2d');
    
    const hdWidth = twibbonFrame.naturalWidth || 2000;
    const hdHeight = twibbonFrame.naturalHeight || 2000;
    
    hiddenCanvas.width = hdWidth;
    hiddenCanvas.height = hdHeight;
    
    // Faktor pengali dari ukuran layar ke ukuran HD asli
    const scaleFactor = hdWidth / twibbonFrame.clientWidth;
    
    ctx.clearRect(0, 0, hdWidth, hdHeight);
    
    // Mapping titik kordinat pratinjau langsung ke kordinat kanvas HD
    const drawX = imgX * scaleFactor;
    const drawY = imgY * scaleFactor;
    const drawW = originalWidth * imgScale * scaleFactor;
    const drawH = originalHeight * imgScale * scaleFactor;
    
    ctx.drawImage(userPhoto, drawX, drawY, drawW, drawH);
    ctx.drawImage(twibbonFrame, 0, 0, hdWidth, hdHeight);
    
    try {
        const dataURL = hiddenCanvas.toDataURL('image/png', 1.0);
        const downloadLink = document.createElement('a');
        downloadLink.download = 'Twibbon_Hasil_' + Date.now() + '.png';
        downloadLink.href = dataURL;
        downloadLink.click();
    } catch (error) {
        alert("Gagal mendownload. Pastikan Anda menjalankan website ini menggunakan Live Server.");
    }
});