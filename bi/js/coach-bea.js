/* Coach Bea, the coach of this course. She is registered here so that no shared file has to change.
   The drawing keeps the class names that shared/css/app.css animates: head, eyes, mood-*, mouth-open, mouth-closed, q, spark. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var BEA_SVG = [
    '<svg viewBox="0 0 240 250" class="coach-svg" role="img" aria-label="Coach Bea, your guide" data-mood="happy">',
    '<defs>',
    '<linearGradient id="bbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FEF3C7"/><stop offset="1" stop-color="#DDD6FE"/></linearGradient>',
    '<clipPath id="bclip"><circle cx="120" cy="125" r="116"/></clipPath>',
    '</defs>',
    '<circle cx="120" cy="125" r="116" fill="url(#bbg)"/>',
    '<g clip-path="url(#bclip)">',
    /* body: a violet cardigan over a cream top, with a small bar chart as a badge */
    '<path d="M4 252 C10 206 56 186 120 186 C184 186 230 206 236 252 Z" fill="#6D28D9" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M96 187 L120 236 L144 187 Z" fill="#FEF9C3" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M96 187 L84 194 L112 246 L120 236 Z" fill="#5B21B6" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M144 187 L156 194 L128 246 L120 236 Z" fill="#5B21B6" stroke="#0B1220" stroke-width="3"/>',
    '<rect x="158" y="202" width="30" height="26" rx="5" fill="#FFFFFF" stroke="#0B1220" stroke-width="2.5"/>',
    '<rect x="163" y="216" width="5" height="8" fill="#F59E0B"/><rect x="171" y="210" width="5" height="14" fill="#10B981"/><rect x="179" y="206" width="5" height="18" fill="#6D28D9"/>',
    '</g>',
    '<g class="head">',
    '<path d="M103 156 L103 192 Q120 204 137 192 L137 156 Z" fill="#E8B796" stroke="#0B1220" stroke-width="3.5"/>',
    /* a silver bob with a fringe */
    '<path d="M58 150 C44 96 62 40 120 38 C178 40 196 96 182 150 C176 150 170 146 168 138 C170 104 156 80 120 80 C84 80 70 104 72 138 C70 146 64 150 58 150 Z" fill="#CBD5E1" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/>',
    '<ellipse cx="120" cy="115" rx="49" ry="57" fill="#F3C9A8" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M72 96 C80 64 104 56 120 58 C140 56 162 66 168 96 C150 84 132 80 120 82 C104 80 88 86 72 96 Z" fill="#CBD5E1" stroke="#0B1220" stroke-width="3.5" stroke-linejoin="round"/>',
    '<circle cx="86" cy="147" r="8" fill="#E8735A" opacity=".3"/><circle cx="154" cy="147" r="8" fill="#E8735A" opacity=".3"/>',
    '<g class="eyes">',
    '<ellipse cx="98" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="100" cy="119" r="4.8" fill="#0B1220"/>',
    '<ellipse cx="142" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="144" cy="119" r="4.8" fill="#0B1220"/>',
    '</g>',
    /* round glasses */
    '<circle cx="98" cy="118" r="16" fill="none" stroke="#B45309" stroke-width="4"/><circle cx="142" cy="118" r="16" fill="none" stroke="#B45309" stroke-width="4"/>',
    '<path d="M114 116 Q120 111 126 116 M82 114 L72 110 M158 114 L168 110" fill="none" stroke="#B45309" stroke-width="4" stroke-linecap="round"/>',
    '<path d="M120 126 Q126 138 118 142" fill="none" stroke="#B98A6A" stroke-width="3.2" stroke-linecap="round"/>',
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
  LAB.coaches.bea = { name: 'Bea', svg: BEA_SVG };
})();
