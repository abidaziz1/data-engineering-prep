/* Coach Juno, the coach of this course. It is registered here so that no shared file has to change.
   The drawing keeps the class names that shared/css/app.css animates: head, eyes, mood-*, mouth-open, mouth-closed, q, spark. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var JUNO_SVG = [
    '<svg viewBox="0 0 240 250" class="coach-svg" role="img" aria-label="Coach Juno, your guide" data-mood="happy">',
    '<defs>',
    '<linearGradient id="jbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#CFFAFE"/><stop offset="1" stop-color="#FBCFE8"/></linearGradient>',
    '<clipPath id="jclip"><circle cx="120" cy="125" r="116"/></clipPath>',
    '</defs>',
    '<circle cx="120" cy="125" r="116" fill="url(#jbg)"/>',
    '<g clip-path="url(#jclip)">',
    /* body: a cyan hoodie with a collar and a pinwheel badge */
    '<path d="M4 252 C10 206 56 186 120 186 C184 186 230 206 236 252 Z" fill="#0E7490" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M92 190 C100 214 140 214 148 190 L140 184 C132 200 108 200 100 184 Z" fill="#155E75" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M108 204 L106 232 M132 204 L134 232" fill="none" stroke="#F8FAFC" stroke-width="3.5" stroke-linecap="round"/>',
    '<circle cx="72" cy="216" r="15" fill="#FFFFFF" stroke="#0B1220" stroke-width="2.5"/>',
    '<path d="M72 216 L72 202 A14 14 0 0 1 84 209 Z" fill="#F59E0B" stroke="#0B1220" stroke-width="1.6" stroke-linejoin="round"/>',
    '<path d="M72 216 L84 209 A14 14 0 0 1 80 228 Z" fill="#22C55E" stroke="#0B1220" stroke-width="1.6" stroke-linejoin="round"/>',
    '<path d="M72 216 L80 228 A14 14 0 0 1 62 226 Z" fill="#0EA5E9" stroke="#0B1220" stroke-width="1.6" stroke-linejoin="round"/>',
    '<path d="M72 216 L62 226 A14 14 0 0 1 60 208 Z" fill="#EC4899" stroke="#0B1220" stroke-width="1.6" stroke-linejoin="round"/>',
    '</g>',
    '<g class="head">',
    '<path d="M103 156 L103 192 Q120 204 137 192 L137 156 Z" fill="#A9693F" stroke="#0B1220" stroke-width="3.5"/>',
    /* curly hair behind and above the face */
    '<path d="M60 120 C42 100 46 62 76 54 C80 34 106 26 120 38 C136 26 162 34 166 54 C196 62 198 100 180 120 C176 94 152 78 120 78 C88 78 64 94 60 120 Z" fill="#1F1410" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/>',
    '<circle cx="72" cy="122" r="9" fill="#BD7B50" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="168" cy="122" r="9" fill="#BD7B50" stroke="#0B1220" stroke-width="3.5"/>',
    '<ellipse cx="120" cy="115" rx="49" ry="57" fill="#BD7B50" stroke="#0B1220" stroke-width="4"/>',
    '<circle cx="86" cy="147" r="8" fill="#E8735A" opacity=".3"/><circle cx="154" cy="147" r="8" fill="#E8735A" opacity=".3"/>',
    '<g class="eyes">',
    '<ellipse cx="98" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="100" cy="119" r="4.8" fill="#0B1220"/>',
    '<ellipse cx="142" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="144" cy="119" r="4.8" fill="#0B1220"/>',
    '</g>',
    /* headphones: a band over the hair and two cups */
    '<path d="M64 112 C60 62 92 40 120 40 C148 40 180 62 176 112" fill="none" stroke="#0B1220" stroke-width="9" stroke-linecap="round"/>',
    '<path d="M64 112 C60 62 92 40 120 40 C148 40 180 62 176 112" fill="none" stroke="#EC4899" stroke-width="4.5" stroke-linecap="round"/>',
    '<rect x="55" y="104" width="17" height="30" rx="8" fill="#EC4899" stroke="#0B1220" stroke-width="3.5"/>',
    '<rect x="168" y="104" width="17" height="30" rx="8" fill="#EC4899" stroke="#0B1220" stroke-width="3.5"/>',
    '<path d="M120 124 Q126 136 118 140" fill="none" stroke="#8A5230" stroke-width="3.2" stroke-linecap="round"/>',
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
  LAB.coaches.juno = { name: 'Juno', svg: JUNO_SVG };
})();
