const { contextBridge, ipcRenderer } = require('electron');
// We "Expose" an object called 'api' to the window object
contextBridge.exposeInMainWorld('api', {
    // This allows the UI to call 'window.api.selectFolder()'
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    // This will allow the UI to tell the Main process to start scanning
    scanFolder: (path) => ipcRenderer.send('scan-folder', path),
    // NEW: A way for the UI to know when the scan is done
    onScanFinished: (callback) => ipcRenderer.on('scan-finished', () => callback()),
    getAlbums: () => ipcRenderer.invoke('get-all-albums'),
    getBands: () => ipcRenderer.invoke('get-all-bands'),
    getBase64: (path) => ipcRenderer.invoke('get-base64', path),
    set_fav: (path)=> ipcRenderer.invoke('set-as-fav',path),
    last_played: ({queue, index, da}) =>ipcRenderer.invoke('last-played',{queue, index, da}),
    favs: ()=> ipcRenderer.invoke('favs'),
    playlists: ()=> ipcRenderer.invoke('get-all-playlists-obj'),
    create_playlist: (name)=> ipcRenderer.invoke('create-playlist',name),
    add_to_playlist: ({ playlistId, songId }) =>ipcRenderer.invoke('add-to-playlist',{ playlistId, songId }),
    showNativeMenu: (data) => ipcRenderer.send('show-native-menu', data),
    log_history:(songdata)=> ipcRenderer.invoke('log-history',songdata),
    save_settings:(settings)=> ipcRenderer.send('save-settings',settings),
    get_settings:()=> ipcRenderer.invoke('get-settings'),
    db_exists:()=> ipcRenderer.invoke('db-exists'),
    cover_handle:()=> ipcRenderer.invoke('select-playlist-cover'),
    save_details: (data) =>ipcRenderer.invoke('save-details',data),
    add_to_queue: (callback) => ipcRenderer.on('add-to-queue', (event, ceva) => callback(ceva)),

});