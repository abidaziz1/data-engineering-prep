/* Coach Lena: the illustrated teacher of the Python course. shared/js/coach.js holds the registry; this file adds one entry.
   The drawing keeps the class names that shared/css/app.css animates (head, eyes, mood-*, mouth-open, mouth-closed, q, spark). */
(function () {
  var LAB = (window.LAB = window.LAB || {});

  var LENA_SVG = [
    '<svg viewBox="0 0 240 250" class="coach-svg" role="img" aria-label="Coach Lena, your guide" data-mood="happy">',
    '<defs>',
    '<linearGradient id="lbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DBEAFE"/><stop offset="1" stop-color="#FEF9C3"/></linearGradient>',
    '<clipPath id="lclip"><circle cx="120" cy="125" r="116"/></clipPath>',
    '</defs>',
    '<circle cx="120" cy="125" r="116" fill="url(#lbg)"/>',
    '<g clip-path="url(#lclip)">',
    /* a prompt on a small screen behind the coach */
    '<rect x="14" y="26" width="70" height="46" rx="6" fill="#0F172A" stroke="#0B1220" stroke-width="3"/>',
    '<text x="22" y="56" font-family="IBM Plex Mono, monospace" font-size="22" font-weight="700" fill="#FACC15">&gt;&gt;&gt;</text>',
    /* body: a blue jacket over a white shirt */
    '<path d="M4 252 C10 206 56 186 120 186 C184 186 230 206 236 252 Z" fill="#306998" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M95 188 L120 230 L145 188 Z" fill="#FFFFFF" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M95 188 L80 196 L106 236 L120 230 Z" fill="#25527A" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M145 188 L160 196 L134 236 L120 230 Z" fill="#25527A" stroke="#0B1220" stroke-width="3"/>',
    /* a yellow badge with two curly braces */
    '<circle cx="76" cy="214" r="14" fill="#FACC15" stroke="#0B1220" stroke-width="2.5"/>',
    '<text x="76" y="220" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="17" font-weight="700" fill="#0B1220">{}</text>',
    '</g>',
    '<g class="head">',
    '<path d="M103 156 L103 192 Q120 204 137 192 L137 156 Z" fill="#B5784F" stroke="#0B1220" stroke-width="3.5"/>',
    /* hair: a bun on top, tied with a yellow band, and hair behind the face */
    '<circle cx="120" cy="30" r="22" fill="#2B1B12" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M60 120 C48 62 86 36 120 36 C154 36 192 62 180 120 C174 92 152 80 120 80 C88 80 66 92 60 120 Z" fill="#2B1B12" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/>',
    '<rect x="104" y="46" width="32" height="9" rx="4" fill="#FACC15" stroke="#0B1220" stroke-width="3"/>',
    '<circle cx="72" cy="120" r="9" fill="#C68B63" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="168" cy="120" r="9" fill="#C68B63" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="72" cy="131" r="4.5" fill="#FACC15" stroke="#0B1220" stroke-width="2"/><circle cx="168" cy="131" r="4.5" fill="#FACC15" stroke="#0B1220" stroke-width="2"/>',
    '<ellipse cx="120" cy="114" rx="49" ry="57" fill="#C68B63" stroke="#0B1220" stroke-width="4"/>',
    /* a fringe over the forehead */
    '<path d="M72 98 C78 70 100 62 120 64 C142 62 164 72 168 98 C150 82 134 78 120 80 C104 78 88 84 72 98 Z" fill="#2B1B12" stroke="#0B1220" stroke-width="3.5" stroke-linejoin="round"/>',
    '<circle cx="86" cy="146" r="8" fill="#E8735A" opacity=".32"/><circle cx="154" cy="146" r="8" fill="#E8735A" opacity=".32"/>',
    '<g class="eyes">',
    '<ellipse cx="98" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="100" cy="119" r="4.8" fill="#0B1220"/>',
    '<ellipse cx="142" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="144" cy="119" r="4.8" fill="#0B1220"/>',
    '</g>',
    '<path d="M120 124 Q126 136 118 140" fill="none" stroke="#8E5B3A" stroke-width="3.2" stroke-linecap="round"/>',
    /* moods */
    '<g class="mood mood-happy">',
    '<path d="M85 102 Q98 95 112 100 M128 100 Q142 95 155 102" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path class="mouth-closed" d="M102 150 Q120 168 138 150" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '<g class="mouth-open"><path d="M100 148 Q120 180 140 148 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/><path d="M109 162 Q120 170 131 162 Q120 157 109 162 Z" fill="#F87171"/></g>',
    '</g>',
    '<g class="mood mood-think">',
    '<path d="M85 96 Q98 87 112 95 M128 104 Q142 102 155 98" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M106 154 Q120 152 138 148" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-cheer">',
    '<path d="M85 96 Q98 87 112 95 M128 95 Q142 87 155 96" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M98 148 Q120 186 142 148 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/><path d="M108 164 Q120 174 132 164 Q120 158 108 164 Z" fill="#F87171"/>',
    '</g>',
    '<g class="mood mood-oops">',
    '<path d="M85 106 Q98 102 112 93 M128 93 Q142 102 155 106" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M106 158 Q120 146 134 158" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-wow">',
    '<path d="M85 93 Q98 85 112 93 M128 93 Q142 85 155 93" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<ellipse cx="120" cy="156" rx="9" ry="12" fill="#7F1D1D" stroke="#0B1220" stroke-width="4"/>',
    '</g>',
    '</g>',
    '<g class="extras">',
    '<text class="q" x="184" y="62" font-size="46" font-weight="800" fill="#0B1220" stroke="#fff" stroke-width="5" paint-order="stroke">?</text>',
    '<g class="spark"><path d="M200 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#FACC15" stroke="#0B1220" stroke-width="2.5"/><path d="M36 100 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#60A5FA" stroke="#0B1220" stroke-width="2.5"/><path d="M206 150 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#22C55E" stroke="#0B1220" stroke-width="2.5"/></g>',
    '</g>',
    '<circle cx="120" cy="125" r="116" fill="none" stroke="#0B1220" stroke-width="6"/>',
    '</svg>'
  ].join('');

  LAB.coaches = LAB.coaches || {};
  LAB.coaches.lena = { name: 'Lena', svg: LENA_SVG };
})();
