import { 
    db, storage, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, 
    query, orderBy, getDoc, ref, uploadBytes, getDownloadURL, deleteObject,
    signInWithEmailAndPassword, signOut 
} from './firebase-config.js';

// Check authentication
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadDashboard();
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminContent').style.display = 'none';
    }
});

// Login
document.getElementById('adminLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login successful!');
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed: ' + error.message, 'error');
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Tab navigation
document.querySelectorAll('.admin-nav li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        
        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'analytics') {
            loadAnalytics();
        }
    });
});

// Load dashboard
async function loadDashboard() {
    try {
        const songsSnapshot = await getDocs(collection(db, 'songs'));
        const videosSnapshot = await getDocs(collection(db, 'videos'));
        const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
        
        let totalPlays = 0;
        songsSnapshot.forEach(doc => {
            totalPlays += doc.data().plays || 0;
        });
        
        document.getElementById('totalSongs').textContent = songsSnapshot.size;
        document.getElementById('totalVideos').textContent = videosSnapshot.size;
        document.getElementById('totalReviews').textContent = reviewsSnapshot.size;
        document.getElementById('totalPlays').textContent = totalPlays;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load songs for admin
async function loadSongsAdmin() {
    try {
        const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const tbody = document.getElementById('songsTableBody');
        tbody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const song = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${song.thumbnail || 'assets/default-song.jpg'}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                    <td>${song.title}</td>
                    <td>${song.artist || 'NWTN MUSICAL'}</td>
                    <td>${song.duration || '3:30'}</td>
                    <td>${song.plays || 0}</td>
                    <td>
                        <button onclick="editSong('${doc.id}')" class="edit-btn"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteSong('${doc.id}')" class="delete-btn"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Load videos for admin
async function loadVideosAdmin() {
    try {
        const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const tbody = document.getElementById('videosTableBody');
        tbody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const video = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${video.thumbnail || getYouTubeThumbnail(video.url)}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                    <td>${video.title}</td>
                    <td><a href="${video.url}" target="_blank">Watch</a></td>
                    <td>${video.views || 0}</td>
                    <td>
                        <button onclick="editVideo('${doc.id}')" class="edit-btn"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteVideo('${doc.id}')" class="delete-btn"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// Load reviews for admin
async function loadReviewsAdmin() {
    try {
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const tbody = document.getElementById('reviewsTableBody');
        tbody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
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
                        ${!review.reply ? `<button onclick="showReplyModal('${doc.id}')" class="reply-btn"><i class="fas fa-reply"></i></button>` : ''}
                        <button onclick="deleteReview('${doc.id}')" class="delete-btn"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Load site settings
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
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settings = {
        title: document.getElementById('siteTitle').value,
        primaryColor: document.getElementById('primaryColor').value,
        secondaryColor: document.getElementById('secondaryColor').value,
        updatedAt: new Date().toISOString()
    };
    
    // Upload logo if selected
    const logoFile = document.getElementById('siteLogo').files[0];
    if (logoFile) {
        try {
            const storageRef = ref(storage, 'settings/logo');
            await uploadBytes(storageRef, logoFile);
            settings.logo = await getDownloadURL(storageRef);
        } catch (error) {
            console.error('Error uploading logo:', error);
        }
    }
    
    try {
        await updateDoc(doc(db, 'settings', 'site'), settings);
        showToast('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    }
});

// Add song
window.showAddSongModal = function() {
    document.getElementById('songModalTitle').textContent = 'Add Song';
    document.getElementById('songForm').reset();
    document.getElementById('songId').value = '';
    document.getElementById('thumbnailPreview').style.display = 'none';
    openModal('songModal');
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
            openModal('songModal');
        }
    } catch (error) {
        console.error('Error loading song:', error);
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
    
    let thumbnailUrl = null;
    let audioUrl = null;
    
    try {
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
            // Update existing song
            await updateDoc(doc(db, 'songs', songId), songData);
            showToast('Song updated successfully!');
        } else {
            // Add new song
            songData.createdAt = new Date().toISOString();
            songData.plays = 0;
            await addDoc(collection(db, 'songs'), songData);
            showToast('Song added successfully!');
        }
        
        closeModal('songModal');
        loadSongsAdmin();
    } catch (error) {
        console.error('Error saving song:', error);
        showToast('Error saving song', 'error');
    }
});

// Delete song
window.deleteSong = async function(songId) {
    if (!confirm('Are you sure you want to delete this song?')) return;
    
    try {
        await deleteDoc(doc(db, 'songs', songId));
        showToast('Song deleted successfully!');
        loadSongsAdmin();
    } catch (error) {
        console.error('Error deleting song:', error);
        showToast('Error deleting song', 'error');
    }
};

// Add video
window.showAddVideoModal = function() {
    document.getElementById('videoModalTitle').textContent = 'Add Video';
    document.getElementById('videoForm').reset();
    document.getElementById('videoId').value = '';
    document.getElementById('videoThumbnailPreview').style.display = 'none';
    openModal('videoModal');
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
            openModal('videoModal');
        }
    } catch (error) {
        console.error('Error loading video:', error);
    }
};

// Save video
document.getElementById('videoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const videoId = document.getElementById('videoId').value;
    const title = document.getElementById('videoTitle').value;
    const url = document.getElementById('videoUrl').value;
    const thumbnailFile = document.getElementById('videoThumbnail').files[0];
    
    let thumbnailUrl = null;
    
    try {
        // Upload thumbnail if provided
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
            // Update existing video
            await updateDoc(doc(db, 'videos', videoId), videoData);
            showToast('Video updated successfully!');
        } else {
            // Add new video
            videoData.createdAt = new Date().toISOString();
            videoData.views = 0;
            await addDoc(collection(db, 'videos'), videoData);
            showToast('Video added successfully!');
        }
        
        closeModal('videoModal');
        loadVideosAdmin();
    } catch (error) {
        console.error('Error saving video:', error);
        showToast('Error saving video', 'error');
    }
});

// Delete video
window.deleteVideo = async function(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
        await deleteDoc(doc(db, 'videos', videoId));
        showToast('Video deleted successfully!');
        loadVideosAdmin();
    } catch (error) {
        console.error('Error deleting video:', error);
        showToast('Error deleting video', 'error');
    }
};

// Show reply modal
window.showReplyModal = function(reviewId) {
    document.getElementById('replyReviewId').value = reviewId;
    document.getElementById('replyText').value = '';
    openModal('replyModal');
};

// Submit reply
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
        
        showToast('Reply sent successfully!');
        closeModal('replyModal');
        loadReviewsAdmin();
    } catch (error) {
        console.error('Error sending reply:', error);
        showToast('Error sending reply', 'error');
    }
});

// Delete review
window.deleteReview = async function(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        showToast('Review deleted successfully!');
        loadReviewsAdmin();
    } catch (error) {
        console.error('Error deleting review:', error);
        showToast('Error deleting review', 'error');
    }
};

// Load analytics
async function loadAnalytics() {
    try {
        // Load songs data
        const songsSnapshot = await getDocs(collection(db, 'songs'));
        const songsData = [];
        songsSnapshot.forEach(doc => {
            songsData.push({
                title: doc.data().title,
                plays: doc.data().plays || 0
            });
        });
        
        // Sort by plays and take top 10
        songsData.sort((a, b) => b.plays - a.plays);
        const topSongs = songsData.slice(0, 10);
        
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
                maintainAspectRatio: false
            }
        });
        
        // Load videos data
        const videosSnapshot = await getDocs(collection(db, 'videos'));
        const videosData = [];
        videosSnapshot.forEach(doc => {
            videosData.push({
                title: doc.data().title,
                views: doc.data().views || 0
            });
        });
        
        // Sort by views and take top 10
        videosData.sort((a, b) => b.views - a.views);
        const topVideos = videosData.slice(0, 10);
        
        // Create videos chart
        new Chart(document.getElementById('videosChart'), {
            type: 'bar',
            data: {
                labels: topVideos.map(v => v.title),
                datasets: [{
                    label: 'Views',
                    data: topVideos.map(v => v.views),
                    backgroundColor: '#a51502'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        
        // Load reviews for ratings distribution
        const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
        const ratings = [0, 0, 0, 0, 0];
        reviewsSnapshot.forEach(doc => {
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
                maintainAspectRatio: false
            }
        });
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Utility functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
};

function showToast(message, type = 'success') {
    // You can implement a toast notification here
    alert(message); // Temporary solution
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSongsAdmin();
    loadVideosAdmin();
    loadReviewsAdmin();
    loadSettings();
    
    // Tab click handlers
    document.querySelectorAll('.admin-nav li').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            if (tabId === 'songs') loadSongsAdmin();
            if (tabId === 'videos') loadVideosAdmin();
            if (tabId === 'reviews') loadReviewsAdmin();
            if (tabId === 'settings') loadSettings();
            if (tabId === 'analytics') loadAnalytics();
        });
    });
});
