import { db, storage, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, getDoc, ref, getDownloadURL } from './firebase-config.js';

// Global variables
let songs = [];
let videos = [];
let reviews = [];
let currentSongIndex = 0;
let audio = new Audio();
let isPlaying = false;
let siteSettings = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSiteSettings();
    loadSongs();
    loadVideos();
    loadReviews();
    setupEventListeners();
    setupPlayer();
});

// Load site settings
async function loadSiteSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
        if (settingsDoc.exists()) {
            siteSettings = settingsDoc.data();
            document.getElementById('siteTitle').textContent = siteSettings.title || 'NWTN MUSICAL';
            if (siteSettings.logo) {
                document.getElementById('siteLogo').src = siteSettings.logo;
            }
            if (siteSettings.primaryColor) {
                document.documentElement.style.setProperty('--primary', siteSettings.primaryColor);
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Load songs
async function loadSongs() {
    try {
        const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        songs = [];
        querySnapshot.forEach((doc) => {
            songs.push({ id: doc.id, ...doc.data() });
        });
        displaySongs();
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Display songs
function displaySongs() {
    const container = document.getElementById('songsContainer');
    container.innerHTML = songs.map(song => `
        <div class="song-card" onclick="window.playSong('${song.id}')">
            <img src="${song.thumbnail || 'assets/default-song.jpg'}" alt="${song.title}" loading="lazy">
            <div class="song-info">
                <h4>${song.title}</h4>
                <p><i class="fas fa-headphones"></i> ${song.plays || 0} plays</p>
            </div>
        </div>
    `).join('');
}

// Load videos
async function loadVideos() {
    try {
        const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        videos = [];
        querySnapshot.forEach((doc) => {
            videos.push({ id: doc.id, ...doc.data() });
        });
        displayVideos();
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// Display videos
function displayVideos() {
    const container = document.getElementById('videosContainer');
    container.innerHTML = videos.map(video => `
        <div class="video-card" onclick="window.openVideo('${video.id}')">
            <img src="${video.thumbnail || getYouTubeThumbnail(video.url)}" alt="${video.title}" loading="lazy">
            <div class="video-info">
                <h4>${video.title}</h4>
                <p><i class="fas fa-eye"></i> ${video.views || 0} views</p>
            </div>
        </div>
    `).join('');
}

// Get YouTube thumbnail
function getYouTubeThumbnail(url) {
    const videoId = extractYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'assets/default-video.jpg';
}

// Extract YouTube ID
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Load reviews
async function loadReviews() {
    try {
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        reviews = [];
        querySnapshot.forEach((doc) => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
        displayReviews();
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Display reviews
function displayReviews() {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <span class="reviewer-name">${review.name}</span>
                <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
            </div>
            <div class="review-text">${review.review}</div>
            ${review.reply ? `
                <div class="reply">
                    <strong>NWTN MUSICAL:</strong> ${review.reply}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Menu toggle
    document.querySelector('.menu-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });

    // Navigation
    document.querySelectorAll('nav ul li').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('nav ul li').forEach(li => li.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Review form
    document.getElementById('reviewForm').addEventListener('submit', submitReview);

    // Video modal close
    document.querySelector('#videoModal .close').addEventListener('click', () => {
        document.getElementById('videoModal').style.display = 'none';
        document.getElementById('videoContainer').innerHTML = '';
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            if (e.target.id === 'videoModal') {
                document.getElementById('videoContainer').innerHTML = '';
            }
        }
    });
}

// Submit review
async function submitReview(e) {
    e.preventDefault();
    
    const review = {
        name: document.getElementById('reviewName').value,
        email: document.getElementById('reviewEmail').value,
        rating: parseInt(document.getElementById('reviewRating').value),
        review: document.getElementById('reviewText').value,
        createdAt: new Date().toISOString(),
        status: 'pending',
        reply: null
    };

    try {
        await addDoc(collection(db, 'reviews'), review);
        showToast('Review submitted successfully!');
        document.getElementById('reviewForm').reset();
        loadReviews();
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('Error submitting review. Please try again.', 'error');
    }
}

// Setup music player
function setupPlayer() {
    // Play/Pause
    document.getElementById('playPauseBtn').addEventListener('click', togglePlay);
    
    // Previous/Next
    document.getElementById('prevBtn').addEventListener('click', playPrevious);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    
    // Progress bar
    document.getElementById('progress').addEventListener('input', (e) => {
        const time = (e.target.value / 100) * audio.duration;
        audio.currentTime = time;
    });

    // Volume
    document.getElementById('volume').addEventListener('input', (e) => {
        audio.volume = e.target.value;
        document.getElementById('volumeBtn').innerHTML = `<i class="fas fa-volume-${audio.volume === 0 ? 'mute' : audio.volume < 0.5 ? 'down' : 'up'}"></i>`;
    });

    // Audio events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', playNext);
    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('duration').textContent = formatTime(audio.duration);
    });
}

// Play song
window.playSong = async function(songId) {
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    try {
        // Update play count
        await updateDoc(doc(db, 'songs', songId), {
            plays: (song.plays || 0) + 1
        });

        // Set audio source
        audio.src = song.audioUrl;
        await audio.load();
        
        // Update player UI
        document.getElementById('currentSongThumb').src = song.thumbnail || 'assets/default-song.jpg';
        document.getElementById('currentSongTitle').textContent = song.title;
        document.getElementById('currentSongArtist').textContent = song.artist || 'NWTN MUSICAL';
        
        // Show and play
        document.getElementById('musicPlayer').style.display = 'flex';
        currentSongIndex = songs.findIndex(s => s.id === songId);
        await audio.play();
        isPlaying = true;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        
        // Reload songs to update play count
        loadSongs();
    } catch (error) {
        console.error('Error playing song:', error);
        showToast('Error playing song. Please try again.', 'error');
    }
};

// Toggle play/pause
function togglePlay() {
    if (isPlaying) {
        audio.pause();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audio.play();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
}

// Play previous
function playPrevious() {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(songs[currentSongIndex].id);
}

// Play next
function playNext() {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSong(songs[currentSongIndex].id);
}

// Update progress bar
function updateProgress() {
    const progress = (audio.currentTime / audio.duration) * 100;
    document.getElementById('progress').value = progress || 0;
    document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
}

// Format time
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Open video
window.openVideo = function(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const videoId_extracted = extractYouTubeId(video.url);
    if (!videoId_extracted) {
        showToast('Invalid YouTube URL', 'error');
        return;
    }

    // Update view count
    updateDoc(doc(db, 'videos', videoId), {
        views: (video.views || 0) + 1
    });

    // Show modal
    document.getElementById('videoModalTitle').textContent = video.title;
    document.getElementById('videoContainer').innerHTML = `
        <iframe src="https://www.youtube.com/embed/${videoId_extracted}" frameborder="0" allowfullscreen></iframe>
    `;
    document.getElementById('videoModal').style.display = 'flex';
    
    // Reload videos to update view count
    loadVideos();
};

// Show toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.backgroundColor = type === 'success' ? 'var(--primary)' : '#dc3545';
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Make functions global
window.playSong = playSong;
window.openVideo = openVideo;

// Disable right-click on audio elements
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'AUDIO' || e.target.closest('.music-player')) {
        e.preventDefault();
        return false;
    }
});

// Disable keyboard shortcuts for saving
document.addEventListener('keydown', (e) => {
    // Prevent Ctrl+S, Ctrl+U, Ctrl+Shift+I, F12
    if ((e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'S')) || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        e.key === 'F12') {
        e.preventDefault();
        return false;
    }
});

// Disable drag and drop of audio elements
document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'AUDIO' || e.target.closest('.music-player')) {
        e.preventDefault();
        return false;
    }
});

// Add blob URL for audio to make it harder to find source
// In your playSong function, instead of setting audio.src directly:
// audio.src = song.audioUrl;
// Use a proxy or blob URL:
async function loadAudioSecurely(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    audio.src = blobUrl;
}
