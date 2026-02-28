import { 
    db, storage, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, 
    query, orderBy, getDoc, ref, uploadBytes, getDownloadURL, deleteObject,
    signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from './firebase-config.js';

// Check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'flex';
        loadDashboard();
        loadSongs();
        loadVideos();
        loadReviews();
        loadSettings();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        errorDiv.textContent = '';
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Invalid email or password';
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Tab navigation
document.querySelectorAll('.admin-nav li').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        
        document.querySelectorAll('.admin-nav li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tabId}Tab`).classList.add('active');
        
        if (tabId === 'dashboard') loadDashboard();
        if (tabId === 'songs') loadSongs();
        if (tabId === 'videos') loadVideos();
        if (tabId === 'reviews') loadReviews();
        if (tabId === 'settings') loadSettings();
    });
});

// Load dashboard
async function loadDashboard() {
    try {
        // Load stats
        const songsSnap = await getDocs(collection(db, 'songs'));
        const videosSnap = await getDocs(collection(db, 'videos'));
        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        
        let totalPlays = 0;
        songsSnap.forEach(doc => {
            totalPlays += doc.data().plays || 0;
        });
        
        document.getElementById('totalSongs').textContent = songsSnap.size;
        document.getElementById('totalVideos').textContent = videosSnap.size;
        document.getElementById('totalReviews').textContent = reviewsSnap.size;
        document.getElementById('totalPlays').textContent = totalPlays;
        
        // Load top songs for chart
        const songs = [];
        songsSnap.forEach(doc => {
            songs.push({ title: doc.data().title, plays: doc.data().plays || 0 });
        });
        
        songs.sort((a, b) => b.plays - a.plays);
        const topSongs = songs.slice(0, 5);
        
        // Create songs chart
        new Chart(document.getElementById('songsChart'), {
            type: 'bar',
            data: {
                labels: topSongs.map(s => s.title),
                datasets: [{
                    label: 'Plays',
                    data: topSongs.map(s => s.plays),
                    backgroundColor: '#d12200'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#b3b3b3' }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: '#b3b3b3' }
                    },
                    x: {
                        ticks: { color: '#b3b3b3' }
                    }
                }
            }
        });
        
        // Load ratings distribution
        const ratings = [0, 0, 0, 0, 0];
        reviewsSnap.forEach(doc => {
            const rating = doc.data().rating;
            if (rating >= 1 && rating <= 5) {
                ratings[rating - 1]++;
            }
        });
        
        // Create ratings chart
        new Chart(document.getElementById('ratingsChart'), {
            type: 'pie',
            data: {
                labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
                datasets: [{
                    data: ratings,
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#d12200']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#b3b3b3' }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load songs
async function loadSongs() {
    try {
        const songsQuery = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(songsQuery);
        
        const tbody = document.getElementById('songsTableBody');
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const song = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${song.thumbnail || 'assets/default-song.jpg'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
                    <td>${song.title}</td>
                    <td>${song.artist || 'NWTN MUSICAL'}</td>
                    <td>${song.plays || 0}</td>
                    <td>
                        <button class="edit-btn" onclick="editSong('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteSong('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Load videos
async function loadVideos() {
    try {
        const videosQuery = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(videosQuery);
        
        const tbody = document.getElementById('videosTableBody');
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const video = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${video.thumbnail || 'assets/default-video.jpg'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
                    <td>${video.title}</td>
                    <td>${video.views || 0}</td>
                    <td>
                        <button class="edit-btn" onclick="editVideo('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteVideo('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// Load reviews
async function loadReviews() {
    try {
        const reviewsQuery = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(reviewsQuery);
        
        const tbody = document.getElementById('reviewsTableBody');
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const review = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${review.name}</td>
                    <td>${review.email}</td>
                    <td>${'★'.repeat(review.rating)}</td>
                    <td>${review.review.substring(0, 50)}${review.review.length > 50 ? '...' : ''}</td>
                    <td>${new Date(review.createdAt).toLocaleDateString()}</td>
                    <td><span class="status ${review.status}">${review.status}</span></td>
                    <td>
                        ${!review.reply ? `
                            <button class="reply-btn" onclick="showReplyModal('${doc.id}')">
                                <i class="fas fa-reply"></i>
                            </button>
                        ` : ''}
                        <button class="delete-btn" onclick="deleteReview('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Load settings
async function loadSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            document.getElementById('siteTitle').value = settings.title || '';
            document.getElementById('primaryColor').value = settings.primaryColor || '#d12200';
            document.getElementById('secondaryColor').value = settings.secondaryColor || '#a51502';
            
            if (settings.logo) {
                document.getElementById('logoPreview').src = settings.logo;
                document.getElementById('logoPreview').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Show add song modal
window.showAddSongModal = function() {
    document.getElementById('songModalTitle').textContent = 'Add Song';
    document.getElementById('songForm').reset();
    document.getElementById('songId').value = '';
    document.getElementById('thumbnailPreview').style.display = 'none';
    document.getElementById('songModal').classList.add('active');
};

// Edit song
window.editSong = async function(songId) {
    try {
        const songDoc = await getDoc(doc(db, 'songs', songId));
        if (songDoc.exists()) {
            const song = songDoc.data();
            document.getElementById('songModalTitle').textContent = 'Edit Song';
            document.getElementById('songId').value = songId;
            document.getElementById('songTitle').value = song.title;
            document.getElementById('songArtist').value = song.artist || '';
            
            if (song.thumbnail) {
                document.getElementById('thumbnailPreview').src = song.thumbnail;
                document.getElementById('thumbnailPreview').style.display = 'block';
            }
            
            document.getElementById('songModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading song:', error);
        alert('Error loading song');
    }
};

// Save song
document.getElementById('songForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const songId = document.getElementById('songId').value;
    const title = document.getElementById('songTitle').value;
    const artist = document.getElementById('songArtist').value;
    const thumbnailFile = document.getElementById('songThumbnail').files[0];
    const songFile = document.getElementById('songFile').files[0];
    
    try {
        let thumbnailUrl = null;
        let audioUrl = null;
        
        // Upload thumbnail
        if (thumbnailFile) {
            const thumbnailRef = ref(storage, `songs/thumbnails/${Date.now()}_${thumbnailFile.name}`);
            await uploadBytes(thumbnailRef, thumbnailFile);
            thumbnailUrl = await getDownloadURL(thumbnailRef);
        }
        
        // Upload audio
        if (songFile) {
            const audioRef = ref(storage, `songs/audio/${Date.now()}_${songFile.name}`);
            await uploadBytes(audioRef, songFile);
            audioUrl = await getDownloadURL(audioRef);
        }
        
        const songData = {
            title,
            artist: artist || 'NWTN MUSICAL',
            updatedAt: new Date().toISOString()
        };
        
        if (thumbnailUrl) songData.thumbnail = thumbnailUrl;
        if (audioUrl) songData.audioUrl = audioUrl;
        
        if (songId) {
            await updateDoc(doc(db, 'songs', songId), songData);
            alert('Song updated successfully!');
        } else {
            songData.createdAt = new Date().toISOString();
            songData.plays = 0;
            await addDoc(collection(db, 'songs'), songData);
            alert('Song added successfully!');
        }
        
        closeModal('songModal');
        loadSongs();
        loadDashboard();
    } catch (error) {
        console.error('Error saving song:', error);
        alert('Error saving song');
    }
});

// Delete song
window.deleteSong = async function(songId) {
    if (!confirm('Are you sure you want to delete this song?')) return;
    
    try {
        await deleteDoc(doc(db, 'songs', songId));
        alert('Song deleted successfully!');
        loadSongs();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting song:', error);
        alert('Error deleting song');
    }
};

// Show add video modal
window.showAddVideoModal = function() {
    document.getElementById('videoModalTitle').textContent = 'Add Video';
    document.getElementById('videoForm').reset();
    document.getElementById('videoId').value = '';
    document.getElementById('videoThumbnailPreview').style.display = 'none';
    document.getElementById('videoModal').classList.add('active');
};

// Edit video
window.editVideo = async function(videoId) {
    try {
        const videoDoc = await getDoc(doc(db, 'videos', videoId));
        if (videoDoc.exists()) {
            const video = videoDoc.data();
            document.getElementById('videoModalTitle').textContent = 'Edit Video';
            document.getElementById('videoId').value = videoId;
            document.getElementById('videoTitle').value = video.title;
            document.getElementById('videoUrl').value = video.url;
            
            if (video.thumbnail) {
                document.getElementById('videoThumbnailPreview').src = video.thumbnail;
                document.getElementById('videoThumbnailPreview').style.display = 'block';
            }
            
            document.getElementById('videoModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading video:', error);
        alert('Error loading video');
    }
};

// Save video
document.getElementById('videoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const videoId = document.getElementById('videoId').value;
    const title = document.getElementById('videoTitle').value;
    const url = document.getElementById('videoUrl').value;
    const thumbnailFile = document.getElementById('videoThumbnail').files[0];
    
    try {
        let thumbnailUrl = null;
        
        if (thumbnailFile) {
            const thumbnailRef = ref(storage, `videos/thumbnails/${Date.now()}_${thumbnailFile.name}`);
            await uploadBytes(thumbnailRef, thumbnailFile);
            thumbnailUrl = await getDownloadURL(thumbnailRef);
        }
        
        const videoData = {
            title,
            url,
            updatedAt: new Date().toISOString()
        };
        
        if (thumbnailUrl) videoData.thumbnail = thumbnailUrl;
        
        if (videoId) {
            await updateDoc(doc(db, 'videos', videoId), videoData);
            alert('Video updated successfully!');
        } else {
            videoData.createdAt = new Date().toISOString();
            videoData.views = 0;
            await addDoc(collection(db, 'videos'), videoData);
            alert('Video added successfully!');
        }
        
        closeModal('videoModal');
        loadVideos();
        loadDashboard();
    } catch (error) {
        console.error('Error saving video:', error);
        alert('Error saving video');
    }
});

// Delete video
window.deleteVideo = async function(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
        await deleteDoc(doc(db, 'videos', videoId));
        alert('Video deleted successfully!');
        loadVideos();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting video:', error);
        alert('Error deleting video');
    }
};

// Show reply modal
window.showReplyModal = function(reviewId) {
    document.getElementById('replyReviewId').value = reviewId;
    document.getElementById('replyText').value = '';
    document.getElementById('replyModal').classList.add('active');
};

// Save reply
document.getElementById('replyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const reviewId = document.getElementById('replyReviewId').value;
    const reply = document.getElementById('replyText').value;
    
    try {
        await updateDoc(doc(db, 'reviews', reviewId), {
            reply: reply,
            status: 'replied',
            repliedAt: new Date().toISOString()
        });
        
        alert('Reply sent successfully!');
        closeModal('replyModal');
        loadReviews();
    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Error sending reply');
    }
});

// Delete review
window.deleteReview = async function(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        alert('Review deleted successfully!');
        loadReviews();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting review:', error);
        alert('Error deleting review');
    }
};

// Save settings
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('siteTitle').value;
    const primaryColor = document.getElementById('primaryColor').value;
    const secondaryColor = document.getElementById('secondaryColor').value;
    const logoFile = document.getElementById('siteLogo').files[0];
    
    try {
        const settings = {
            title,
            primaryColor,
            secondaryColor,
            updatedAt: new Date().toISOString()
        };
        
        if (logoFile) {
            const logoRef = ref(storage, 'settings/logo');
            await uploadBytes(logoRef, logoFile);
            settings.logo = await getDownloadURL(logoRef);
        }
        
        await updateDoc(doc(db, 'settings', 'site'), settings);
        alert('Settings saved successfully!');
        
        // Update preview
        if (settings.logo) {
            document.getElementById('logoPreview').src = settings.logo;
            document.getElementById('logoPreview').style.display = 'block';
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
    }
});

// Close modal
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('admin-modal')) {
        e.target.classList.remove('active');
    }
});
