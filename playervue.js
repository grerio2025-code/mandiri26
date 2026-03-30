(function () {
  // --- CONFIG ---
  const MAX_RETRY = 3;
  const RETRY_DELAY = 5000; // 5 detik
  let playlist = [];
  let currentIndex = 0;
  let retryCount = 0;
  let _video = null;
  let hls = null;

  // --- UI elements ---
  let fadeText = null;
  let menu = null;

  // --- Helper: show message ---
  function showFadeMessage(msg, isError) {
    if (!fadeText) {
      fadeText = new Text({
        x: 10, y: 30,
        text: "", font: "20px Arial",
        color: "#00FF00",
        visible: true,
        opacity: 0, zIndex: 1000
      });
      jsmaf.root.children.push(fadeText);
    }
    fadeText.color = isError ? "#FF6666" : "#00FF00";
    fadeText.text = msg;
    fadeText.visible = true;
    fadeText.opacity = 1;
  }

  // --- Create video element ---
  function createVideo() {
    if (_video) {
      try { _video.close(); } catch(e) {}
      const idx = jsmaf.root.children.indexOf(_video);
      if (idx !== -1) jsmaf.root.children.splice(idx, 1);
      _video = null;
    }

    _video = new Video({
      x:0, y:0,
      width: jsmaf.screenWidth || 1920,
      height: jsmaf.screenHeight || 1080,
      autoplay:true,
      visible:true,
      audio:true,
      preload:'auto',
      bufferTime:60
    });
    _video.muted = false;
    _video.volume = 1.0;

    _video.onstatechange = function(state) {
      if (state === 'Ended') nextChannel();
    };

    _video.onerror = function() {
      retryCount++;
      if (retryCount <= MAX_RETRY) {
        showFadeMessage(`Stream error, retry ${retryCount}/${MAX_RETRY} in 5s`, true);
        setTimeout(() => playChannel(currentIndex), RETRY_DELAY);
      } else {
        showFadeMessage(`Stream failed, skipping`, true);
        retryCount = 0;
        nextChannel();
      }
    };

    jsmaf.root.children.push(_video);
  }

  // --- Play channel ---
  function playChannel(index) {
    if (!playlist.length) return;
    currentIndex = index;
    retryCount = 0;
    const url = playlist[currentIndex].url;
    showFadeMessage(`Playing: ${playlist[currentIndex].title}`);

    try { _video.open(url); } catch(e) {}
  }

  // --- Navigation ---
  function nextChannel() {
    if (!playlist.length) return;
    currentIndex = (currentIndex + 1) % playlist.length;
    playChannel(currentIndex);
  }
  function prevChannel() {
    if (!playlist.length) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playChannel(currentIndex);
  }

  // --- Keyboard handling ---
  jsmaf.onKeyDown = function(keyCode) {
    switch(keyCode) {
      case 5: nextChannel(); break;       // Right
      case 7: prevChannel(); break;       // Left
      case 16: playChannel(currentIndex); break; // Manual retry
      case 15: showMenu(); break;         // Toggle menu
    }
  };

  // --- Menu (simple text menu) ---
  function showMenu() {
    if (!menu) {
      menu = new Text({
        x:50, y:50,
        text:'',
        font:"20px Arial",
        color:"#00FF00",
        visible:true,
        zIndex:1000
      });
      jsmaf.root.children.push(menu);
    }
    let text = "Playlist:\n";
    playlist.forEach((ch,i)=>{
      text += `${i===currentIndex?'>>':'  '} ${ch.title}\n`;
    });
    menu.text = text;
  }

  // --- Load playlist from user input (prompt) ---
  async function loadPlaylistFromUser() {
    const url = prompt("Enter M3U URL:");
    if (!url) return;
    try {
      const res = await fetch(url);
      const text = await res.text();
      playlist = [];
      let title = "Channel";
      text.split("\n").forEach(line=>{
        line = line.trim();
        if(line.startsWith("#EXTINF")) title = line.split(",")[1] || "Channel";
        else if(line && line.startsWith("http")) playlist.push({title, url:line});
      });
      if(!playlist.length) throw new Error("Playlist kosong");
      showFadeMessage(`Loaded ${playlist.length} channels`);
      playChannel(0);
    } catch(e) {
      showFadeMessage(`Error loading playlist`, true);
    }
  }

  // --- Init ---
  try {
    jsmaf.remotePlay = true;
    createVideo();
    loadPlaylistFromUser();
  } catch(e) {
    alert("Init error: "+e.message);
  }
})();
