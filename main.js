const { app, BrowserWindow, ipcMain , dialog, Menu } = require('electron/main'); 
const path = require('node:path');
const Database = require('better-sqlite3');


function createWindow() {
  const win = new BrowserWindow({
    width: 1450,
    height: 900,
    minWidth: 820,    
    minHeight: 800,
    icon: path.join(__dirname, 'assets/logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false // This allows your app to use PC features
    },
    show: false,
  });

  // This loads your existing frontend
  win.loadFile('index.html'); 
  win.once('ready-to-show', () => {
    win.show();
  });
}
//cover extraction
const fs = require('fs');
const mm = require('music-metadata');
const crypto = require('crypto'); // To create unique names for images

async function handleCoverArt(metadata, songFilePath) {
    const picture = metadata.common.picture && metadata.common.picture[0];
    if(!picture){
      const folderPath = path.dirname(songFilePath);
      const commonNames = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png', 'album.jpg','album.png'];
      
      for (const name of commonNames) {
          const fullImagePath = path.join(folderPath, name);
          if (fs.existsSync(fullImagePath)) {
              return fullImagePath; // Return the path to the actual JPG/PNG file
          }
      }
    }
    if (picture) {
        // 1. Create a "covers" folder if it doesn't exist
        const coversDir = path.join(app.getPath('userData'), 'covers');
        if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir);

        // 2. Generate a unique filename based on the data (so we don't save duplicates)
        const hash = crypto.createHash('md5').update(picture.data).digest('hex');
        const fileName = `${hash}.jpg`;
        const filePath = path.join(coversDir, fileName);

        // 3. Save the image to your hard drive if it's not already there
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, picture.data);
        }

        return filePath; // This is what we store in the DB
    }
    return null; // No cover found
}
//music metadata extraction
async function scanDirectory(dirPath) {
    // 1. Read everything inside the folder (files and subfolders)
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // 2. If it's a folder, "Recurse" (dive inside it)
            await scanDirectory(fullPath);
        } else {
            // 3. If it's a file, check the extension
            const ext = path.extname(fullPath).toLowerCase();
            if (['.mp3', '.flac', '.wav', '.ogg', '.m4a','aac','aiff','aif'].includes(ext)) {
                try {
                    // 4. Extract the Metadata (Artist, Title, etc.)
                    const metadata = await mm.parseFile(fullPath);
                    const coverPath = await handleCoverArt(metadata,fullPath);
                    const cleanPath = fullPath.split(path.sep).join('/'); 
                    const songData = {
                        song_name: metadata.common.title || item, // Fallback to filename if no tag
                        artist: metadata.common.artist || 'Unknown Artist',
                        album: metadata.common.album || 'Unknown Album',
                        song_path: cleanPath,
                        cover_path: coverPath,
                        duration: metadata.format.duration,
                        track_number: metadata.common.track.no
                    };
                    // 5. Save it to your SQLite Database
                    saveToDatabase(songData);
                    
                } catch (error) {
                    console.error(error.message);
                }
            }
        }
    }
}

function saveToDatabase(song) {
    const insert = db.prepare(`
        INSERT OR IGNORE INTO songs (song_name, artist, album, song_path, cover_path, duration, track_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insert.run(song.song_name, song.artist, song.album, song.song_path, song.cover_path, song.duration, song.track_number);
}

const dbPath = path.join(app.getPath('userData'), 'library.db');
const db = new Database(dbPath, { 
    verbose: console.log 
});
const setupDatabase = () => {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS songs (
            song_id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_name TEXT,
            artist TEXT,
            album TEXT,
            song_path TEXT UNIQUE,
            cover_path TEXT,
            duration REAL,
            track_number INT,
            favorite INTEGER DEFAULT 0,
            fav_date TEXT,
            plays INTEGER DEFAULT 0
        )
    `).run();

    // 2. Create Playlists second
    db.prepare(`
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            cover_path TEXT
        )
    `).run();

    // 3. Create the link table LAST
    db.prepare(`
        CREATE TABLE IF NOT EXISTS playlist_songs (
            playlist_id INTEGER,
            song_id INTEGER,
            order_index INTEGER,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY(song_id) REFERENCES songs(song_id) ON DELETE CASCADE
        )
    `).run();
};
function get_albume(albumName){
  try {
      // Use .all() to get an array of all matching songs
      const songs = db.prepare(`
          SELECT song_name, song_path, duration, album, artist, favorite, song_id, cover_path, plays
          FROM songs 
          WHERE album = ?
          ORDER BY track_number ASC
      `).all(albumName);
      const piese = songs.map(row => ({
        name: row.song_name,
        path: row.song_path,
        album: row.album,
        duration: row.duration,
        artist: row.artist,
        is_fav: row.favorite,
        id: row.song_id,
        cover: row.cover_path,
        plays:row.plays
      }));
      return piese;
  } catch (error) {
      console.error("Search error:", error);
      return [];
  }
}
function create_playlist(name) {
    try {
        const info = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(name);
        return { success: true, id: info.lastInsertRowid };
    } catch (err) {
        console.error("Playlist creation failed:", err);
        return { success: false, error: err.message };
    }
}
function add_to_playlist(playlistId, songId) {
    try {
        // This subquery automatically calculates the next order_index
        const query = `
            INSERT INTO playlist_songs (playlist_id, song_id, order_index)
            VALUES (?, ?, (SELECT IFNULL(MAX(order_index), 0) + 1 
                           FROM playlist_songs WHERE playlist_id = ?))
        `;
        db.prepare(query).run(playlistId, songId, playlistId);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
//IPC main handle stuff
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
      properties: ['openDirectory'] // Tell Windows we only want Folders, not individual files
  });
  if (result.canceled) {
      return null; // User clicked "Cancel"
  } else {
      const folderPath = result.filePaths[0]; // Get the first folder they picked
      return folderPath;
  }
});
ipcMain.on('scan-folder', async (event, folderPath) => {
  await scanDirectory(folderPath);
  // Tell the UI the database is updated
  event.reply('scan-finished'); 
});
ipcMain.handle('get-all-albums', async () => {
    try {
        // We group by album to get one entry per album name
        const albums = db.prepare(`
            SELECT DISTINCT album, cover_path, artist
            FROM songs 
            GROUP BY album 
            ORDER BY album ASC
        `).all();
        const albume = albums.map(row => ({
          name: row.album,
          cover: row.cover_path,
          artist: row.artist,
          song: get_albume(row.album)
        }));
        return albume;
    } catch (error) {
        console.error("Failed to fetch albums:", error);
        return [];
    }
    //Gemini smarter 1 query method 
    // try {
    //     // 1. Fetch everything at once (Synchronous)
    //     // We order by album and track_number so the grouping is already sorted
    //     const allSongs = db.prepare(`
    //         SELECT song_name, song_path, duration, album, artist, favorite, song_id, cover_path, track_number
    //         FROM songs 
    //         ORDER BY album ASC, track_number ASC
    //     `).all();

    //     // 2. The "Box" logic (Grouping)
    //     const albumMap = allSongs.reduce((acc, row) => {
    //         const albumName = row.album || "Unknown Album";

    //         if (!acc[albumName]) {
    //             acc[albumName] = {
    //                 name: albumName,
    //                 artist: row.artist,
    //                 cover: row.cover_path,
    //                 songs: []
    //             };
    //         }

    //         acc[albumName].songs.push({
    //             name: row.song_name,
    //             path: row.song_path,
    //             album: row.album,
    //             duration: row.duration,
    //             artist: row.artist,
    //             is_fav: row.favorite,
    //             id: row.song_id,
    //             cover: row.cover_path,
    //             track_num: row.track_number
    //         });

    //         return acc;
    //     }, {});

    //     // 3. Return as an array
    //     return Object.values(albumMap);
});

ipcMain.handle('get-all-bands', async () => {
    try {
        const artists = db.prepare('SELECT DISTINCT artist FROM songs ORDER BY artist ASC').all();
        const artistList = artists.map(row => {
            const artistName = row.artist;
            // 2. For each artist, get their unique albums
            const albums = db.prepare('SELECT DISTINCT album FROM songs WHERE artist = ? ORDER BY album ASC')
                .all(artistName)
                .map(albumRow => albumRow.album); // Flatten to a simple array of strings
            // 3. Return the structured object
            return {
                name: artistName,
                albums: albums
            };
        });
    return artistList;
    } catch (error) {
        console.error("Failed to fetch artists:", error);
        return [];
    }
});
ipcMain.handle('get-base64', async (event, filePath) => {
    const fs = require('fs').promises;
    try {
        const data = await fs.readFile(filePath);
        return `data:image/png;base64,${data.toString('base64')}`;
    } catch (e) {
        console.error("Failed to read image", e);
        return null;
    }
});
ipcMain.handle('set-as-fav', async (event ,id) =>{
    db.prepare(`
        UPDATE songs
        SET
            favorite = CASE
                WHEN favorite = 0 THEN 1
                ELSE 0
            END,
            fav_date = CASE
                WHEN favorite = 0 THEN CURRENT_TIMESTAMP
                ELSE NULL
            END
        WHERE song_id = ?
    `).run(id);
    return null;
});
const filePath = path.join(app.getPath('userData'), 'playback.json');

ipcMain.handle('last-played', async(event, {queue, index, da}) =>{
    // Convert array to object if you want numeric keys
    if(da==true){
        fs.writeFileSync(filePath, JSON.stringify({ queue, index }, null, 2), 'utf-8');
    }
    else return loadPlayback(); 
});
const loadPlayback = () => {
    if (!fs.existsSync(filePath)) return null;
    const { queue, index } = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { queue, index };
};
ipcMain.handle('favs', async()=>{
    const favs= db.prepare(`
          SELECT song_name, song_path, duration, album, cover_path, artist, favorite, fav_date, plays
          FROM songs 
          WHERE favorite =1
          ORDER BY fav_date ASC`).all();
    const fav_list=favs.map(row =>({
        name: row.song_name,
        path: row.song_path,
        artist: row.artist,
        duration: row.duration,
        cover: row.cover_path,
        album: row.album,
        is_fav: row.favorite,
        fav_date: row.fav_date,
        plays: row.plays
    }));
    return fav_list;
});
ipcMain.handle('create-playlist', async (event, name) => {
    create_playlist(name);
});

// 3. Add a song to a specific playlist
ipcMain.handle('add-to-playlist', async (event, { playlistId, songId }) => {
    add_to_playlist(playlistId, songId);
});
// 2. Get all playlist names (for your sidebar/navigation)
ipcMain.handle('get-all-playlists-obj', async (event) => {
    let playlists=db.prepare('SELECT * FROM playlists ORDER BY name ASC').all();
    const playlists_list=playlists.map(row =>({
        name: row.name,
        id: row.id,
        cover: row.cover_path
    }));
    
    let playlist_obj=[];
    const query = `
        SELECT s.* FROM songs s
        JOIN playlist_songs ps ON s.song_id = ps.song_id
        WHERE ps.playlist_id = ?
        ORDER BY ps.order_index ASC
    `;
    for(let i=0;i<playlists_list.length;i++){
        const songs=db.prepare(query).all(playlists_list[i].id);
        const song= songs.map(row =>({
            name: row.song_name,
            path: row.song_path,
            artist: row.artist,
            duration: row.duration,
            cover: row.cover_path,
            album: row.album,
            is_fav: row.favorite,
            fav_date: row.fav_date,
            plays: row.plays
        }));
        playlist_obj[i]={
            name:playlists_list[i].name,
            songs:song,
            cover:playlists_list[i].cover,
            id:playlists_list[i].id
        }
    }
    return playlist_obj;
});


ipcMain.on('show-native-menu', async (event, data) => {
    console.log("Main process received show-native-menu for ID:", data.id);
    // 1. Fetch current playlists to build the submenu
    // (Using your existing DB logic)
    const playlists = db.prepare('SELECT * FROM playlists ORDER BY name ASC').all();
    const template = [
        {
            label: 'Add to Queue',
            click: () => {
                // Send the song data back to the renderer window that opened this menu
                event.sender.send('add-to-queue', data.id);
            }
        },
        // Visual line separator
        { type: 'separator' },
        {
            label: 'Add to Playlist',
            submenu: [
                {
                    label: `＋ Create Playlist: "${data.title}"`,
                    click: () => {
                        try {
                            // 1. Create the playlist using the song's title
                            const insertPl = create_playlist(data.title);
                            const newPlId = insertPl.lastInsertRowid;
                            // 2. Immediately add the song to this new playlist
                            add_to_playlist(newPlId, data.id);       
                        }
                        catch (err) {
                            // If playlist name already exists, you might want to just add the song to it
                            console.error("Error auto-creating playlist:", err.message);
                        }
                    }
                },
                { type: 'separator' },
                ...playlists.map(pl => ({
                    label: pl.name,
                    click: () => {
                        const query = `
                            INSERT INTO playlist_songs (playlist_id, song_id, order_index)
                            VALUES (?, ?, (SELECT IFNULL(MAX(order_index), 0) + 1 FROM playlist_songs WHERE playlist_id = ?))
                        `;
                        db.prepare(query).run(pl.id, data.id, pl.id);
                    }
                }))
            ]
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup();
});

const os = require('os');
const MAX_SONGS_PER_FILE = 1000; // Spotify uses file size, but song count is easier
const historyDir = path.join(app.getPath('userData'), 'History');

if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir);

ipcMain.handle('log-history', async (event, songData) => {
    // 1. Get all history files and sort them numerically
    let files = fs.readdirSync(historyDir)
        .filter(f => f.startsWith('history_'))
        .sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]));

    let currentFile = files.length > 0 ? files[0] : 'history_0.json';
    let filePath = path.join(historyDir, currentFile);
    let history = [];
    if (fs.existsSync(filePath)) {
        history = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    // 2. Check if current file is full
    if (history.length >= MAX_SONGS_PER_FILE) {
        let nextIndex = parseInt(currentFile.split('_')[1]) + 1;
        currentFile = `history_${nextIndex}.json`;
        filePath = path.join(historyDir, currentFile);
        history = []; // Start fresh array for new file
    }
    // 3. Add new play entry (Spotify style)
    const entry = {
        ts: new Date().toISOString(),
        track_name: songData.name,
        artist_name: songData.artist,
        album_name: songData.album,
        ms_played: Math.floor(songData.ms_played || 0),
        total_ms: Math.floor((songData.duration || 0) * 1000), // Convert seconds to ms
        skipped: songData.skipped || false,
        device_name: os.hostname(),
        platform: os.platform()
    };
    history.unshift(entry); // Newest at the top
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
    if(songData.ms_played>=songData.duration){
        db.prepare(`
            UPDATE songs
            SET plays = plays+1
            WHERE song_id = ?
            `).run(songData.id);
    }
    return { success: true };
});

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Handle saving settings
ipcMain.on('save-settings', (event, settings) => {
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
});

// Handle loading settings
ipcMain.handle('get-settings', async () => {
    if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
    // Default settings if file doesn't exist
    return { isShuffle: false, repeatMode: 0, pr_color: "8324c2e8", sec_color1: "fa6800fc", sec_color2: "27f1f1" }; 
});
ipcMain.handle('db-exists', async =>{
    if(fs.existsSync(dbPath)){
        return true;
    }
    else{
        return false;
    }
});
ipcMain.handle('select-playlist-cover', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const sourcePath = result.filePaths[0];
    const fileBuffer = fs.readFileSync(sourcePath);
    
    // Use your existing hashing logic
    const coversDir = path.join(app.getPath('userData'), 'covers');
    if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const ext = path.extname(sourcePath) || '.jpg';
    const fileName = `${hash}${ext}`;
    const targetPath = path.join(coversDir, fileName);

    if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, fileBuffer);
    }

    // Return the path (or a protocol URL) to the renderer
    return targetPath; 
});
ipcMain.handle('save-details', async (event,{name, id, cover, type}) => {
    console.log(name, id, cover, type);
    if(type == "playlist"){
        try {
            if(name==null){
                db.prepare(`
                UPDATE playlists
                SET cover_path = ?,
                WHERE id = ?
            `).run(cover, id);
            }else{
                if(cover==null){
                    db.prepare(`
                    UPDATE playlists
                    SET name = ?
                    WHERE id = ?
                `).run(name, id);
                }
                else{
                    db.prepare(`
                        UPDATE playlists
                        SET cover_path = ?,
                            name = ?
                        WHERE id = ?
                    `).run(cover, name, id); 
                }
            }
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                console.error("A playlist with this name already exists!");
            } else {
                console.error("Failed to update playlist:", error);
            }
        }
    }
    else{
        const old_name = id;
        if(type == "album"){
        try {
            if(name==null){
                db.prepare(`
                        UPDATE songs
                        SET cover_path = ?
                        WHERE album = ?
                    `).run(cover, old_name);
            }else{
                if(cover==null){
                    db.prepare(`
                        UPDATE songs
                        SET album = ?
                        WHERE album = ?
                    `).run(name, old_name);
                }
                else{
                    db.prepare(`
                        UPDATE songs
                        SET cover_path = ?,
                            album = ?
                        WHERE album = ?
                    `).run(cover, name, old_name);
                }
            }
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                console.error("A playlist with this name already exists!");
            } else {
                console.error("Failed to update album:", error);
            }
        }
    }
    }
});
app.whenReady().then(() => {
    setupDatabase();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})
// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();        
});
