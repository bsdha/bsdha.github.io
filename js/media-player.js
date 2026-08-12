(function () {
  // ======================================================================
  // PHẦN 1: ĐÀI RADIO 24/7 + ÂM THANH THIÊN NHIÊN (kênh, âm thanh nền, mixer)
  // ======================================================================
  const CHANNELS = [
    { id: 'tru-tinh', name: 'Trữ Tình', type: 'stream', url: 'https://cherryradio.com.au/stream/tru-tinh.mp3' },
    { id: 'voh-am610', name: 'VOH AM 610KHz', type: 'hls', url: 'https://1011337676.vnns.net/-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmkiOiIvaHR2Yy9WT0gtQU02MTAuYWRtLnRtcy8iLCJleHAiOjE5MjQ5MjUyMjh9.dAa1es3LlAVnvQ-oLGNBqfEI0yz7fPrjEML_rJAklMQ-/htvc/VOH-AM610.adm.tms/playlist.m3u8' },
    { id: 'voh-fm999', name: 'VOH FM 99.9 MHz', type: 'hls', url: 'https://1011337676.vnns.net/-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmkiOiIvaHR2Yy9WT0gtRk05OS45LmFkbS50bXMvIiwiZXhwIjoxOTI0OTI1MjI4fQ.zVLoKcCW3tFLySpEQHcYh11PHIxk2ZE1pj5P-GFIm1I-/htvc/VOH-FM99.9.adm.tms/playlist.m3u8' },
    { id: 'voh-fm925', name: 'VOH-M FM 92-92.5 MHz', type: 'hls', url: 'https://1011337676.vnns.net/-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmkiOiIvaHR2Yy9WT0gtRk05Mi41LmFkbS50bXMvIiwiZXhwIjoxOTI0OTI1MjI4fQ.u5XcdU9KljAz3HgehDbCBbNEvSzWNAQTEKkU-DwH2K8-/htvc/VOH-FM92.5.adm.tms/playlist.m3u8' },
    { id: 'voh-fm956', name: 'VOH FM 95.6MHz', type: 'hls', url: 'https://1011337676.vnns.net/-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmkiOiIvaHR2Yy9WT0gtRk05NS42LmFkbS50bXMvIiwiZXhwIjoxOTI0OTI1MjI4fQ.isr2nlUkXOPGSxT-KT8FcZQFCcXn58RZrCyqoB3zDGg-/htvc/VOH-FM95.6.adm.tms/playlist.m3u8' },
    { id: 'voh-fm877', name: 'VOH FM 87.7MHz', type: 'hls', url: 'https://1011337676.vnns.net/-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmkiOiIvaHR2Yy9WT0gtRk04Ny43LmFkbS50bXMvIiwiZXhwIjoxOTI0OTI1MjI4fQ.uqGbd46T32wvTu5qrL2cOng9Vsf7ZHbSTE10PHpP2bE-/htvc/VOH-FM87.7.adm.tms/playlist.m3u8' },
  ];
  const RELAX = [
    { id: 'td-song-bien-nhe-nhang', name: 'Sóng Biển nhẹ nhàng', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-song-bien-nhe-nhang-www_tiengdong_com.mp3' },
    { id: 'td-song-bien', name: 'Sóng Biển', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-song-bien-www_tiengdong_com.mp3' },
    { id: 'td-song-bien-vo-bo', name: 'Sóng Biển vỗ bờ', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/tieng-song-bien-vo-bo-www_tiengdong_com.mp3' },
    { id: 'td-song-hai-au', name: 'Sóng biển & Hải Âu', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-song-bien-va-tieng-hai-au-keu-www_tiengdong_com.mp3' },
    { id: 'td-mua-bai-bien', name: 'Mưa trên Bãi biển', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-mua-tren-bai-bien-www_tiengdong_com.mp3' },
    { id: 'td-song-ri-rao', name: 'Sóng Biển rì rào', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Am-thanh-tieng-song-bien-ri-rao-www_tiengdong_com.mp3' },
    { id: 'td-am-thanh-thien-nhien', name: 'Âm thanh Thiên Nhiên', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Am-thanh-thien-nhien-www_tiengdong_com.mp3' },
    { id: 'td-dong-que', name: 'Đồng Quê thanh bình', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-dong-que-thanh-binh-www_tiengdong_com.mp3' },
    { id: 'td-buoi-sang-trong-lanh', name: 'Buổi sáng Trong lành', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Am-thanh-buoi-sang-trong-lanh-www_tiengdong_com.mp3' },
    { id: 'td-chim-hot-suoi-chay', name: 'Chim hót & Suối chảy', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-chim-hot-va-tieng-suoi-chay-trong-rung-www_tiengdong_com.mp3' },
    { id: 'td-nhac-piano-nhe-nhang', name: 'Nhạc nền Piano nhẹ nhàng', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Nhac-nen-tinh-yeu-dep-cam-dong-nhe-nhang-piano-www_tiengdong_com.mp3' },
    { id: 'td-song-cuon', name: 'Sóng Cuộn', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-song-cuon-www_tiengdong_com.mp3' },
    { id: 'td-chim-hai-au-song-bien', name: 'Chim Hải Âu & Sóng Biển', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-chim-hai-au-keu-va-tieng-song-bien-www_tiengdong_com.mp3' },
    { id: 'td-gio-bien-song-mua-he', name: 'Gió biển và Sóng mùa hè', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Am-thanh-gio-bien-va-song-mua-he-www_tiengdong_com.mp3' },
    { id: 'td-song-bien-vo-vao-bo', name: 'Sóng biển Vỗ vào bờ', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-song-bien-vo-vao-bo-www_tiengdong_com.mp3' },
    { id: 'td-mua-dot-mai-gac-xep', name: 'Mưa dột mái Gác xép', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-nuoc-mua-dot-mai-ben-trong-can-gac-xep-www_tiengdong_com.mp3' },
    { id: 'td-troi-mua-nhe', name: 'Trời Mưa nhẹ', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-troi-mua-nhe-www_tiengdong_com.mp3' },
    { id: 'td-moi-truong-rung', name: 'Môi trường Tự nhiên trong Rừng', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Am-thanh-moi-truong-tu-nhien-trong-rung-www_tiengdong_com.mp3' },
    { id: 'td-dong-vat-rung-ram', name: 'Kêu của các loài Động Vật trong rừng rậm', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/Tieng-keu-cua-cac-loai-dong-vat-khac-nhau-trong-rung-ram-www_tiengdong_com.mp3' },
    { id: 'td-chim-hot-cong-vien', name: 'Chim hót trong Công viên thành phố', type: 'mp3', url: 'https://tiengdong.com/wp-content/uploads/tieng-chim-hot-trong-cong-vien-thanh-pho-www_tiengdong_com.mp3' },
  ];

  function showToast(msg) {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1500);
  }

  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function makeNoiseBuffer(ctx, kind) {
    const seconds = 4;
    const len = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    } else if (kind === 'pink') {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886*b0 + white*0.0555179;
        b1 = 0.99332*b1 + white*0.0750759;
        b2 = 0.96900*b2 + white*0.1538520;
        b3 = 0.86650*b3 + white*0.3104856;
        b4 = 0.55000*b4 + white*0.5329522;
        b5 = -0.7616*b5 - white*0.0168980;
        const out = b0+b1+b2+b3+b4+b5+b6+white*0.5362;
        b6 = white*0.115926;
        data[i] = out * 0.11;
      }
    } else {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // --- Lịch phát sự kiện ngẫu nhiên (crackle, sấm, tiếng dế/ếch...) ---
  function scheduleEvents(genEvent, minGapMs, maxGapMs) {
    let stopped = false;
    let timer = null;
    function tick() {
      if (stopped) return;
      try { genEvent(); } catch (e) {}
      const wait = minGapMs + Math.random() * (maxGapMs - minGapMs);
      timer = setTimeout(tick, wait);
    }
    timer = setTimeout(tick, minGapMs + Math.random() * (maxGapMs - minGapMs));
    return {
      stop() {
        stopped = true;
        if (timer) clearTimeout(timer);
      },
    };
  }

  // Tiếng nổ lách tách ngắn (lò sưởi)
  function playCrackle(ctx, dest, opts) {
    const o = opts || {};
    const freqMin = o.freqMin || 900, freqMax = o.freqMax || 3200;
    const durMin = o.durMin || 0.02, durMax = o.durMax || 0.07;
    const gainMin = o.gainMin || 0.08, gainMax = o.gainMax || 0.3;
    const dur = durMin + Math.random() * (durMax - durMin);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freqMin + Math.random() * (freqMax - freqMin);
    bp.Q.value = 4 + Math.random() * 4;
    const g = ctx.createGain();
    const peak = gainMin + Math.random() * (gainMax - gainMin);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(bp); bp.connect(g); g.connect(dest);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  // Tiếng sấm xa (giông bão)
  function playThunder(ctx, dest) {
    const dur = 2 + Math.random() * 3;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 150 + Math.random() * 100;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    const peak = 0.4 + Math.random() * 0.3;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.3 + Math.random() * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(lp); lp.connect(g); g.connect(dest);
    src.start(now);
    src.stop(now + dur + 0.1);
  }

  // Một tiếng "chip" ngắn (dùng cho dế/ếch)
  function playChirp(ctx, dest, opts) {
    const o = opts || {};
    const freq = o.freq || 4200;
    const dur = o.dur || 0.06;
    const gainVal = o.gain || 0.15;
    const glide = o.glide || 0;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    if (glide) osc.frequency.linearRampToValueAtTime(freq + glide, now + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g); g.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Một cụm tiếng dế kêu rộ (nhiều chip liên tiếp rất nhanh)
  function playCricketBurst(ctx, dest) {
    const n = 4 + Math.floor(Math.random() * 5);
    const baseFreq = 4000 + Math.random() * 600;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        playChirp(ctx, dest, { freq: baseFreq + (Math.random() * 100 - 50), dur: 0.035, gain: 0.12 });
      }, i * 33);
    }
  }

  // Một tiếng ếch kêu (peep), cao và có lướt nhẹ lên
  function playPeep(ctx, dest) {
    const freq = 2800 + Math.random() * 500;
    playChirp(ctx, dest, { freq, dur: 0.22, gain: 0.18, glide: freq * 0.15 });
  }

  function buildNoiseGraph(ctx, kind, gainNode) {
    // Các âm nhiễu liên tục cơ bản
    if (kind === 'white' || kind === 'pink' || kind === 'brown') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, kind);
      src.loop = true;
      src.connect(gainNode);
      src.start();
      return { stop() { try { src.stop(); } catch (e) {} } };
    }

    if (kind === 'rain') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, 'white');
      src.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 6000;
      src.connect(hp); hp.connect(lp); lp.connect(gainNode);
      src.start();
      return { stop() { try { src.stop(); } catch (e) {} } };
    }

    if (kind === 'waves') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, 'white');
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
      lfo.start();
      src.connect(lp); lp.connect(gainNode);
      src.start();
      return { stop() { try { src.stop(); } catch (e) {} try { lfo.stop(); } catch (e) {} } };
    }

    // Tiếng ồn nâu làm mượt: lọc thông thấp mạnh hơn cho êm tai khi nghe lâu
    if (kind === 'brown-smooth') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, 'brown');
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      src.connect(lp); lp.connect(gainNode);
      src.start();
      return { stop() { try { src.stop(); } catch (e) {} } };
    }

    // Tiếng ồn nâu sâu kèm lớp tinh chỉnh 432 Hz rất nhẹ
    if (kind === 'brown-432hz') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, 'brown');
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 550;
      src.connect(lp); lp.connect(gainNode);
      src.start();

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 432;
      const toneGain = ctx.createGain();
      toneGain.gain.value = 0.05;
      osc.connect(toneGain); toneGain.connect(gainNode);
      osc.start();

      return {
        stop() {
          try { src.stop(); } catch (e) {}
          try { osc.stop(); } catch (e) {}
        },
      };
    }

    // Lò sưởi: nền rì rầm trầm + tiếng nổ lách tách ngẫu nhiên
    if (kind === 'fireplace') {
      const rumbleSrc = ctx.createBufferSource();
      rumbleSrc.buffer = makeNoiseBuffer(ctx, 'brown');
      rumbleSrc.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 280;
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.35;
      rumbleSrc.connect(lp); lp.connect(rumbleGain); rumbleGain.connect(gainNode);
      rumbleSrc.start();

      const scheduler = scheduleEvents(() => {
        playCrackle(ctx, gainNode, { freqMin: 900, freqMax: 3200, durMin: 0.02, durMax: 0.07, gainMin: 0.08, gainMax: 0.3 });
      }, 90, 320);

      return {
        stop() {
          try { rumbleSrc.stop(); } catch (e) {}
          scheduler.stop();
        },
      };
    }

    // Giông bão: mưa liên tục + tiếng sấm xa thỉnh thoảng
    if (kind === 'thunderstorm') {
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = makeNoiseBuffer(ctx, 'white');
      rainSrc.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const lpRain = ctx.createBiquadFilter();
      lpRain.type = 'lowpass';
      lpRain.frequency.value = 6000;
      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.6;
      rainSrc.connect(hp); hp.connect(lpRain); lpRain.connect(rainGain); rainGain.connect(gainNode);
      rainSrc.start();

      const scheduler = scheduleEvents(() => {
        playThunder(ctx, gainNode);
      }, 7000, 18000);

      return {
        stop() {
          try { rainSrc.stop(); } catch (e) {}
          scheduler.stop();
        },
      };
    }

    // Đêm — tiếng dế: nền không khí đêm tĩnh + từng cụm dế kêu
    if (kind === 'night') {
      const bedSrc = ctx.createBufferSource();
      bedSrc.buffer = makeNoiseBuffer(ctx, 'brown');
      bedSrc.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.12;
      bedSrc.connect(lp); lp.connect(bedGain); bedGain.connect(gainNode);
      bedSrc.start();

      const scheduler = scheduleEvents(() => {
        playCricketBurst(ctx, gainNode);
      }, 500, 1600);

      return {
        stop() {
          try { bedSrc.stop(); } catch (e) {}
          scheduler.stop();
        },
      };
    }

    // Quán cà phê: tiếng nhiễu lọc dải trung, âm lượng lên xuống chậm như tiếng trò chuyện rì rầm
    if (kind === 'people') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, 'white');
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1100;
      bp.Q.value = 0.6;
      const murmurGain = ctx.createGain();
      murmurGain.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.2;
      lfo.connect(lfoGain); lfoGain.connect(murmurGain.gain);
      lfo.start();
      src.connect(bp); bp.connect(murmurGain); murmurGain.connect(gainNode);
      src.start();

      return {
        stop() {
          try { src.stop(); } catch (e) {}
          try { lfo.stop(); } catch (e) {}
        },
      };
    }

    // Tiếng ếch ban đêm: nền không khí đêm nhẹ + từng tiếng ếch kêu cao vút
    if (kind === 'spring-peeper') {
      const bedSrc = ctx.createBufferSource();
      bedSrc.buffer = makeNoiseBuffer(ctx, 'brown');
      bedSrc.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 350;
      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.1;
      bedSrc.connect(lp); lp.connect(bedGain); bedGain.connect(gainNode);
      bedSrc.start();

      const scheduler = scheduleEvents(() => {
        playPeep(ctx, gainNode);
      }, 650, 1300);

      return {
        stop() {
          try { bedSrc.stop(); } catch (e) {}
          scheduler.stop();
        },
      };
    }

    // Dự phòng: tiếng ồn trắng thường
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, 'white');
    src.loop = true;
    src.connect(gainNode);
    src.start();
    return { stop() { try { src.stop(); } catch (e) {} } };
  }

  function createHtmlRow(track, container, playRow, defaultVolume) {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.dataset.trackId = track.id;
    const dv = typeof defaultVolume === 'number' ? defaultVolume : 70;
    row.innerHTML =
      '<button class="track-btn" title="Phát/Dừng">▶</button>' +
      '<span class="track-name">' + track.name + '</span>' +
      '<input type="range" class="track-volume" min="0" max="100" value="' + dv + '">';
    container.appendChild(row);
    const btn = row.querySelector('.track-btn');
    const vol = row.querySelector('.track-volume');
    btn.addEventListener('click', () => playRow(track, btn, vol));
    vol.addEventListener('input', () => {
      const active = activeTracks[track.id];
      if (active && active.setVolume) active.setVolume(vol.value / 100);
    });
    return { row, btn, vol };
  }

  const radioTrackEls = document.getElementById('radioTracks');
  const relaxTrackEls = document.getElementById('relaxTracks');
  const mixerCheckbox = document.getElementById('mixerCheckbox');
  const mainPlayBtn = document.getElementById('radioPlayMain');

  const activeTracks = {}; // id -> {stop, btn, setVolume}
  const rowRefs = {}; // id -> {btn, vol}

  function updateMainButton() {
    const anyPlaying = Object.keys(activeTracks).length > 0;
    mainPlayBtn.textContent = anyPlaying ? '⏸' : '▶';
    mainPlayBtn.classList.toggle('playing', anyPlaying);
  }

  function setBtnPlaying(id, playing) {
    const ref = rowRefs[id];
    if (ref) {
      ref.btn.textContent = playing ? '⏹' : '▶';
      ref.btn.classList.toggle('playing', playing);
    }
    updateMainButton();
  }

  function stopTrack(id) {
    const t = activeTracks[id];
    if (!t) return;
    t.stop();
    delete activeTracks[id];
    setBtnPlaying(id, false);
  }

  function stopAllExcept(exceptId) {
    Object.keys(activeTracks).forEach((id) => { if (id !== exceptId) stopTrack(id); });
  }

  function stopAll() { stopAllExcept(null); }

  // Radio channel rows
  const channelAudioEls = {};
  function playChannel(ch, volValue) {
    if (!mixerCheckbox.checked) stopAllExcept(null);
    let entry = channelAudioEls[ch.id];
    if (!entry) {
      const audioEl = new Audio();
      audioEl.preload = 'none';
      let hls = null;
      if (ch.type === 'hls') {
        if (window.Hls && Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(ch.url);
          hls.attachMedia(audioEl);
        } else if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
          audioEl.src = ch.url;
        } else {
          showToast('Trình duyệt không hỗ trợ phát kênh này');
          return;
        }
      } else {
        audioEl.src = ch.url;
        audioEl.loop = true;
      }
      entry = { audioEl };
      channelAudioEls[ch.id] = entry;
    }
    entry.audioEl.volume = volValue;
    entry.audioEl.play().catch(() => {
      showToast('Không phát được kênh ' + ch.name);
      stopTrack(ch.id);
    });
    activeTracks[ch.id] = {
      stop: () => { entry.audioEl.pause(); },
      setVolume: (v) => { entry.audioEl.volume = v; },
    };
    setBtnPlaying(ch.id, true);
  }

  CHANNELS.forEach((ch) => {
    const refs = createHtmlRow(ch, radioTrackEls, (track, btn, volEl) => {
      if (activeTracks[ch.id]) { stopTrack(ch.id); return; }
      playChannel(ch, volEl.value / 100);
    });
    rowRefs[ch.id] = refs;
  });

  // Nhóm "Âm thanh thư giãn" — phát mp3 giống kênh radio
  RELAX.forEach((track) => {
    const refs = createHtmlRow(track, relaxTrackEls, (t, btn, volEl) => {
      if (activeTracks[t.id]) { stopTrack(t.id); return; }
      playChannel(t, volEl.value / 100);
    }, 70);
    rowRefs[track.id] = refs;
  });

  document.getElementById('radioStopAll').addEventListener('click', stopAll);

  // Nút Play chính -> phát/dừng kênh Trữ Tình mặc định
  mainPlayBtn.addEventListener('click', () => {
    const activeIds = Object.keys(activeTracks);
    if (activeIds.length > 0) {
      activeIds.forEach(stopTrack);
    } else {
      const ch = CHANNELS.find((c) => c.id === 'tru-tinh');
      const ref = rowRefs['tru-tinh'];
      playChannel(ch, ref ? ref.vol.value / 100 : 0.7);
    }
  });

  // Mixer checkbox: turning OFF while several tracks play -> keep only the first one playing
  mixerCheckbox.addEventListener('change', () => {
    if (!mixerCheckbox.checked) {
      const ids = Object.keys(activeTracks);
      if (ids.length > 1) {
        ids.slice(1).forEach(stopTrack);
      }
    }
  });

  // Expand/collapse mixer panel
  const expandBtn = document.getElementById('radioExpandBtn');
  const mixerPanel = document.getElementById('radioMixer');
  expandBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = mixerPanel.classList.toggle('show');
    expandBtn.textContent = isOpen ? '▲' : '▼';
    expandBtn.classList.toggle('open', isOpen);
  });
  document.addEventListener('click', (e) => {
    if (!mixerPanel.classList.contains('show')) return;
    const insidePanel = mixerPanel.contains(e.target);
    const insideWidget = document.getElementById('radioWidget').contains(e.target);
    if (!insidePanel && !insideWidget) {
      mixerPanel.classList.remove('show');
      expandBtn.textContent = '▼';
      expandBtn.classList.remove('open');
    }
  });

  // ===== Tìm & nghe nhạc YouTube (audio-only) =====
  // API key được nhúng cứng sẵn — ai mở file này cũng dùng được ngay, không cần nhập.
  // Nhiều API key được nhúng cứng sẵn — tự động xoay vòng khi 1 key hết quota trong ngày.
  const YT_API_KEYS = [
    'AIzaSyDsKyNxabV3opwnWaknID3XApEr3kpTRwU',
    'AIzaSyDh9nos35nE7_0nZ9-wlLSvGw-onTaFH2U',
    'AIzaSyBFJb4JCQH77VzjnV863YvSUn6Xnx4OJrM',
    'AIzaSyBeyLXr9aeINdFsJTX56dCXUtkAkWvD1Jk',
    'AIzaSyAbB2Gqpa4U6QX4gWSwuCAro16zDGQ-I2Q',
  ];
  const YT_KEY_INDEX_STORAGE = 'ytApiKeyIndex';
  let ytKeyIndex = parseInt(localStorage.getItem(YT_KEY_INDEX_STORAGE) || '0', 10);
  if (isNaN(ytKeyIndex) || ytKeyIndex < 0 || ytKeyIndex >= YT_API_KEYS.length) ytKeyIndex = 0;
  // ======================================================================
  // PHẦN 2: PHÁT AUDIO TỪ YOUTUBE (tìm kiếm, playlist, wake lock, seek bar)
  // ======================================================================
  const ytApiKeyStatus = document.getElementById('ytApiKeyStatus');
  const ytSearchInput = document.getElementById('ytSearchInput');
  const ytSearchBtn = document.getElementById('ytSearchBtn');
  const ytStatus = document.getElementById('ytStatus');
  const ytResults = document.getElementById('ytResults');
  const ytNowPlaying = document.getElementById('ytNowPlaying');
  const ytNowPlayingText = document.getElementById('ytNowPlayingText');
  const ytStopBtn = document.getElementById('ytStopBtn');
  const ytPlayerHost = document.getElementById('ytPlayerHost');
  const ytPlayPauseBtn = document.getElementById('ytPlayPauseBtn');
  const ytPrevBtn = document.getElementById('ytPrevBtn');
  const ytNextBtn = document.getElementById('ytNextBtn');
  const ytSeekBar = document.getElementById('ytSeekBar');
  const ytTimeLabel = document.getElementById('ytTimeLabel');
  const ytVolumeSlider = document.getElementById('ytVolumeSlider');
  const ytMuteBtn = document.getElementById('ytMuteBtn');
  const ytSearchClearBtn = document.getElementById('ytSearchClearBtn');

  if (ytApiKeyStatus) ytApiKeyStatus.textContent = '';

  let ytPlayer = null; // instance YouTube IFrame Player
  let ytApiReady = false;
  let pendingVideoToPlay = null;
  let ytUpdateTimer = null;
  let ytIsSeeking = false;
  let ytShowRemaining = false; // false = hiện thời gian đã chạy, true = hiện thời gian đếm lùi
  let ytShouldBePlaying = false; // ý định của người dùng: có nên đang phát hay không
  let ytUserPaused = false; // người dùng chủ động bấm Tạm dừng (khác với bị hệ điều hành tạm dừng khi chạy nền)
  let ytCurrentPlayingVid = null; // videoId đang phát, dùng để đánh dấu "Đang phát" trong danh sách
  let ytCurrentQuery = '';       // từ khóa đang tìm, dùng cho "Xem thêm"
  let ytNextPageToken = '';      // pageToken cho trang kết quả tiếp theo
  let ytIsMuted = false;
  let ytVolumeBeforeMute = 100;
  let ytWatchdogTimer = null;    // giữ nhạc chạy nền: kiểm tra định kỳ, tự phát lại nếu bị hệ điều hành tạm dừng
  let ytWakeLock = null;         // Wake Lock: hạn chế màn hình tự khóa khi đang nghe nhạc
  let ytPlaylist = [];           // danh sách bài hát hiện có trong kết quả tìm kiếm (theo đúng thứ tự hiển thị)
  let ytPlaylistIndex = -1;      // vị trí bài đang phát trong ytPlaylist, dùng cho nút Trước/Sau + tự phát bài kế

  function escapeYtHtml(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Hiện chữ chạy trượt (marquee) khi tên bài dài hơn khung hiển thị, lặp vô hạn
  let ytMarqueeTokenCounter = 0;
  function setMarqueeText(container, text) {
    if (!container) return;
    const token = ++ytMarqueeTokenCounter;
    container.dataset.marqueeToken = String(token);
    container.innerHTML = `<span class="marquee-track"><span class="marquee-copy">${escapeYtHtml(text)}</span></span>`;
    requestAnimationFrame(() => {
      // Nếu trong lúc chờ đo kích thước, ô này đã bị đổi nội dung khác (đổi bài, hết marquee...) thì bỏ qua
      if (container.dataset.marqueeToken !== String(token)) return;
      const track = container.querySelector('.marquee-track');
      const copy = container.querySelector('.marquee-copy');
      if (!track || !copy) return;
      if (copy.scrollWidth > container.clientWidth) {
        track.innerHTML =
          `<span class="marquee-copy">${escapeYtHtml(text)}</span>` +
          `<span class="marquee-copy">${escapeYtHtml(text)}</span>`;
        const dur = Math.max(6, copy.scrollWidth / 40); // ~40px/giây
        track.style.animationDuration = dur + 's';
        track.classList.add('animate');
      } else {
        track.classList.remove('animate');
      }
    });
  }

  function formatYtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateYtTimeUI() {
    if (!ytPlayer || !ytPlayer.getCurrentTime) return;
    const cur = ytPlayer.getCurrentTime() || 0;
    const dur = ytPlayer.getDuration() || 0;
    if (!ytIsSeeking) {
      ytSeekBar.max = dur || 0;
      ytSeekBar.value = cur;
    }
    ytTimeLabel.textContent = ytShowRemaining
      ? '-' + formatYtTime(dur - cur)
      : formatYtTime(cur);
  }

  function startYtTimeUpdates() {
    stopYtTimeUpdates();
    ytUpdateTimer = setInterval(updateYtTimeUI, 500);
  }
  function stopYtTimeUpdates() {
    if (ytUpdateTimer) { clearInterval(ytUpdateTimer); ytUpdateTimer = null; }
  }

  // ----- Giữ phát nhạc chạy nền (khi khóa màn hình / chuyển app khác) -----
  async function requestYtWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        ytWakeLock = await navigator.wakeLock.request('screen');
        ytWakeLock.addEventListener('release', () => { ytWakeLock = null; });
      }
    } catch (e) { /* một số trình duyệt/điều kiện không hỗ trợ, bỏ qua */ }
  }
  function releaseYtWakeLock() {
    if (ytWakeLock) { try { ytWakeLock.release(); } catch (e) {} ytWakeLock = null; }
  }

  // Theo dõi định kỳ: nếu nhạc đang bật ý định phát mà bị hệ điều hành/trình duyệt
  // tự tạm dừng khi chạy nền (khóa màn hình, chuyển app khác...) thì tự phát lại ngay.
  function startYtWatchdog() {
    stopYtWatchdog();
    ytWatchdogTimer = setInterval(() => {
      if (!ytShouldBePlaying || ytUserPaused || !ytPlayer || !ytPlayer.getPlayerState) return;
      const st = ytPlayer.getPlayerState();
      if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING) {
        try { ytPlayer.playVideo(); } catch (e) {}
      }
    }, 3000);
  }
  function stopYtWatchdog() {
    if (ytWatchdogTimer) { clearInterval(ytWatchdogTimer); ytWatchdogTimer = null; }
  }

  function setupYtMediaSession(title) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Đang phát nhạc',
        artist: 'YouTube',
        album: 'ICD 10 BY DHA',
      });
      navigator.mediaSession.setActionHandler('play', () => { if (ytPlayer) ytPlayer.playVideo(); });
      navigator.mediaSession.setActionHandler('pause', () => { if (ytPlayer) ytPlayer.pauseVideo(); });
      navigator.mediaSession.setActionHandler('stop', () => { ytStopBtn.click(); });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (ytPlayer && ytPlayer.seekTo && typeof details.seekTime === 'number') {
          ytPlayer.seekTo(details.seekTime, true);
        }
      });
    } catch (e) {}
  }

  function onYtPlayerStateChange(e) {
    const state = e.data;
    if (state === YT.PlayerState.PLAYING) {
      ytPlayPauseBtn.textContent = '⏸';
      ytShouldBePlaying = true;
      startYtTimeUpdates();
      updateYtTimeUI();
      startYtWatchdog();
      requestYtWakeLock();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else if (state === YT.PlayerState.PAUSED) {
      ytPlayPauseBtn.textContent = '▶';
      stopYtTimeUpdates();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    } else if (state === YT.PlayerState.ENDED) {
      ytPlayPauseBtn.textContent = '▶';
      ytShouldBePlaying = false;
      stopYtTimeUpdates();
      ytSeekBar.value = 0;
      // Tự động phát bài tiếp theo trong danh sách kết quả (nếu có)
      if (ytPlaylistIndex >= 0 && ytPlaylistIndex + 1 < ytPlaylist.length) {
        const next = ytPlaylist[ytPlaylistIndex + 1];
        playYoutubeAudioOnly(next.vid, next.title);
      } else {
        stopYtWatchdog();
        releaseYtWakeLock();
      }
    }
  }

  function playYtByIndex(index) {
    if (index < 0 || index >= ytPlaylist.length) return;
    const t = ytPlaylist[index];
    playYoutubeAudioOnly(t.vid, t.title);
  }

  if (ytPrevBtn) {
    ytPrevBtn.addEventListener('click', () => {
      if (ytPlaylistIndex > 0) playYtByIndex(ytPlaylistIndex - 1);
    });
  }
  if (ytNextBtn) {
    ytNextBtn.addEventListener('click', () => {
      if (ytPlaylistIndex >= 0 && ytPlaylistIndex + 1 < ytPlaylist.length) playYtByIndex(ytPlaylistIndex + 1);
    });
  }

  // Khi quay lại tab/app sau khi chạy nền, nếu người dùng chưa chủ động tạm dừng
  // mà YouTube bị hệ điều hành/tab tạm dừng thì tự phát lại để tránh gián đoạn.
  // Wake Lock tự động bị hủy khi ẩn trang nên cần xin cấp lại khi quay lại.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (ytShouldBePlaying && !ytUserPaused) requestYtWakeLock();
    if (!ytShouldBePlaying || ytUserPaused || !ytPlayer || !ytPlayer.getPlayerState) return;
    const st = ytPlayer.getPlayerState();
    if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING) {
      ytPlayer.playVideo();
    }
  });

  ytPlayPauseBtn.addEventListener('click', () => {
    if (!ytPlayer || !ytPlayer.getPlayerState) return;
    const st = ytPlayer.getPlayerState();
    if (st === YT.PlayerState.PLAYING) {
      ytUserPaused = true;
      ytPlayer.pauseVideo();
      releaseYtWakeLock();
    } else {
      ytUserPaused = false;
      ytPlayer.playVideo();
      requestYtWakeLock();
    }
  });

  ytSeekBar.addEventListener('input', () => { ytIsSeeking = true; });
  ytSeekBar.addEventListener('change', () => {
    if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(parseFloat(ytSeekBar.value), true);
    ytIsSeeking = false;
  });

  ytTimeLabel.addEventListener('click', () => {
    ytShowRemaining = !ytShowRemaining;
    updateYtTimeUI();
  });

  if (ytVolumeSlider) {
    ytVolumeSlider.addEventListener('input', () => {
      const vol = parseInt(ytVolumeSlider.value, 10);
      if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(vol);
      // Người dùng tự kéo âm lượng nghĩa là muốn nghe -> tự bỏ trạng thái Mute
      if (ytIsMuted && vol > 0) {
        ytIsMuted = false;
        if (ytPlayer && ytPlayer.unMute) ytPlayer.unMute();
        if (ytMuteBtn) { ytMuteBtn.textContent = '🔊'; ytMuteBtn.classList.remove('muted'); }
      }
    });
  }

  // Bấm icon loa: Tắt tiếng / Bật lại âm lượng trước đó
  if (ytMuteBtn) {
    ytMuteBtn.addEventListener('click', () => {
      ytIsMuted = !ytIsMuted;
      if (ytIsMuted) {
        ytVolumeBeforeMute = parseInt(ytVolumeSlider.value, 10) || 100;
        if (ytPlayer && ytPlayer.mute) ytPlayer.mute();
        ytMuteBtn.textContent = '🔇';
        ytMuteBtn.classList.add('muted');
      } else {
        if (ytPlayer && ytPlayer.unMute) ytPlayer.unMute();
        const restoreVol = ytVolumeBeforeMute || 100;
        if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(restoreVol);
        ytVolumeSlider.value = restoreVol;
        ytMuteBtn.textContent = '🔊';
        ytMuteBtn.classList.remove('muted');
      }
    });
  }

  // Nút "x" xóa từ khóa tìm kiếm YouTube
  if (ytSearchClearBtn) {
    ytSearchClearBtn.addEventListener('click', () => {
      ytSearchInput.value = '';
      ytSearchClearBtn.style.display = 'none';
      ytResults.innerHTML = '';
      ytStatus.textContent = '';
      ytCurrentQuery = '';
      ytNextPageToken = '';
      ytSearchInput.focus();
    });
    ytSearchInput.addEventListener('input', () => {
      ytSearchClearBtn.style.display = ytSearchInput.value ? 'block' : 'none';
    });
  }

  // Nạp YouTube IFrame API (chỉ 1 lần, khi cần dùng)
  function ensureYtIframeApi(cb) {
    if (window.YT && window.YT.Player) { ytApiReady = true; cb(); return; }
    if (!document.getElementById('ytIframeApiScript')) {
      const tag = document.createElement('script');
      tag.id = 'ytIframeApiScript';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = function () {
      ytApiReady = true;
      cb();
    };
    // Nếu script đã có sẵn nhưng chưa fire callback, chờ vòng lặp ngắn
    const waitInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(waitInterval);
        if (!ytApiReady) { ytApiReady = true; cb(); }
      }
    }, 300);
  }

  function playYoutubeAudioOnly(videoId, title) {
    // Dừng các kênh radio/relax khác để tránh chồng âm thanh
    stopAll();
    ytUserPaused = false;
    ytShowRemaining = false;
    ytCurrentPlayingVid = videoId;
    const idx = ytPlaylist.findIndex((t) => t.vid === videoId);
    ytPlaylistIndex = idx;
    refreshYtPlayingHighlight();
    setupYtMediaSession(title);
    ensureYtIframeApi(() => {
      if (ytPlayer) {
        ytPlayer.loadVideoById(videoId);
        if (ytPlayer.setVolume && ytVolumeSlider) ytPlayer.setVolume(parseInt(ytVolumeSlider.value, 10));
        if (ytIsMuted && ytPlayer.mute) ytPlayer.mute();
      } else {
        const playerVars = {
          autoplay: 1,
          controls: 0,
          // playsinline: bắt buộc trên iOS để video phát ẩn/âm thanh không tự bật
          // toàn màn hình — đây là nguyên nhân khiến app/PWA bị "văng" ra ngoài
          // (thoát về trang chủ) khi phát nhạc trên điện thoại.
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 0,
          disablekb: 1,
        };
        if (location.protocol === 'http:' || location.protocol === 'https:') {
          playerVars.origin = location.origin;
        }
        ytPlayer = new YT.Player(ytPlayerHost.id || (ytPlayerHost.id = 'ytPlayerHost'), {
          height: '1',
          width: '1',
          videoId: videoId,
          playerVars: playerVars,
          events: {
            onReady: (e) => {
              e.target.playVideo();
              if (ytVolumeSlider) e.target.setVolume(parseInt(ytVolumeSlider.value, 10));
              if (ytIsMuted && e.target.mute) e.target.mute();
            },
            onStateChange: onYtPlayerStateChange,
          },
        });
      }
      ytNowPlaying.style.display = 'flex';
      setMarqueeText(ytNowPlayingText, '▶ ' + title);
    });
  }

  ytStopBtn.addEventListener('click', () => {
    if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    ytNowPlaying.style.display = 'none';
    ytShouldBePlaying = false;
    ytUserPaused = false;
    stopYtTimeUpdates();
    stopYtWatchdog();
    releaseYtWakeLock();
    ytSeekBar.value = 0;
    ytTimeLabel.textContent = '0:00';
    ytPlayPauseBtn.textContent = '▶';
    ytCurrentPlayingVid = null;
    refreshYtPlayingHighlight();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  });

  function ytRowHtml(it) {
    const vid = it.id.videoId;
    const title = it.snippet.title;
    const channel = it.snippet.channelTitle;
    const thumb = it.snippet.thumbnails && it.snippet.thumbnails.default ? it.snippet.thumbnails.default.url : '';
    const isPlaying = vid === ytCurrentPlayingVid;
    return `
      <div class="yt-result-row${isPlaying ? ' yt-playing' : ''}" data-vid="${vid}" data-title="${title.replace(/"/g, '&quot;')}"
        style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:5px; border-radius:6px; background:var(--surface-2);">
        <img src="${thumb}" alt="" style="width:44px; height:33px; border-radius:4px; object-fit:cover; flex-shrink:0;">
        <div style="overflow:hidden; flex:1; min-width:0;">
          <div class="yt-row-title" style="font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeYtHtml(title)}</div>
          <div style="font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeYtHtml(channel)}</div>
          <div class="yt-playing-badge">▶ Đang phát</div>
        </div>
      </div>`;
  }

  // Bật/tắt chữ chạy trượt cho tiêu đề bài trong danh sách tùy theo có đang phát hay không
  function applyRowTitleDisplay(row, isPlaying) {
    const titleEl = row.querySelector('.yt-row-title, .yt-row-title-marquee');
    if (!titleEl) return;
    const title = row.dataset.title || '';
    if (isPlaying) {
      // Vô hiệu marquee cũ (nếu có) đang chờ đo kích thước, rồi thiết lập lại từ đầu
      delete titleEl.dataset.marqueeToken;
      titleEl.className = 'yt-row-title-marquee marquee-container';
      titleEl.removeAttribute('style');
      titleEl.style.cssText = 'font-size:12px; font-weight:600; color:var(--text);';
      setMarqueeText(titleEl, title);
    } else {
      // Vô hiệu token marquee đang chờ để callback cũ (nếu có) không ghi đè lại nội dung này
      delete titleEl.dataset.marqueeToken;
      titleEl.className = 'yt-row-title';
      titleEl.removeAttribute('style');
      titleEl.style.cssText = 'font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
      titleEl.textContent = title;
    }
  }

  function attachYtRowHandlers(container) {
    container.querySelectorAll('[data-vid]').forEach((row) => {
      row.addEventListener('click', () => {
        playYoutubeAudioOnly(row.dataset.vid, row.dataset.title);
      });
      applyRowTitleDisplay(row, row.classList.contains('yt-playing'));
    });
  }

  function renderYtLoadMoreButton() {
    const old = document.getElementById('ytLoadMoreBtn');
    if (old) old.remove();
    if (!ytNextPageToken) return;
    const btn = document.createElement('button');
    btn.id = 'ytLoadMoreBtn';
    btn.textContent = 'Xem thêm';
    btn.addEventListener('click', doYtLoadMore);
    ytResults.appendChild(btn);
  }

  function renderYtResults(items, append) {
    const html = items.map(ytRowHtml).join('');
    if (append) {
      const oldBtn = document.getElementById('ytLoadMoreBtn');
      if (oldBtn) oldBtn.remove();
      ytResults.insertAdjacentHTML('beforeend', html);
      ytPlaylist = ytPlaylist.concat(items.map((it) => ({ vid: it.id.videoId, title: it.snippet.title })));
    } else {
      ytResults.innerHTML = html;
      ytPlaylist = items.map((it) => ({ vid: it.id.videoId, title: it.snippet.title }));
    }
    attachYtRowHandlers(ytResults);
    renderYtLoadMoreButton();
  }

  // Cập nhật lại dấu "Đang phát" trên các mục đã hiển thị mà không cần tải lại danh sách
  function refreshYtPlayingHighlight() {
    ytResults.querySelectorAll('.yt-result-row').forEach((row) => {
      const isPlaying = row.dataset.vid === ytCurrentPlayingVid;
      row.classList.toggle('yt-playing', isPlaying);
      applyRowTitleDisplay(row, isPlaying);
    });
  }

  async function ytFetchWithKeyRotation(buildUrl) {
    let lastErrorMsg = '';
    for (let attempt = 0; attempt < YT_API_KEYS.length; attempt++) {
      const key = YT_API_KEYS[ytKeyIndex];
      const url = buildUrl(key);
      try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.error) {
          const reason = (data.error.errors && data.error.errors[0] && data.error.errors[0].reason) || '';
          const isQuotaIssue = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded';
          if (isQuotaIssue && attempt < YT_API_KEYS.length - 1) {
            // Key này hết quota -> chuyển sang key kế tiếp và thử lại
            ytKeyIndex = (ytKeyIndex + 1) % YT_API_KEYS.length;
            localStorage.setItem(YT_KEY_INDEX_STORAGE, String(ytKeyIndex));
            lastErrorMsg = data.error.message;
            continue;
          }
          lastErrorMsg = data.error.message || 'Lỗi không xác định.';
          return { error: lastErrorMsg };
        }
        return { data };
      } catch (err) {
        lastErrorMsg = 'Lỗi kết nối mạng.';
      }
    }
    return { error: lastErrorMsg || 'Tất cả API key đều không dùng được.' };
  }

  async function doYtSearch() {
    const q = ytSearchInput.value.trim();
    if (!q) { ytStatus.textContent = 'Nhập từ khóa tìm kiếm.'; return; }
    ytStatus.textContent = 'Đang tìm...';
    ytResults.innerHTML = '';
    ytCurrentQuery = q;
    ytNextPageToken = '';
    const result = await ytFetchWithKeyRotation((key) =>
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`
    );
    if (result.error) {
      ytStatus.textContent = 'Lỗi: ' + result.error;
      return;
    }
    const items = result.data.items || [];
    if (items.length === 0) {
      ytStatus.textContent = 'Không tìm thấy kết quả.';
      return;
    }
    ytNextPageToken = result.data.nextPageToken || '';
    ytStatus.textContent = `Tìm thấy ${items.length} kết quả.`;
    renderYtResults(items, false);
  }

  async function doYtLoadMore() {
    if (!ytCurrentQuery || !ytNextPageToken) return;
    const btn = document.getElementById('ytLoadMoreBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang tải...'; }
    const result = await ytFetchWithKeyRotation((key) =>
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&pageToken=${encodeURIComponent(ytNextPageToken)}&q=${encodeURIComponent(ytCurrentQuery)}&key=${encodeURIComponent(key)}`
    );
    if (result.error) {
      ytStatus.textContent = 'Lỗi: ' + result.error;
      if (btn) { btn.disabled = false; btn.textContent = 'Xem thêm'; }
      return;
    }
    const items = result.data.items || [];
    ytNextPageToken = result.data.nextPageToken || '';
    renderYtResults(items, true);
  }

  ytSearchBtn.addEventListener('click', doYtSearch);
  ytSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doYtSearch();
  });
})();
