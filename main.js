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
      nodeIntegration: false 
    },
    show: false,
  });

  win.loadFile('index.html'); 
  win.once('ready-to-show', () => {
    win.show();
  });
}
//cover extraction
const fs = require('fs');
const mm = require('music-metadata');
const crypto = require('crypto'); 

async function handleCoverArt(metadata, songFilePath) {
    const picture = metadata.common.picture && metadata.common.picture[0];
    if(!picture){
      const folderPath = path.dirname(songFilePath);
      const commonNames = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png', 'album.jpg','album.png'];
      
      for (const name of commonNames) {
          const fullImagePath = path.join(folderPath, name);
          if (fs.existsSync(fullImagePath)) {
              return fullImagePath; 
          }
      }
    }
    if (picture) {
        const coversDir = path.join(app.getPath('userData'), 'covers');
        if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir);

        const hash = crypto.createHash('md5').update(picture.data).digest('hex');
        const fileName = `${hash}.jpg`;
        const filePath = path.join(coversDir, fileName);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, picture.data);
        }

        return filePath; 
    }
    return null; 
}

async function scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await scanDirectory(fullPath);
        } else {
            const ext = path.extname(fullPath).toLowerCase();
            if (['.mp3', '.flac', '.wav', '.ogg', '.m4a','aac','aiff','aif'].includes(ext)) {
                try {
                    const metadata = await mm.parseFile(fullPath);
                    const coverPath = await handleCoverArt(metadata,fullPath);
                    const cleanPath = fullPath.split(path.sep).join('/'); 
                    const songData = {
                        song_name: metadata.common.title || item, 
                        artist: metadata.common.artist || 'Unknown Artist',
                        album: metadata.common.album || 'Unknown Album',
                        song_path: cleanPath,
                        cover_path: coverPath,
                        duration: metadata.format.duration,
                        track_number: metadata.common.track.no
                    };
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

const dbPath = 'library.db';
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

    db.prepare(`
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            cover_path TEXT
        )
    `).run();

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
      const songs = db.prepare(`
          SELECT song_id
          FROM songs 
          WHERE album = ?
          ORDER BY track_number ASC
      `).pluck().all(albumName);
      console.log(songs);
      return songs;

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
      properties: ['openDirectory'] 
  });
  if (result.canceled) {
      return null; 
  } else {
      const folderPath = result.filePaths[0]; 
      return folderPath;
  }
});
ipcMain.on('scan-folder', async (event, folderPath) => {
  await scanDirectory(folderPath);
  event.reply('scan-finished'); 
});
ipcMain.handle('get-all-albums', async () => {
    try {
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
          songs: get_albume(row.album)
        }));
        return albume;
    } catch (error) {
        console.error("Failed to fetch albums:", error);
        return [];
    }
});
ipcMain.handle('get-all-songs-obj', async (event) => {
    try {
        const songs = db.prepare('SELECT * FROM songs').all();
        const songs_list = songs.map(row=>({
            name: row.song_name,
            path: row.song_path,
            album: row.album,
            duration: row.duration,
            artist: row.artist,
            is_fav: row.favorite,
            id: row.song_id,
            cover: row.cover_path,
            plays: row.plays,
        }));
    return songs_list;
    } catch (error) {
        console.error("Failed to fetch artists:", error);
        return [];
    }

});
ipcMain.handle('get-all-bands', async () => {
    try {
        const artists = db.prepare('SELECT DISTINCT artist FROM songs ORDER BY artist ASC').all();
        const artistList = artists.map(row => {
            const artistName = row.artist;
            const albums = db.prepare('SELECT DISTINCT album FROM songs WHERE artist = ? ORDER BY album ASC')
                .all(artistName)
                .map(albumRow => albumRow.album); 
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
// const filePath = path.join(app.getPath('userData'), 'playback.json');
const filePath ='playback.json';
ipcMain.handle('last-played', async(event, {queue, index, da}) =>{
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
          SELECT song_id
          FROM songs 
          WHERE favorite =1
          ORDER BY fav_date ASC`).pluck().all();
    return favs;
});
ipcMain.handle('create-playlist', async (event, name) => {
    create_playlist(name);
});

ipcMain.handle('add-to-playlist', async (event, { playlistId, songId }) => {
    add_to_playlist(playlistId, songId);
});

ipcMain.handle('get-all-playlists-obj', async (event) => {
    let playlists=db.prepare('SELECT * FROM playlists ORDER BY name ASC').all();
    const playlists_list=playlists.map(row =>({
        name: row.name,
        id: row.id,
        cover: row.cover_path
    }));
    
    let playlist_obj=[];
    const query = `
        SELECT s.song_id FROM songs s
        JOIN playlist_songs ps ON s.song_id = ps.song_id
        WHERE ps.playlist_id = ?
        ORDER BY ps.order_index ASC
    `;
    for(let i=0;i<playlists_list.length;i++){
        const songs=db.prepare(query).pluck().all(playlists_list[i].id);
        console.log(songs);
        playlist_obj[i]={
            name:playlists_list[i].name,
            songs:songs ,
            cover:playlists_list[i].cover,
            id:playlists_list[i].id
        }
    }
    return playlist_obj;
});


ipcMain.on('show-native-menu', async (event, data) => {
    console.log("Main process received show-native-menu for ID:", data.id);
    const playlists = db.prepare('SELECT * FROM playlists ORDER BY name ASC').all();
    const template = [
        {
            label: 'Add to Queue',
            click: () => {
                event.sender.send('add-to-queue', data.id);
            }
        },
        { type: 'separator' },
        {
            label: 'Add to Playlist',
            submenu: [
                {
                    label: `＋ Create Playlist: "${data.title}"`,
                    click: () => {
                        try {
                            const insertPl = create_playlist(data.title);
                            const newPlId = insertPl.lastInsertRowid;
                            add_to_playlist(newPlId, data.id);       
                        }
                        catch (err) {
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
const MAX_SONGS_PER_FILE = 1000; 
// const historyDir = path.join(app.getPath('userData'), 'History');
const historyDir = 'History';
if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir);

ipcMain.handle('log-history', async (event, songData) => {
    let files = fs.readdirSync(historyDir)
        .filter(f => f.startsWith('history_'))
        .sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]));

    let currentFile = files.length > 0 ? files[0] : 'history_0.json';
    let filePath = path.join(historyDir, currentFile);
    let history = [];
    if (fs.existsSync(filePath)) {
        history = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    if (history.length >= MAX_SONGS_PER_FILE) {
        let nextIndex = parseInt(currentFile.split('_')[1]) + 1;
        currentFile = `history_${nextIndex}.json`;
        filePath = path.join(historyDir, currentFile);
        history = []; 
    }
    const entry = {
        ts: new Date().toISOString(),
        track_name: songData.name,
        artist_name: songData.artist,
        album_name: songData.album,
        ms_played: Math.floor(songData.ms_played || 0),
        total_ms: Math.floor((songData.duration || 0) * 1000), 
        skipped: songData.skipped || false,
        device_name: os.hostname(),
        platform: os.platform()
    };
    history.unshift(entry); 
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

// const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const settingsPath = 'settings.json';

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
    return { isShuffle: false, repeatMode: 0, pr_color: "#8324c2", sec_color1: "#fa6800", sec_color2: "#27f1f1" }; 
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
