// Helper: count characters and words from text
function countText(text) {
    const totalChars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    return {
        totalChars,
        charsNoSpaces, 
        words
    };
}

// ---- Rain effect ----
class Rain {
    /**
     * @param {string} canvasId        — id elemen <canvas>
     * @param {number} maxAngle        — sudut maksimum (radian) dari vertikal (default ±0.4 ≈23°)
     * @param {number} windChangeInterval — interval ganti angin (ms), default 5000ms
     */
    constructor(canvasId, maxAngle = 0.4, windChangeInterval = 5000) {
    this.canvas            = document.getElementById(canvasId);
    this.ctx               = this.canvas.getContext('2d');
    this.drops             = [];
    this.animId            = null;
    this.maxAngle          = maxAngle;
    this.windChangeInterval= windChangeInterval;
    this.windAngle         = 0;                // sudut angin saat ini
    this.lastWindChange    = 0;                // timestamp terakhir ganti angin

    this.resize();
    window.addEventListener('resize', () => this.resize());
    }

    resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    }

    start(numDrops = 200) {
    this.drops = [];
    for (let i = 0; i < numDrops; i++) {
        const length = 10 + Math.random() * 20;
        const speed  = 2  + Math.random() * 10;
        // kita tidak simpan sudut di tiap tetesan, cukup global
        this.drops.push({ x: Math.random() * this.canvas.width,
                        y: Math.random() * this.canvas.height,
                        length, speed });
    }
    // inisialisasi angin pertama
    this.windAngle      = (Math.random() * 2 - 1) * this.maxAngle;
    this.lastWindChange = performance.now();
    this.loop();
    }

    stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    loop() {
    const now = performance.now();

    // apakah sudah waktunya ganti arah angin?
    if (now - this.lastWindChange > this.windChangeInterval) {
        this.windAngle      = (Math.random() * 2 - 1) * this.maxAngle;
        this.lastWindChange = now;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = 'rgba(174,194,224,0.35)';
    ctx.lineWidth   = 1;
    ctx.beginPath();

    for (const drop of this.drops) {
        // pergeseran per frame berdasarkan angin global
        const dx = Math.sin(this.windAngle) * drop.speed;
        const dy = Math.cos(this.windAngle) * drop.speed;

        // gambar garis hujan searah angin
        const x2 = drop.x + Math.sin(this.windAngle) * drop.length;
        const y2 = drop.y + Math.cos(this.windAngle) * drop.length;
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(x2, y2);

        // update posisi
        drop.x += dx;
        drop.y += dy;

        // reset saat keluar layar
        if (drop.y > this.canvas.height || drop.x < 0 || drop.x > this.canvas.width) {
        drop.y = -drop.length;
        drop.x = Math.random() * this.canvas.width;
        }
    }

    ctx.stroke();
    this.animId = requestAnimationFrame(() => this.loop());
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // audio background
    const rainAudio      = document.getElementById('rain-audio');
    const audioModal     = document.getElementById('audio-modal');
    const audioConfirm   = document.getElementById('audio-confirm-btn');
    // --- Lightning effect (distant flashes) ---
    const lightningOverlay = document.getElementById('lightning-overlay');

    // 1. Tampilkan modal (CSS .audio-modal sudah display:flex)
    audioModal.style.display = 'flex';

    // 2. Saat user klik tombol: unmute, play, sembunyikan modal
    audioConfirm.addEventListener('click', () => {
        rainAudio.muted = false;           // buka mute
        rainAudio.play().catch(console.error);
        audioModal.style.display = 'none';
    });
        
    // inisialisasi rain effect
    const rain = new Rain('rain-canvas', 0.52 /*≈30°*/, 18000 /*ms*/);
    rain.start(450);

    function triggerFlash() {
        lightningOverlay.classList.add('flash');
        lightningOverlay.addEventListener('animationend', () => {
        lightningOverlay.classList.remove('flash');
        }, { once: true });
    }
    
    function scheduleLightning() {
        // jeda acak antara 5–25 detik
        const delay = Math.random() * 10000 + 500;
        setTimeout(() => {
        // dua kilatan berurutan dengan jarak 100–300ms
        triggerFlash();
        setTimeout(triggerFlash, Math.random() * 200 + 100);
        // jadwalkan storm berikutnya
        scheduleLightning();
        }, delay);
    }
    
    // mulai scheduling
    scheduleLightning();

    // Element references
    const countBtn       = document.getElementById('count-btn');
    const resetBtn       = document.getElementById('reset-btn');
    const dropSection    = document.getElementById('drop-section');
    const fileList       = document.getElementById('file-list');
    const pdfInput       = document.getElementById('pdfInput');
    const statsContainer = document.getElementById('stats-container');
    const loadingPopup   = document.getElementById('loading-popup');
    
    // PDF viewer elements
    const pdfCanvas      = document.getElementById('pdf-canvas');
    const ctx            = pdfCanvas.getContext('2d');
    const prevPageBtn    = document.getElementById('prev-page');
    const nextPageBtn    = document.getElementById('next-page');
    const pageInfo       = document.getElementById('page-info');

    // References for GIF & panel
    const panelContent     = document.querySelector('.panel-content');
    const loadingGif     = document.getElementById('loading-gif');

    // PDF variables
    let pdfFile = null;
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let extractedText = '';
    let textStats = { totalChars: 0, charsNoSpaces: 0, words: 0 };

    // PDF viewer controls
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
        }
    });


    // Helper functions for bounce animations
    function showWithBounce(el) {
    el.classList.remove('hidden', 'bounce-out');
    el.classList.add('bounce-in');
    }
    function hideWithBounce(el) {
    el.classList.remove('bounce-in');
    el.classList.add('bounce-out');
    el.addEventListener('animationend', () => {
        el.classList.add('hidden');
    }, { once: true });
    }

    // Initial state: hide panel, show GIF
    panelContent.classList.add('hidden');
    showWithBounce(loadingGif);

    // --- Drag & Drop PDF ---
    dropSection.addEventListener('dragover', e => {
        e.preventDefault();
        dropSection.classList.add('dragover');
    });
    dropSection.addEventListener('dragleave', e => {
        e.preventDefault();
        dropSection.classList.remove('dragover');
    });
    dropSection.addEventListener('drop', e => {
        e.preventDefault();
        dropSection.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length && files[0].name.endsWith('.pdf')) {
            pdfFile = files[0];
            displayFile(files[0]);
            processPDF(files[0]);
            dropSection.querySelector('p').style.display = 'none';
        } else {
            alert('Hanya file PDF yang diperbolehkan!');
        }
    });
    dropSection.addEventListener('click', () => pdfInput.click());
    pdfInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.pdf')) {
            pdfFile = file;
            displayFile(file);
            processPDF(file);
            dropSection.querySelector('p').style.display = 'none';
        } else {
            alert('Format file tidak valid. Harap pilih file .pdf');
            pdfInput.value = '';
        }
    });

    function displayFile(file) {
        fileList.innerHTML = `
            <div class="file-item">
                <img src="pdf.png" alt="PDF Icon">
                <span>${file.name}</span>
            </div>
        `;
    }

    resetBtn.addEventListener('click', () => {
        // 1. Hide panel dan reset state
        hideWithBounce(panelContent);
        document.querySelector('.right-panel').classList.remove('active');
        pdfFile = null;
        pdfDoc = null;
        currentPage = 1;
        totalPages = 0;
        extractedText = '';
        textStats = { totalChars: 0, charsNoSpaces: 0, words: 0 };
        fileList.innerHTML = '';
        statsContainer.style.display = 'none';
        pdfInput.value = '';
        dropSection.querySelector('p').style.display = 'block';
        
        // Clear canvas
        if (pdfCanvas) {
            ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
        }
    
        // 2. Bersihkan semua kelas animasi lama di GIF
        loadingGif.classList.remove('hidden', 'bounce-in', 'bounce-out');
        void loadingGif.offsetWidth; // paksa reflow
    
        // 3. Tampilkan lagi dengan animasi masuk
        showWithBounce(loadingGif);
    });

    // --- Process PDF ---
    async function processPDF(file) {
        try {
            loadingPopup.style.display = 'flex';
            
            const arrayBuffer = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            totalPages = pdfDoc.numPages;
            
            // Extract text from all pages
            extractedText = '';
            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                extractedText += pageText + ' ';
            }
            
            // Calculate initial stats
            textStats = countText(extractedText);
            updateStats();
            
            // Show stats and viewer
            statsContainer.style.display = 'block';
            document.querySelector('.right-panel').classList.add('active');
            hideWithBounce(loadingGif);
            showWithBounce(panelContent);
            
            // Render first page
            currentPage = 1;
            renderPage();
            
        } catch (err) {
            console.error('Error processing PDF:', err);
            alert(`Gagal memproses file PDF: ${err.message}`);
        } finally {
            loadingPopup.style.display = 'none';
        }
    }

    // --- Render PDF page ---
    async function renderPage() {
        if (!pdfDoc) return;
        
        try {
            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale: 1.0 });
            
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;
            
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Update page info
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            
            // Update button states
            prevPageBtn.disabled = currentPage <= 1;
            nextPageBtn.disabled = currentPage >= totalPages;
            
        } catch (err) {
            console.error('Error rendering page:', err);
        }
    }

    // --- Update statistics display ---
    function updateStats() {
        const stats = countText(extractedText);
        
        document.getElementById('total-chars').textContent = stats.totalChars;
        document.getElementById('chars-no-spaces').textContent = stats.charsNoSpaces;
        document.getElementById('total-words').textContent = stats.words;
        document.getElementById('total-pages').textContent = totalPages;
    }

    // --- Count button event ---
    if (countBtn) {
        countBtn.addEventListener('click', () => {
            updateStats();
            alert(`Character count updated!\nTotal: ${textStats.totalChars}\nWithout spaces: ${textStats.charsNoSpaces}\nWords: ${textStats.words}`);
        });
    }
});
