/* Coach Nova, the coach of this course. She is registered here so that no shared file has to change.
   The drawing keeps the class names that shared/css/app.css animates: head, eyes, mood-*, mouth-open, mouth-closed, q, spark. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var NOVA_SVG = [
    '<svg viewBox="0 0 240 250" class="coach-svg" role="img" aria-label="Coach Nova, your guide" data-mood="happy">',
    '<defs>',
    '<linearGradient id="nbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#CFFAFE"/><stop offset="1" stop-color="#A5F3FC"/></linearGradient>',
    '<clipPath id="nclip"><circle cx="120" cy="125" r="116"/></clipPath>',
    '</defs>',
    '<circle cx="120" cy="125" r="116" fill="url(#nbg)"/>',
    '<g clip-path="url(#nclip)">',
    /* body: a teal hoodie with a small ship wheel as a badge */
    '<path d="M4 252 C10 206 56 186 120 186 C184 186 230 206 236 252 Z" fill="#0E7490" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M92 187 C96 204 108 212 120 212 C132 212 144 204 148 187 Z" fill="#155E75" stroke="#0B1220" stroke-width="3"/>',
    '<path d="M110 212 L108 244 M130 212 L132 244" fill="none" stroke="#FEF3C7" stroke-width="3.5" stroke-linecap="round"/>',
    '<circle cx="172" cy="216" r="14" fill="#FDE68A" stroke="#0B1220" stroke-width="2.5"/>',
    '<path d="M172 202 V230 M158 216 H186 M162 206 L182 226 M182 206 L162 226" stroke="#0B1220" stroke-width="2" fill="none"/>',
    '</g>',
    '<g class="head">',
    '<path d="M103 156 L103 192 Q120 204 137 192 L137 156 Z" fill="#E0B08A" stroke="#0B1220" stroke-width="3.5"/>',
    /* short dark hair, with a navy beanie on top */
    '<path d="M64 128 C60 90 80 62 120 60 C160 62 180 90 176 128 C170 112 160 100 120 100 C80 100 70 112 64 128 Z" fill="#3B2A5A" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/>',
    '<ellipse cx="120" cy="115" rx="49" ry="57" fill="#F1C9A5" stroke="#0B1220" stroke-width="4"/>',
    '<path d="M70 96 C74 56 100 38 120 38 C142 38 168 56 170 96 C150 86 134 84 120 84 C104 84 88 86 70 96 Z" fill="#0F766E" stroke="#0B1220" stroke-width="4" stroke-linejoin="round"/>',
    '<path d="M70 96 C90 90 104 88 120 88 C136 88 150 90 170 96" fill="none" stroke="#0B1220" stroke-width="3.5"/>',
    '<circle cx="120" cy="32" r="8" fill="#F59E0B" stroke="#0B1220" stroke-width="3"/>',
    '<circle cx="86" cy="140" r="7" fill="#E8735A" opacity=".28"/><circle cx="154" cy="140" r="7" fill="#E8735A" opacity=".28"/>',
    '<g class="eyes">',
    '<ellipse cx="98" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="100" cy="119" r="4.8" fill="#0B1220"/>',
    '<ellipse cx="142" cy="118" rx="9" ry="10" fill="#fff" stroke="#0B1220" stroke-width="2.5"/><circle cx="144" cy="119" r="4.8" fill="#0B1220"/>',
    '</g>',
    '<path d="M120 126 Q126 138 118 142" fill="none" stroke="#C99A74" stroke-width="3.2" stroke-linecap="round"/>',
    /* moods */
    '<g class="mood mood-happy">',
    '<path d="M85 100 Q98 93 112 98 M128 98 Q142 93 155 100" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path class="mouth-closed" d="M104 154 Q120 168 136 154" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '<g class="mouth-open"><path d="M102 152 Q120 180 138 152 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="3" stroke-linejoin="round"/><path d="M110 164 Q120 171 130 164 Q120 159 110 164 Z" fill="#F87171"/></g>',
    '</g>',
    '<g class="mood mood-think">',
    '<path d="M85 94 Q98 85 112 93 M128 102 Q142 100 155 96" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M106 158 Q120 156 136 152" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-cheer">',
    '<path d="M85 94 Q98 85 112 93 M128 93 Q142 85 155 94" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M100 152 Q120 186 140 152 Z" fill="#7F1D1D" stroke="#0B1220" stroke-width="3" stroke-linejoin="round"/><path d="M109 166 Q120 175 131 166 Q120 160 109 166 Z" fill="#F87171"/>',
    '</g>',
    '<g class="mood mood-oops">',
    '<path d="M85 104 Q98 100 112 91 M128 91 Q142 100 155 104" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M106 162 Q120 150 134 162" fill="none" stroke="#0B1220" stroke-width="4.5" stroke-linecap="round"/>',
    '</g>',
    '<g class="mood mood-wow">',
    '<path d="M85 91 Q98 83 112 91 M128 91 Q142 83 155 91" fill="none" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>',
    '<ellipse cx="120" cy="160" rx="9" ry="11" fill="#7F1D1D" stroke="#0B1220" stroke-width="3"/>',
    '</g>',
    '</g>',
    '<g class="extras">',
    '<text class="q" x="184" y="62" font-size="46" font-weight="800" fill="#0B1220" stroke="#fff" stroke-width="5" paint-order="stroke">?</text>',
    '<g class="spark"><path d="M200 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#F59E0B" stroke="#0B1220" stroke-width="2.5"/><path d="M36 100 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#38BDF8" stroke="#0B1220" stroke-width="2"/></g>',
    '</g>',
    '<circle cx="120" cy="125" r="116" fill="none" stroke="#0B1220" stroke-width="6"/>',
    '</svg>'
  ].join('');

  LAB.coaches = LAB.coaches || {};
  LAB.coaches.nova = { name: 'Nova', svg: NOVA_SVG };
})();
