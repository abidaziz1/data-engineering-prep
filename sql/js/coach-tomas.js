/* Coach Tomas, the SQL coach. Registered here so that shared/js/coach.js stays unchanged.
   Every drawing keeps the same class names (head, eyes, mood-*, mouth-open, mouth-closed, q, spark) because shared/css/app.css animates them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var TOMAS_SVG = [
    '<svg viewBox="0 0 240 250" class="coach-svg" role="img" aria-label="Coach Tomas, your guide" data-mood="happy">',
    '<defs>',
    '<linearGradient id="tbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDE9FE"/><stop offset="1" stop-color="#FDE68A"/></linearGradient>',
    '<clipPath id="tclip"><circle cx="120" cy="125" r="116"/></clipPath>',
    '</defs>',
    '<circle cx="120" cy="125" r="116" fill="url(#tbg)"/>',
    '<g clip-path="url(#tclip)">',
    /* body: a charcoal blazer over a white shirt with an orange tie */
    '<path d="M4 252 C10 206 56 186 120 186 C184 186 230 206 236 252 Z" fill="#334155" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M95 188 L120 230 L145 188 Z" fill="#FFFFFF" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M95 188 L80 196 L106 236 L120 230 Z" fill="#1E293B" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M145 188 L160 196 L134 236 L120 230 Z" fill="#1E293B" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M114 192 L126 192 L129 206 L120 234 L111 206 Z" fill="#EA580C" stroke="#0B1220" stroke-width="2.5" stroke-linejoin="round"/>',
    /* a lapel pin shaped like a database cylinder */
    '<ellipse cx="62" cy="212" rx="13" ry="5" fill="#E0E7FF" stroke="#0B1220" stroke-width="2.2"/>',
    '<path d="M49 212 V228 C49 234 75 234 75 228 V212" fill="#C7D2FE" stroke="#0B1220" stroke-width="2.2"/>',
    '<path d="M49 220 C49 226 75 226 75 220" fill="none" stroke="#0B1220" stroke-width="1.8"/>',
    '</g>',
    '<g class="head">',
    '<path d="M103 156 L103 192 Q120 204 137 192 L137 156 Z" fill="#B97A52" stroke="#0B1220" stroke-width="3.5"/>',
    /* short curly hair behind the face */
    '<path d="M62 116 C52 62 86 34 120 34 C154 34 188 62 178 116 C172 92 150 76 120 76 C90 76 68 92 62 116 Z" fill="#1F2937" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/>',
    '<circle cx="84" cy="48" r="13" fill="#1F2937" stroke="#0B1220" stroke-width="3.5"/><circle cx="108" cy="38" r="14" fill="#1F2937" stroke="#0B1220" stroke-width="3.5"/><circle cx="134" cy="38" r="14" fill="#1F2937" stroke="#0B1220" stroke-width="3.5"/><circle cx="157" cy="49" r="13" fill="#1F2937" stroke="#0B1220" stroke-width="3.5"/>',
    /* a pencil behind the right ear */
    '<g transform="rotate(14 178 100)"><rect x="173" y="62" width="11" height="52" rx="2" fill="#FACC15" stroke="#0B1220" stroke-width="2.5"/><rect x="173" y="62" width="11" height="10" rx="2" fill="#F472B6" stroke="#0B1220" stroke-width="2.5"/><path d="M173 114 L178.5 128 L184 114 Z" fill="#F5D0A9" stroke="#0B1220" stroke-width="2"/></g>',
    '<circle cx="72" cy="120" r="9" fill="#C98A60" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="168" cy="120" r="9" fill="#C98A60" stroke="#0B1220" stroke-width="3.5"/>',
    '<ellipse cx="120" cy="114" rx="49" ry="57" fill="#C98A60" stroke="#0B1220" stroke-width="4"/>',
    '<circle cx="86" cy="146" r="8" fill="#E0674A" opacity=".28"/><circle cx="154" cy="146" r="8" fill="#E0674A" opacity=".28"/>',
    '<g class="eyes">',
    '<ellipse cx="98" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="100" cy="119" r="4.8" fill="#0B1220"/>',
    '<ellipse cx="142" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="144" cy="119" r="4.8" fill="#0B1220"/>',
    '</g>',
    '<path d="M120 124 Q126 136 118 140" fill="none" stroke="#8A5334" stroke-width="3.2" stroke-linecap="round"/>',
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
  LAB.coaches = LAB.coaches || {};
  LAB.coaches.tomas = { name: 'Tomas', svg: TOMAS_SVG };
})();
