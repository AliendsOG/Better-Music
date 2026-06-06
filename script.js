let home_section_names=["Jump back in", "Long time no see","Recently Played","Jump back in", "Long time no see",
"Your heavy hitters",       // For most played tracks
"From the vault",           // For older music in the library
"Something different",       // For albums you haven't touched yet
"Stuck on repeat",          // For that one album you've played 5 times today
"The daily rotation",       // Your consistent go-to's
"Hidden gems",              // High rated but low play count
"Blast from the past",      // Stuff played a lot a year ago but not lately
"Freshly added",            // The newest FLACs in your folder
"Just for tonight" ];       // A nice vibe for evening listening
let albums_obj_list = [];
let band_obj_list=[];
let playlist_obj_list=[];
let fav=[];
let queue=[];
let queue_index=0;
let shuffledIndices = [];
let shuffleStep = 0; // This tracks our position in the shuffled list
let isShuffle = false;
let repeatMode = 0;
let song_map= {};
let song_name_map={};
let album_map = {};
let artist_map ={};
let playlist_map ={};
let fav_map = {};
let song_search={};
let artist_search =[];
async function handleFolderSelection() {
    // 1. Tell the Main process to open the Windows Folder Picker
    const folderPath = await window.api.selectFolder();
    if (!folderPath) {
        return;
    }
    // 3. Signal the Main process to start the SQLite scan
    window.api.scanFolder(folderPath);
}
// 4. Listen for the "Finished" signal from the Main process
window.api.onScanFinished(() => {
    home_page();
});
//make the array for the album objects and band object 
async function get_stuff() {
    if (window.api.db_exists()){
    albums_obj_list= await window.api.getAlbums();
    band_obj_list= await window.api.getBands();
    playlist_obj_list= await window.api.playlists();
    fav= await window.api.favs();
    const settings = await window.api.get_settings(); 
    // Now 'settings' is a real object like { isShuffle: true, repeatMode: 1 }
    isShuffle = settings.isShuffle;
    repeatMode = settings.repeatMode; 
    for(let i=0;i<albums_obj_list.length;i++){
        let a=albums_obj_list[i];
        if(a.cover==null){
          a.cover="img/stock cover.jpg";
        }
        let songs= a.song;
        for(let j=0;j<songs.length;j++){
            song_map[songs[j].id]=songs[j];
            song_name_map[songs[j].name]=songs[j];
            song_search[i]=songs[j].name;
        }
        album_map[a.name]=a;
    }
    for(let i=0;i<band_obj_list.length;i++){
        artist_map[band_obj_list[i].name]=band_obj_list[i];
        artist_search[i]=band_obj_list[i].name;
    }
    for(let i=0;i<playlist_obj_list.length;i++){    
        playlist_map[playlist_obj_list[i].name]=playlist_obj_list[i];
    }
    for(let i=0;i<fav.length;i++){
        fav_map[fav[i].name]=fav[i];
    }
    let dn=false;
    let ceva = await window.api.last_played({queue, queue_index, dn});
    if(ceva!=null){
        queue_index=ceva.index;
        queue=ceva.queue;
    }   
    }
    console.log("real playlist",playlist_obj_list)
    console.log("songs:",song_map,"artist:", artist_map, "playlist:",playlist_map,"album:",album_map,"favs",fav_map);
}
function update_map(type, thing,i){
    if(type=="fav"){
        fav_map[thing]=fav[i];
    }
}
// creates the song card 
function song_card(album, band_name, cover_src, song) {
    return `
    <div class="song-card-shell" data-type="album" data-album="${album}">
        <div class="song-card glossy" >
            <div onclick="album_layout(id)" id="${album}" class="song-card-click"  data-bs-toggle="modal" data-bs-target="#ceva">
                <img class="cover" src="${cover_src}" alt="${album} album cover" width="100%">
                <div class="song-details">
                    <p class="song-name">${album}</p>
                    <p class="band-name">${band_name}</p>
                </div>
            </div>
            <button class="play-button" onclick="Play('${song.name}','${album}')">
                <img class="play-button-icon" src="img/control_play.svg" alt="play button">
            </button>
        </div>
    </div>`;
}
//create the item for the song list for the album layout
function album_list_item(song, cover_src,j, album){
    let icon="img/fav_icon.svg";
    if(fav_map[song.name]!=null){
        icon="img/full_fav_icon.svg";
    }
    let min= Math.trunc(song.duration / 60);
    let sec= Math.trunc(song.duration%60);
    if(sec<10)sec="0"+sec;
    let e="";
    if(j==1) e=`style="padding-right:10px !important;"`;
    return `<div class="song-item d-flex glossy" >
                <div class="col-9 d-flex da" onclick="Play('${song.name}','${album}')" data-id="${song.id}" data-type="song" data-title="${song.name}">
                    <p class="band-name p-2" ${e}>${j}</p>
                    <img class="song-item-cover" src="${cover_src}" alt="album cover">
                    <div>
                        <p class="band-name list-text">${song.name}</p>
                        <p class="band-name list-text">${song.artist}</p>
                    </div>
                </div>
                <p class="col-1 band-name p-2" onclick="Play('${song.name}','${album}')">69</p> 
                <img class="col-1 music-control-icon container-fluid" src="${icon}" id="${song.id}" onclick="add_to_fav(id)" alt="favorite toggle">
                <p class="col-1 band-name p-2">${min}:${sec}</p>
            </div>`;
}

function album_layout(album_id){
    let band= "";
    let songs =[];
    let cover_src="img/stock cover.jpg";
    let cover="img/stock cover.jpg";
    let album= {};
    if(album_map[album_id]!=null){
        album=album_map[album_id];
        band= album.artist;
        songs =album.song;
        cover_src=album.cover||"img/stock cover.jpg";
    }
    else{
        album =playlist_map[album_id];
        band= "You";
        songs =album.songs;
        cover_src=album.cover||"img/stock cover.jpg";
    }
    let layout_html=`<div class="list-label d-flex">
                        <div class="col-9 d-flex">
                            <p class="band-name nr-list ">#</p>
                            <p class="band-name">Title</p>
                        </div>
                        <p class="col-2 band-name">Plays</p>
                        <p class="col-1 band-name">Length</p>
                    </div>`;
    document.getElementById("edit_view").innerHTML=`
        <p class="artist-name" id="modal_artist">Artist</p>
        <p class="band-name" id="modal_song_nr">12 Songs</p>`;
    document.getElementById("modal_album").innerText=album_id;
    document.getElementById("modal_artist").innerText=band;
    document.getElementById("modal_song_nr").innerText= songs.length+" Songs";
    document.getElementById("modal_album_src").src=cover_src;
    document.getElementById("edit_buttons").innerHTML=`
    <button class="edit-icon glossy edit-icon-perm" id="edit_btn_perm" onclick="edit_view('${album_id}')">
        <img src="img/edit_icon.svg" alt="" class="edit-icon-img">
    </button>`;
    document.getElementById("edit_btn").innerHTML=`<img src="img/edit_icon.svg" alt="" class="edit-icon-img">`;
    document.getElementById("modal_album_src").classList="album-cover-layout glossy";
    document.getElementById("edit_btn").onclick=() => {
        edit_view(album_id);
    };
    for(let j=1;j<=songs.length;j++){
        cover="img/stock cover.jpg";
        if(songs[j-1].cover!=null) cover = songs[j-1].cover;
        layout_html+=album_list_item(songs[j-1],cover,j, album.name);
    }
    layout_html+=`</div> 
    </div>`;
    document.getElementById("modal_song_list").innerHTML=layout_html;
}
// creates the home page
async function home_page(){
    await get_stuff();
    if (albums_obj_list[0]==null){
        document.getElementById("sections").innerHTML = `<div class="container no-song">
            <p class="section-text no-song-text">No songs found. Please select a folder</p>
            <button class="import-button" id="import" onclick="handleFolderSelection()">
                <p class="navbar-text import-text">Select folder</p>
            </button>
        </div>`;
    }else{
        document.getElementById("sections").removeAttribute("style");
        let j=0;
        let section_html =`
                <div class="section container-fluid">
                    <p class="section-text ">${home_section_names[j]}</p>
                    <div class="carousel">
                    <div class="carousel-wrapper ">`;
        for(let i=0; i<albums_obj_list.length; i++){  
            section_html += song_card(albums_obj_list[i].name, albums_obj_list[i].artist, albums_obj_list[i].cover, albums_obj_list[i].song[0]);
            if(((i+1)%8==0 && i!=0) && (albums_obj_list[i+1]!=null)){
                j+=1;
                section_html +=`</div>
                    </div>
                </div>
                <div class="section container-fluid">
                    <p class="section-text ">${home_section_names[j]}</p>
                    <div class="carousel">
                    <div class="carousel-wrapper ">`;
            }
            else if (albums_obj_list[i+1]==null){
                section_html +=`</div>
                    </div>
                </div>`
            }
        }
        document.getElementById("sections").innerHTML = section_html;
    }
}
async function fav_page(){
    fav= await window.api.favs();
    let layout_html=`
        <div class="album-layout fav_layout container-fluid p-0"  >
            <div class="album-layout-content container-fluid p-0">
                <div class="p-0 glossy layout-head">
                    <div class="album-info d-flex container-fluid">
                        <img class="album-cover-layout glossy" id="modal_album_src" src="img/stock cover.jpg" alt="album-cover">
                        <div class="album-details col">
                            <p class="album-name" id="modal_album">Favorites</p>
                            <p class="band-name" id="modal_song_nr">${fav.length} Songs</p>
                            <p></p>
                        </div>
                    </div>
                </div>
                <div class="p-0 glossy layout-list">
                    <div class="song-list" id="modal_song_list">
                        <div class="list-label d-flex">
                            <p class="col-1 band-name nr-track">#</p>
                            <p class="col band-name">Title</p>
                            <p class="col-2 band-name">Plays</p>
                            <p class="col-1 band-name">Length</p>
                        </div>`;
    for(let i=0; i<fav.length;i++) layout_html+=album_list_item(fav[i],fav[i].cover,(i+1),"1");
    layout_html+=`  </div>
                </div>
            </div>
        </div>`;
    document.getElementById("sections").innerHTML = layout_html;
}
function artists_page(){
    let section_html=``;
    for(let i=0; i< artist_search.length; i++){
        section_html +=`
                <div class="section container-fluid">
                    <p class="section-text ">${artist_search[i]}</p>
                    <div class="carousel">
                    <div class="carousel-wrapper ">`;
        const album =artist_map[artist_search[i]].albums;
        for(let j=0;j<album.length; j++) {
            section_html += song_card(album_map[album[j]].name, artist_search[i], album_map[album[j]].cover, album_map[album[j]].song[0]);
        }
        section_html +=`</div>
                    </div>
                </div>`;
        if (i==artist_search.length-1){
            section_html +=`</div>
                </div>
            </div>`;
            break;
        }
    }
    document.getElementById("sections").innerHTML = section_html;
}
function album_page(){
    let layout_html=`<div class="albm-gen_layout">`;
    for(let j=0; j<albums_obj_list.length;j++){
        let songs=albums_obj_list[j].song;
        layout_html+=`
        <div class="album-layout album_layout container-fluid p-0"  >
            <div class="album-layout-content container-fluid p-0">
                <div class="p-0 glossy layout-head">
                    <div class="album-info d-flex container-fluid">
                        <img class="album-cover-layout glossy" id="modal_album_src" src="${albums_obj_list[j].cover}" alt="album-cover">
                        <div class="album-details col">
                            <p class="album-name" id="modal_album">${albums_obj_list[j].name}</p>
                            <p class="band-name" id="modal_song_nr">${songs.length} Songs</p>
                            <p></p>
                        </div>
                    </div>
                </div>
                <div class="p-0 glossy layout-list">
                    <div class="song-list" id="modal_song_list">
                        <div class="list-label d-flex">
                            <p class="col-1 band-name nr-track">#</p>
                            <p class="col band-name">Title</p>
                            <p class="col-2 band-name">Plays</p>
                            <p class="col-1 band-name">Length</p>
                        </div>`;
        for(let i=0; i<songs.length;i++) layout_html+=album_list_item(songs[i],albums_obj_list[j].cover,(i+1),albums_obj_list[j].name);
        layout_html+=`</div>
                </div>
            </div>
        </div>`;
    }
    layout_html+=`</div>`;
    document.getElementById("sections").innerHTML = layout_html;
}
async function playlists_page(){
    playlist_obj_list= await window.api.playlists();
    document.getElementById("sections").removeAttribute("style");
    let section_html =``;
    if(playlist_obj_list.length<1){
        section_html =`<p class="section-text no-song-text">No playlists created. Please create a playlist.</p>`;
        
    }else{
        section_html =`
                <div class="section container-fluid">
                    <div class="carousel d-flex p-5">`;
        for(let i=0; i<playlist_obj_list.length; i++){  
            section_html += song_card(playlist_obj_list[i].name, "You", playlist_obj_list[i].cover, playlist_obj_list[i].songs[0],playlist_obj_list[i].name);
            if (albums_obj_list[i+1]==null){
                section_html +=`
                    </div>
                </div>`;
            }
        }
    }
    document.getElementById("sections").innerHTML = section_html;
}
function queue_button(){
    let layout_html=`<div class="list-label d-flex">
                            <div class="col-9 d-flex">
                            <p class="band-name nr-list ">#</p>
                            <p class="band-name">Title</p>
                            </div>
                            <p class="col-2 band-name">Plays</p>
                            <p class="col-1 band-name">Length</p>
                        </div>`;
    document.getElementById("modal_album").innerText="Queue";
    document.getElementById("modal_artist").innerText=null;
    document.getElementById("edit_btn_perm").innerText=null;
    document.getElementById("edit_btn").innerText=null;
    document.getElementById("modal_song_nr").innerText= queue.length-queue_index+" Songs";
    document.getElementById("modal_album_src").src="img/stock cover.jpg";
    document.getElementById("modal_album_src").classList="album-cover-layout glossy queue-cover";
    let i=1;
    for(let j=queue_index;j<queue.length;j++){
        layout_html+=album_list_item(queue[j],queue[j].cover,i, queue[j].album);
        cover="img/stock cover.jpg";
        i++;
    }
    layout_html+=`</div> 
    </div>`;
    document.getElementById("modal_song_list").innerHTML=layout_html;
}
// navbar button function that switches pages
function Navbar_button(elem2) {
    let elem1= document.getElementById("current-page");
    let eleme2= document.getElementById(elem2);
    let name = elem1.getAttribute("name");
    document.getElementById("current-page").id = name;
    elem1.style="opacity: 100%;";
    if (eleme2.id == "fav") fav_page();
    if (eleme2.id == "home") home_page();
    if (eleme2.id == "playlists") playlists_page();
    if (eleme2.id == "artists")artists_page();
    if (eleme2.id == "albums") album_page();
    eleme2.id= "current-page";
    eleme2.style="opacity: 40%;";
}
//playlist edit popup
function playlist_edit(action, type, id, cover, name){
    const pop_up= document.getElementById("playlist_pop_up");
    const img= document.getElementById("pop_up_img");
    const input = document.getElementById("pop_up_name");
    


}
// music player functionality
const player = document.getElementById('player');
player.onended = () => {
    finalizeHistoryLog(false);
    Next(); // Your existing Next function
};
// 4. The function that calculates the stats
function finalizeHistoryLog(wasSkipped) {
    if (!currentSongData || !songStartTime) return;
    const msPlayed = Date.now() - songStartTime;
    window.api.log_history({
        ...currentSongData,
        ms_played: msPlayed,
        skipped: wasSkipped
    });
    // Reset for next track
    currentSongData = null;
    songStartTime = null;
}
let songStartTime = null;
let currentSongData = null;
// 2. Set up data for the NEW song
player.onloadedmetadata = () => {
    songStartTime = Date.now();
    currentSongData = {
        name: queue[queue_index].name ,
        artist: queue[queue_index].artist || "Unknown Artist",
        album: queue[queue_index].album,
        path: queue[queue_index].path,
        duration: player.duration || 0 
    };
};
function playPause(){
    let play_icon=document.getElementById("play-icon").getAttribute("src");
    if(play_icon=="img/control_play.svg"){
        player.play();
        document.getElementById("play-icon").setAttribute("src","img/control_pause.svg");
    }
    else{
        player.pause();
        document.getElementById("play-icon").setAttribute("src","img/control_play.svg");
    }
}
function update_player(song){
    // 4. PREPARE THE NEW SONG DATA
    currentSongData = {
        name: queue[queue_index].name,
        artist: queue[queue_index].artist,
        album: queue[queue_index].album,
        path: queue[queue_index].path,
        duration: 0 // Will be updated by onloadedmetadata
    };
    player.src=song.path;
    player.play();
    const icon = document.getElementById("fav_icon");   
    if (song.is_fav == 0) icon.src="img/fav_icon.svg";
    if (song.is_fav == 1) icon.src="img/full_fav_icon.svg";
    let cover="img/stock cover.jpg";
    for(let i=0;i<albums_obj_list.length;i++){
        if(albums_obj_list[i].name== song.album){
            cover=albums_obj_list[i].cover;
            break;
        }
    }
    const cover_player = document.getElementById('album_art');
    const song_player = document.getElementById('song_name_player');
    const bande_name = document.getElementById('band_name_player');
    cover_player.src = cover;
    song_player.innerText=song.name;
    bande_name.innerText=song.artist;
    document.getElementById("play-icon").setAttribute("src","img/control_pause.svg");
    updateMediaSession(song.name, song.artist, cover);
    window.api.last_played({queue, index: queue_index, da:true});
}
function Next() {
    if (queue.length === 0) return;
    let shouldPlay = true;
    if (isShuffle) {
        if (shuffleStep < shuffledIndices.length - 1) {
            shuffleStep++;
            queue_index = shuffledIndices[shuffleStep];
        } else if (repeatMode == 1) {
            shuffleStep = 0; // Loop the shuffled deck
            queue_index = shuffledIndices[shuffleStep];
        } else {
            shouldPlay = false; // End of shuffled list
        }
    } else {
        if(repeatMode==0) {
            if(queue_index==queue.length-1){
                shouldPlay = false;
            }
            else {
                queue_index++;
                shouldPlay = true;
            }
        }
        else if(repeatMode==1) {
            if(queue_index==queue.length-1){
                queue_index=0;
            }else queue_index++;
            shouldPlay = true;
        }
        else if(repeatMode==2) shouldPlay = true;
    }
    if(shouldPlay == true){
        update_player(queue[queue_index]);
    }
}
function Previous() {
    if(player.currentTime<=2){
        if (queue.length === 0) return;
        // Loop back to start if at the end
        if (queue_index > 0) {
            queue_index--;
        }
        else if (repeatMode == 1) { 
            // If we are at the start but Repeat All is ON, go to the end
            queue_index = queue.length - 1;
        }
    }
    update_player(queue[queue_index]);
}
function Play(song_name, album){
    // 1. If a song was already playing, log it as a "skip" before starting the new one
    if (currentSongData) {
        finalizeHistoryLog(true); 
    }
    if (currentSongData && songStartTime && (Date.now() - songStartTime > 1000)) {
        finalizeHistoryLog(true); // skipped = true
    } else {
        // If they skipped instantly, just clear the data without logging
        currentSongData = null;
        songStartTime = null;
    }
    let album_queue=[];
    if(album==1) {
        album_queue=fav;
        for(let j=0; j<fav.length;j++){
            if(song_name==fav[j].name){
                queue_index=j;
                break;
            }
        }
    }
    else{
        if(playlist_map[album]!=null){
            album_queue=playlist_map[album].songs;
            for(let j=0; j<album_queue.length;j++){
                if(song_name==album_queue[j].name){
                    queue_index=j;
                    break;
                }
            }
        } 
        else{
            if(album_map[album]!=null){
                album_queue=album_map[album].song;
                for(let j=0; j<album_queue.length;j++){
                    if(song_name==album_queue[j].name){
                        queue_index=j;
                        break;
                    }
                }
            } 
        }
    }
    if((queue!=album_queue)&&(album_queue[0]!=null)) queue=album_queue;
    update_player(queue[queue_index]);
}
function Repeat(){
    repeatMode = (repeatMode + 1) % 3;
    let repeat_icon=document.getElementById("repeat-icon").getAttribute("src");
    if(repeat_icon=="img/control_repeat.svg"){
        document.getElementById("repeat-icon").setAttribute("src","img/control_repeat_all.svg");
        repeatMode = 1;
    }
    if(repeat_icon=="img/control_repeat_all.svg"){
        document.getElementById("repeat-icon").setAttribute("src","img/control_repeat_1.svg");
        repeatMode = 2;
    }
    if(repeat_icon=="img/control_repeat_1.svg"){
        document.getElementById("repeat-icon").setAttribute("src","img/control_repeat.svg");
        repeatMode = 0;
    }
    window.api.save_settings({ isShuffle, repeatMode });
}
function Shuffle() {
    isShuffle = !isShuffle;
    const icon = document.getElementById("shuffle-icon");
    if (isShuffle) {
        icon.setAttribute("src", "img/control_shuffle.svg");
        // 1. Create the deck
        shuffledIndices = Array.from(queue.keys());
        // 2. Shuffle it
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }
        // 3. Find the current song in the shuffled deck and move it to index 0
        // This prevents the "song jump" glitch
        const currentPosInShuffle = shuffledIndices.indexOf(queue_index);
        [shuffledIndices[0], shuffledIndices[currentPosInShuffle]] = [shuffledIndices[currentPosInShuffle], shuffledIndices[0]];
        shuffleStep = 0; 
    } else {
        icon.setAttribute("src", "img/control_shuffle_off.svg");
    }
    window.api.save_settings({ isShuffle, repeatMode });
}
async function add_to_fav(id) {
    let icon = document.getElementById("fav_icon");
    let icon2=document.getElementById(id);
    let song=[];
    if (id=="fav_icon"){
        song= queue[queue_index];
        icon2= document.getElementById(song.id);
        await window.api.set_fav(song.id);
        if (song.is_fav==0){
            song.is_fav=1;
            song_map[song.id].is_fav=1;
            icon.src="img/full_fav_icon.svg";
            try{ 
                icon2.src="img/full_fav_icon.svg";
            }
            catch(error){
                console.error(error.message);
            }
        }
        else{
            song.is_fav=0;
            song_map[song.id].is_fav=0;
            icon.src="img/fav_icon.svg";
            try {
                icon2.src="img/fav_icon.svg";
            }
            catch(error){
                console.error(error.message);
            }
        }
    }
    else{
        song= song_map[id];
        await window.api.set_fav(song.id);
        if (song.is_fav==0){
            song.is_fav=1;
            song_map[id].is_fav=1;
            icon.src="img/full_fav_icon.svg";
            try{ 
                icon2.src="img/full_fav_icon.svg";
            }
            catch(error){
                console.error(error.message);
            }
        }
        else{
            song.is_fav=0;
            song_map[id].is_fav=0;
            icon.src="img/fav_icon.svg";
            try {
                icon2.src="img/fav_icon.svg";
            }
            catch(error){
                console.error(error.message);
            }
            
        }
    } 
}
function edit_view(name){
    const view = document.getElementById("edit_view");
    const button= document.getElementById("edit_buttons");
    let id = "";
    let type="";
    if(playlist_map[name]==null){
        id = album_map[name].id;
        type="album";
    }
    else{
        id = playlist_map[name].id;
        type="playlist";
    }
    
    view.innerHTML=`
    <label for="edit_input" class="band-name ">New name</label>
    <input type="text" placeholder="Name" class="p-0" id="edit_input" edit_id="${id}">
    <button class="glossy justify-content-center cover-btn" id="new_img">
        <p class="m-2 band-name">Change cover</p>
    </button>
    `;
    button.innerHTML=`
    <button class="edit-icon-perm edit-icon save-btn glossy justify-content-center p-1" id="cancel_btn">
        <p class="m-2 exit_icon band-name">Cancel</p>
    </button>
    <button class="edit-icon-perm edit-icon save-btn glossy justify-content-center p-1" id="save_btn">
        <p class="m-2 exit_icon band-name">Save</p>
    </button>`;
    const save_btn= document.getElementById("save_btn");
    const img_upload_btn=document.getElementById("new_img");
    let new_img="";
    save_btn.addEventListener('click', async ()=>{
        const new_name = document.getElementById("edit_input").value||name;
        let artist="";
        console.log(new_name, id, new_img, type);
        if(type =="playlist"){
            if(new_img==null) new_img=playlist_map[name].cover;
            playlist_map[name].name=new_name;
            playlist_map[name].cover=new_img;
            artist = "You";
            const pl_obj= playlist_map[name];
            delete playlist_map[name];
            playlist_map[new_name]=pl_obj;
        }else{
            if(type =="album"){
                if(new_img==null) new_img=album_map[name].cover;
                album_map[name].name=new_name;
                album_map[name].cover=new_img;
                artist = album_map[name].artist;
                const al_obj= album_map[name];
                delete album_map[name];
                album_map[new_name]=al_obj;
            }
        }
        await window.api.save_details({name: new_name, id: id, cover: new_img, type: type});
        album_layout(new_name);
        document.getElementById(name).innerHTML=`
        <img class="cover" src="${new_img}" alt="${new_name} album cover" width="100%">
            <div class="song-details">
                <p class="song-name">${new_name}</p>
                <p class="band-name">${artist}</p>
            </div>`;
    });
    img_upload_btn.addEventListener("click", async ()=>{
        new_img = await window.api.cover_handle();
        if (new_img!=null) document.getElementById("modal_album_src").src=new_img;
    });
    
    document.getElementById("cancel_btn").addEventListener("click",()=>{album_layout(name)});
}

const bar = document.getElementById("progress-bar"); // Move outside for speed
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration-time");
player.addEventListener('timeupdate', () => {
    // 1. Fixed property name: must be 'currentTime'
    const { currentTime, duration } = player; 
    if (duration) {
        // 2. Update the slider value
        bar.value = (currentTime / duration) * 1000;
        // 3. Update the time text (assuming currentTimeEl and durationEl are defined)
        currentTimeEl.innerText = formatTime(currentTime);
        durationEl.innerText = formatTime(duration);
    }
});
bar.addEventListener('input', () => {
    // 1. Calculate the new time based on the slider's position
    const seekTime = (bar.value / 1000) * player.duration;
    // 2. Set the player's current time
    player.currentTime = seekTime;
});
const playIcon = document.getElementById('play-icon');
// This fires if the user clicks your button OR uses a keyboard shortcut
player.onpause = () => {
    playIcon.src = "img/control_play.svg";
};
// This fires if the user resumes via keyboard or code
player.onplay = () => {
    playIcon.src = "img/control_pause.svg";
};
window.addEventListener('keydown', (e) => {
    // Only trigger if the user isn't typing in a search bar
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault(); // Stop page from jumping down
        if (player.paused) player.play();
        else player.pause();
    }
});
async function updateMediaSession(song_name, artist, cover) {
    if ('mediaSession' in navigator) {
        const base64Image = await window.api.getBase64(cover);
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song_name,
            artist: artist,
            artwork: [{ src: base64Image || 'img/default-cover.png', sizes: '512x512', type: 'image/png' }]
        });
        // Map the physical media keys to your functions
        navigator.mediaSession.setActionHandler('play', () => player.play());
        navigator.mediaSession.setActionHandler('pause', () => player.pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => Next());
        navigator.mediaSession.setActionHandler('previoustrack', () => Previous());
    }
}
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}
// initializing the home page for the first "boot"
window.addEventListener('DOMContentLoaded',async () => {
    await home_page();
    if (isShuffle) {
        document.getElementById("shuffle-icon").setAttribute("src", "img/control_shuffle.svg");
        // 1. Create the deck
        shuffledIndices = Array.from(queue.keys());
        // 2. Shuffle it
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }
        // 3. Find the current song in the shuffled deck and move it to index 0
        // This prevents the "song jump" glitch
        const currentPosInShuffle = shuffledIndices.indexOf(queue_index);
        [shuffledIndices[0], shuffledIndices[currentPosInShuffle]] = [shuffledIndices[currentPosInShuffle], shuffledIndices[0]];
        shuffleStep = 0; 
        queue_index = shuffledIndices[shuffleStep];
    } else document.getElementById("shuffle-icon").setAttribute("src", "img/control_shuffle_off.svg");
    if(repeatMode==0) document.getElementById("repeat-icon").setAttribute("src","img/control_repeat.svg");
    if(repeatMode==1) document.getElementById("repeat-icon").setAttribute("src","img/control_repeat_all.svg");
    if(repeatMode==2) document.getElementById("repeat-icon").setAttribute("src","img/control_repeat_1.svg");
    player.src=queue[queue_index].path;
    const cover_player = document.getElementById('album_art');
    const song_player = document.getElementById('song_name_player');
    const bande_name = document.getElementById('band_name_player');
    let cover="img/stock cover.jpg";
    for(let i=0;i<albums_obj_list.length;i++){
        let ceva = albums_obj_list[i];
        if(queue[queue_index].album==ceva.name) cover=ceva.cover;
    }
    if (queue[queue_index].is_fav==1) document.getElementById('fav_icon').src="img/full_fav_icon.svg";
    cover_player.src=cover;
    song_player.innerText=queue[queue_index].name;
    bande_name.innerText=queue[queue_index].artist;
    let min= Math.trunc(queue[queue_index].duration / 60);
    let sec= Math.trunc(queue[queue_index].duration%60);
    if(sec<10) sec="0"+sec;
    document.getElementById("duration-time").innerText=min+":"+sec;
});    
window.addEventListener('contextmenu', (e) => {
    const target = e.target.closest('.da');
    if (target) {
        e.preventDefault();
        // 1. Grab the ID and the Title from the element
        const sId = target.getAttribute('data-id');
        // Make sure you have a data-title attribute on your song elements!
        const sTitle = target.getAttribute('data-title') || "New Playlist"; 
        // 2. Send both to the Native Menu
        window.api.showNativeMenu({ id: sId, title: sTitle });
    }
});



