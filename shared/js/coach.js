/* The coach: an illustrated teacher who talks you through every step.
   Moods: happy, think, cheer, oops, wow.
   Each tutorial picks its own coach in js/config.js:  coach: { id: 'noor', name: 'Noor', role: 'your Azure coach' }
   With no coach setting the original Coach Sam is used, so older tutorials look exactly as before.
   Every drawing keeps the same class names (head, eyes, mood-*, mouth-open, mouth-closed, q, spark) because shared/css/app.css animates them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});

  var SAM_SVG = [
    '<svg viewBox="0 0 240 250" class="coach-svg" role="img" aria-label="Coach Sam, your guide" data-mood="happy">',
    '<defs>',
    '<linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DBEAFE"/><stop offset="1" stop-color="#C7D2FE"/></linearGradient>',
    '<clipPath id="cclip"><circle cx="120" cy="125" r="116"/></clipPath>',
    '</defs>',
    '<circle cx="120" cy="125" r="116" fill="url(#cbg)"/>',
    '<g clip-path="url(#cclip)">',
    /* a little board behind the coach */
    '<rect x="14" y="26" width="64" height="44" rx="6" fill="#14532D" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M24 40 H52 M24 50 H62 M24 60 H44" stroke="#F8FAFC" stroke-width="3" stroke-linecap="round"/>',
    /* body */
    '<path d="M4 252 C10 206 56 186 120 186 C184 186 230 206 236 252 Z" fill="#1E3A8A" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M95 188 L120 230 L145 188 Z" fill="#FFFFFF" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M95 188 L80 196 L106 236 L120 230 Z" fill="#2549B8" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M145 188 L160 196 L134 236 L120 230 Z" fill="#2549B8" stroke="#0B1220" stroke-width="3"/>',
    '<circle cx="84" cy="224" r="6" fill="#F59E0B" stroke="#0B1220" stroke-width="2.5"/>',
    '</g>',
    '<g class="head">',
    '<path d="M103 156 L103 192 Q120 204 137 192 L137 156 Z" fill="#DDA37A" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="71" cy="118" r="10" fill="#EDB48A" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="169" cy="118" r="10" fill="#EDB48A" stroke="#0B1220" stroke-width="3.5"/>',
    '<ellipse cx="120" cy="112" rx="50" ry="58" fill="#F3C29B" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M68 110 C58 62 92 36 124 36 C160 36 184 62 172 110 C166 88 152 76 130 72 C106 78 86 84 68 110 Z" fill="#2B1B12" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/>',
    '<circle cx="86" cy="144" r="8" fill="#F87171" opacity=".35"/><circle cx="154" cy="144" r="8" fill="#F87171" opacity=".35"/>',
    '<g class="eyes">',
    '<ellipse cx="98" cy="116" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="100" cy="117" r="4.6" fill="#0B1220"/>',
    '<ellipse cx="142" cy="116" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="144" cy="117" r="4.6" fill="#0B1220"/>',
    '</g>',
    '<rect x="79" y="100" width="38" height="32" rx="12" fill="#fff" fill-opacity=".16" stroke="#0B1220" stroke-width="4.5"/>',
    '<rect x="123" y="100" width="38" height="32" rx="12" fill="#fff" fill-opacity=".16" stroke="#0B1220" stroke-width="4.5"/>',
    '<path d="M117 112 Q120 108 123 112 M79 110 L70 110 M161 110 L170 110" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '<path d="M120 122 Q127 135 118 139" fill="none" stroke="#B9794E" stroke-width="3.2" stroke-linecap="round"/>',
    /* moods */
    '<g class="mood mood-happy">',
    '<path d="M84 94 Q98 86 112 92 M128 92 Q142 86 156 94" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path class="mouth-closed" d="M100 148 Q120 166 140 148" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '<g class="mouth-open"><path d="M98 146 Q120 178 142 146 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/><path d="M108 161 Q120 169 132 161 Q120 156 108 161 Z" fill="#F87171"/></g>',
    '</g>',
    '<g class="mood mood-think">',
    '<path d="M84 88 Q98 78 112 86 M128 96 Q142 94 156 90" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M104 152 Q120 150 138 146" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-cheer">',
    '<path d="M84 88 Q98 78 112 86 M128 86 Q142 78 156 88" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M96 146 Q120 184 144 146 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/><path d="M106 162 Q120 172 134 162 Q120 156 106 162 Z" fill="#F87171"/>',
    '</g>',
    '<g class="mood mood-oops">',
    '<path d="M84 98 Q98 94 112 84 M128 84 Q142 94 156 98" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M104 156 Q120 144 136 156" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-wow">',
    '<path d="M84 84 Q98 76 112 84 M128 84 Q142 76 156 84" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<ellipse cx="120" cy="154" rx="9" ry="12" fill="#7F1D1D" stroke="#0B1220" stroke-width="4"/>',
    '</g>',
    '</g>',
    '<g class="extras">',
    '<text class="q" x="184" y="62" font-size="46" font-weight="800" fill="#0B1220" stroke="#fff" stroke-width="5" paint-order="stroke">?</text>',
    '<g class="spark"><path d="M200 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#F59E0B" stroke="#0B1220" stroke-width="2.5"/><path d="M36 100 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#EC4899" stroke="#0B1220" stroke-width="2.5"/><path d="M206 150 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#22C55E" stroke="#0B1220" stroke-width="2.5"/></g>',
    '</g>',
    '<circle cx="120" cy="125" r="116" fill="none" stroke="#0B1220" stroke-width="6"/>',
    '</svg>'
  ].join('');

  /* Noor: short curly hair, a headset and a chart badge. Drawn on the same 240 x 250 canvas as Sam,
     with the face in the same place, so the moods line up. */
  var NOOR_SVG = [
    '<svg viewBox="0 0 240 250" class="coach-svg" role="img" aria-label="Coach Noor, your guide" data-mood="happy">',
    '<defs>',
    '<linearGradient id="nbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#CCFBF1"/><stop offset="1" stop-color="#BAE6FD"/></linearGradient>',
    '<clipPath id="nclip"><circle cx="120" cy="125" r="116"/></clipPath>',
    '</defs>',
    '<circle cx="120" cy="125" r="116" fill="url(#nbg)"/>',
    '<g clip-path="url(#nclip)">',
    /* body: a teal jacket over a white shirt */
    '<path d="M4 252 C10 206 56 186 120 186 C184 186 230 206 236 252 Z" fill="#0E7490" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M95 188 L120 230 L145 188 Z" fill="#FFFFFF" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M95 188 L80 196 L106 236 L120 230 Z" fill="#0B5F78" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M145 188 L160 196 L134 236 L120 230 Z" fill="#0B5F78" stroke="#0B1220" stroke-width="3"/>',
    /* a small chart badge on the jacket: three orange bars, the same orange as the data blocks in the diagrams */
    '<rect x="62" y="204" width="24" height="22" rx="5" fill="#FFFFFF" stroke="#0B1220" stroke-width="2.5"/>',
    '<rect x="67" y="215" width="4.2" height="7" rx="1" fill="#F97316"/><rect x="73" y="211" width="4.2" height="11" rx="1" fill="#F97316"/><rect x="79" y="208" width="4.2" height="14" rx="1" fill="#F97316"/>',
    '</g>',
    '<g class="head">',
    '<path d="M103 156 L103 192 Q120 204 137 192 L137 156 Z" fill="#B97B4E" stroke="#0B1220" stroke-width="3.5"/>',
    /* curly hair behind the face */
    '<g fill="#1C1917" stroke="#0B1220" stroke-width="4">',
    '<circle cx="62" cy="106" r="15"/><circle cx="178" cy="106" r="15"/><circle cx="70" cy="76" r="21"/><circle cx="170" cy="76" r="21"/>',
    '<circle cx="92" cy="54" r="23"/><circle cx="148" cy="54" r="23"/><circle cx="120" cy="46" r="24"/>',
    '</g>',
    '<circle cx="72" cy="120" r="9" fill="#D9A06F" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="168" cy="120" r="9" fill="#D9A06F" stroke="#0B1220" stroke-width="3.5"/>',
    '<ellipse cx="120" cy="114" rx="49" ry="57" fill="#D9A06F" stroke="#0B1220" stroke-width="4"/>',
    /* hair over the forehead, with curls along the edge */
    '<path d="M76 90 C74 74 94 65 120 65 C146 65 166 74 164 90 C156 80 144 76 134 78 C128 72 112 72 106 78 C96 76 84 80 76 90 Z" fill="#1C1917" stroke="#0B1220" stroke-width="3.5" stroke-linejoin="round"/>',
    '<circle cx="86" cy="146" r="8" fill="#E8735A" opacity=".3"/><circle cx="154" cy="146" r="8" fill="#E8735A" opacity=".3"/>',
    '<g class="eyes">',
    '<ellipse cx="98" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="100" cy="119" r="4.8" fill="#0B1220"/>',
    '<ellipse cx="142" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="144" cy="119" r="4.8" fill="#0B1220"/>',
    '</g>',
    '<path d="M120 124 Q126 136 118 140" fill="none" stroke="#9A6038" stroke-width="3.2" stroke-linecap="round"/>',
    /* headset: band over the hair, two ear cups, a short microphone */
    '<path d="M64 112 C60 40 180 40 176 112" fill="none" stroke="#0B1220" stroke-width="13" stroke-linecap="round"/>',
    '<path d="M64 112 C60 40 180 40 176 112" fill="none" stroke="#F97316" stroke-width="6.5" stroke-linecap="round"/>',
    '<rect x="55" y="104" width="19" height="34" rx="8" fill="#F97316" stroke="#0B1220" stroke-width="3.5"/>',
    '<rect x="166" y="104" width="19" height="34" rx="8" fill="#F97316" stroke="#0B1220" stroke-width="3.5"/>',
    '<path d="M62 136 C62 154 72 162 86 160" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '<ellipse cx="88" cy="160" rx="6.5" ry="5" fill="#0B1220"/>',
    /* moods */
    '<g class="mood mood-happy">',
    '<path d="M85 100 Q98 93 112 98 M128 98 Q142 93 155 100" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path class="mouth-closed" d="M102 150 Q120 168 138 150" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '<g class="mouth-open"><path d="M100 148 Q120 180 140 148 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/><path d="M109 162 Q120 170 131 162 Q120 157 109 162 Z" fill="#F87171"/></g>',
    '</g>',
    '<g class="mood mood-think">',
    '<path d="M85 94 Q98 85 112 93 M128 102 Q142 100 155 96" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M106 154 Q120 152 138 148" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-cheer">',
    '<path d="M85 94 Q98 85 112 93 M128 93 Q142 85 155 94" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M98 148 Q120 186 142 148 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/><path d="M108 164 Q120 174 132 164 Q120 158 108 164 Z" fill="#F87171"/>',
    '</g>',
    '<g class="mood mood-oops">',
    '<path d="M85 104 Q98 100 112 91 M128 91 Q142 100 155 104" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M106 158 Q120 146 134 158" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-wow">',
    '<path d="M85 91 Q98 83 112 91 M128 91 Q142 83 155 91" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<ellipse cx="120" cy="156" rx="9" ry="12" fill="#7F1D1D" stroke="#0B1220" stroke-width="4"/>',
    '</g>',
    '</g>',
    '<g class="extras">',
    '<text class="q" x="184" y="62" font-size="46" font-weight="800" fill="#0B1220" stroke="#fff" stroke-width="5" paint-order="stroke">?</text>',
    '<g class="spark"><path d="M200 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#F59E0B" stroke="#0B1220" stroke-width="2.5"/><path d="M36 100 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#EC4899" stroke="#0B1220" stroke-width="2.5"/><path d="M206 150 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#22C55E" stroke="#0B1220" stroke-width="2.5"/></g>',
    '</g>',
    '<circle cx="120" cy="125" r="116" fill="none" stroke="#0B1220" stroke-width="6"/>',
    '</svg>'
  ].join('');

  /* the registry: add a coach here and pick it in a tutorial's config.js */
  LAB.coaches = {
    sam: { name: 'Sam', svg: SAM_SVG },
    noor: { name: 'Noor', svg: NOOR_SVG }
  };

  var host, svgEl, timer;

  LAB.coach = {
    mount: function (el) {
      host = el;
      var cfg = (LAB.config && LAB.config.coach) || {};
      var who = LAB.coaches[cfg.id] || LAB.coaches.sam;
      host.innerHTML = who.svg;
      svgEl = host.querySelector('svg');
      /* the name under the picture comes from the config when it is set; the page keeps its own text otherwise */
      if (cfg.name) {
        var label = document.querySelector('.coach-name');
        if (label) label.innerHTML = 'Coach ' + LAB.esc(cfg.name) + (cfg.role ? '<small>' + LAB.esc(cfg.role) + '</small>' : '');
        if (svgEl && cfg.name !== who.name) svgEl.setAttribute('aria-label', 'Coach ' + cfg.name + ', your guide');
      }
      var photo = LAB.config && LAB.config.coachPhoto;
      if (photo) {
        var img = new Image();
        img.className = 'coach-img';
        img.alt = 'Your coach';
        img.onload = function () { host.innerHTML = ''; host.appendChild(img); svgEl = null; };
        img.src = photo;
      }
    },
    mood: function (m) {
      if (svgEl) svgEl.setAttribute('data-mood', m || 'happy');
    },
    talk: function (ms) {
      if (!host) return;
      host.classList.add('talking');
      clearTimeout(timer);
      timer = setTimeout(function () { host.classList.remove('talking'); }, ms || 1500);
    }
  };
})();
