import { 
    db, storage, collection, addDoc, getDocs, doc, updateDoc, 
    query, orderBy, getDoc, where, limit 
} from './firebase-config.js';

// Global variables
let songs = [];
let videos = [];
let currentPlaylist = [];
let currentIndex = 0;
let audio = new Audio();
let isPlaying = false;
let siteSettings = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadSiteSettings();
    await loadSongs();
    await loadVideos();
    setupEventListeners();
    setupAudioPlayer();
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
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Load songs
async function loadSongs() {
    try {
        const songsQuery = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(songsQuery);
        songs = [];
        snapshot.forEach(doc => {
            songs.push({ id: doc.id, ...doc.data() });
        });
        
        displaySongs('recentlyPlayed', songs.slice(0, 6));
        displaySongs('trendingSongs', songs.sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 6));
        displaySongs('latestSongs', songs.slice(0, 6));
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Load videos
async function loadVideos() {
    try {
        const videosQuery = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(videosQuery);
        videos = [];
        snapshot.forEach(doc => {
            videos.push({ id: doc.id, ...doc.data() });
        });
        
        displayVideos('latestVideos', videos.slice(0, 6));
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// Display songs in grid
function displaySongs(containerId, songsList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = songsList.map(song => `
        <div class="card" onclick="window.playSong('${song.id}')">
            <div class="card-image">
                <img src="${song.thumbnail || 'assets/default-song.jpg'}" alt="${song.title}" loading="lazy">
                <button class="play-overlay" onclick="event.stopPropagation(); window.playSong('${song.id}')">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <h4>${song.title}</h4>
            <p>${song.artist || 'NWTN MUSICAL'}</p>
        </div>
    `).join('');
}

// Display videos in grid
function displayVideos(containerId, videosList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = videosList.map(video => `
        <div class="card" onclick="window.openVideo('${video.id}')">
            <div class="card-image">
                <img src="${video.thumbnail || getYouTubeThumbnail(video.url)}" alt="${video.title}" loading="lazy">
                <button class="play-overlay" onclick="event.stopPropagation(); window.openVideo('${video.id}')">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <h4>${video.title}</h4>
            <p>${video.views || 0} views</p>
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

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-menu li').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(`${page}Page`).classList.add('active');
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 500));

    // Player controls
    document.getElementById('playPauseBtn').addEventListener('click', togglePlay);
    document.getElementById('prevBtn').addEventListener('click', playPrevious);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    document.getElementById('progressSlider').addEventListener('input', seek);
    document.getElementById('volumeSlider').addEventListener('input', setVolume);

    // Review form
    document.getElementById('reviewForm').addEventListener('submit', submitReview);

    // Star rating
    document.querySelectorAll('.star-rating i').forEach(star => {
        star.addEventListener('click', () => {
            const rating = star.dataset.rating;
            document.getElementById('reviewRating').value = rating;
            
            document.querySelectorAll('.star-rating i').forEach((s, index) => {
                if (index < rating) {
                    s.classList.remove('far');
                    s.classList.add('fas', 'active');
                } else {
                    s.classList.remove('fas', 'active');
                    s.classList.add('far');
                }
            });
        });
    });

    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // User menu
    document.querySelector('.user-btn').addEventListener('click', () => {
        document.getElementById('reviewModal').classList.add('active');
    });
}

// Handle search
async function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length < 2) return;

    try {
        const songsQuery = query(collection(db, 'songs'), where('title', '>=', searchTerm), limit(10));
        const snapshot = await getDocs(songsQuery);
        
        const results = [];
        snapshot.forEach(doc => {
            results.push({ id: doc.id, ...doc.data() });
        });

        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Display search results
function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    container.innerHTML = `
        <h3>Search Results</h3>
        <div class="card-grid">
            ${results.map(song => `
                <div class="card" onclick="window.playSong('${song.id}')">
                    <div class="card-image">
                        <img src="${song.thumbnail || 'assets/default-song.jpg'}" alt="${song.title}">
                        <button class="play-overlay" onclick="event.stopPropagation(); window.playSong('${song.id}')">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <h4>${song.title}</h4>
                    <p>${song.artist || 'NWTN MUSICAL'}</p>
                </div>
            `).join('')}
        </div>
    `;
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
        
        // Update UI
        document.getElementById('currentSongImage').src = song.thumbnail || 'assets/default-song.jpg';
        document.getElementById('currentSongName').textContent = song.title;
        document.getElementById('currentArtistName').textContent = song.artist || 'NWTN MUSICAL';
        
        // Show player and play
        document.getElementById('nowPlayingBar').style.display = 'flex';
        await audio.play();
        isPlaying = true;
        updatePlayButton();
        
        // Update playlist
        currentPlaylist = songs;
        currentIndex = songs.findIndex(s => s.id === songId);
        
        // Reload songs to update play count
        loadSongs();
    } catch (error) {
        console.error('Error playing song:', error);
        showToast('Error playing song');
    }
};

// Open video
window.openVideo = function(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const videoId_extracted = extractYouTubeId(video.url);
    if (!videoId_extracted) {
        showToast('Invalid YouTube URL');
        return;
    }

    // Update view count
    updateDoc(doc(db, 'videos', videoId), {
        views: (video.views || 0) + 1
    });

    // Show modal
    document.getElementById('videoModalTitle').textContent = video.title;
    document.getElementById('videoContainer').innerHTML = `
        <iframe src="https://www.youtube.com/embed/${videoId_extracted}?autoplay=1" 
                frameborder="0" 
                allow="autoplay; encrypted-media" 
                allowfullscreen>
        </iframe>
    `;
    document.getElementById('videoModal').classList.add('active');
    
    // Reload videos
    loadVideos();
};

// Setup audio player
function setupAudioPlayer() {
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', playNext);
    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('totalTime').textContent = formatTime(audio.duration);
    });
}

// Update progress
function updateProgress() {
    const progress = (audio.currentTime / audio.duration) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressSlider').value = progress;
    document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
}

// Seek
function seek(e) {
    const time = (e.target.value / 100) * audio.duration;
    audio.currentTime = time;
}

// Set volume
function setVolume(e) {
    const volume = e.target.value / 100;
    audio.volume = volume;
    document.getElementById('volumeProgress').style.width = `${e.target.value}%`;
    
    const icon = document.getElementById('volumeBtn').querySelector('i');
    if (volume === 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

// Toggle play/pause
function togglePlay() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
    updatePlayButton();
}

// Update play button
function updatePlayButton() {
    const btn = document.getElementById('playPauseBtn');
    btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

// Play previous
function playPrevious() {
    if (currentPlaylist.length === 0) return;
    currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playSong(currentPlaylist[currentIndex].id);
}

// Play next
function playNext() {
    if (currentPlaylist.length === 0) return;
    currentIndex = (currentIndex + 1) % currentPlaylist.length;
    playSong(currentPlaylist[currentIndex].id);
}

// Format time
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        status: 'pending'
    };

    if (review.rating === 0) {
        showToast('Please select a rating');
        return;
    }

    try {
        await addDoc(collection(db, 'reviews'), review);
        showToast('Review submitted successfully!');
        document.getElementById('reviewForm').reset();
        document.getElementById('reviewModal').classList.remove('active');
        
        // Reset stars
        document.querySelectorAll('.star-rating i').forEach(star => {
            star.classList.remove('fas', 'active');
            star.classList.add('far');
        });
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('Error submitting review');
    }
}

// Show toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Security: Disable download
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'AUDIO' || e.target.closest('.now-playing-bar')) {
        e.preventDefault();
    }
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && (e.key === 's' || e.key === 'u')) || e.key === 'F12') {
        e.preventDefault();
    }
});

// Make functions global
window.playSong = playSong;
window.openVideo = openVideo;
