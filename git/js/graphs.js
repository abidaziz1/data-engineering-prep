/* Diagram specs for the Git course. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. The four places a change goes through */
  S.master = {
    w: 1000, h: 400,
    label: 'A change starts in the working tree, is staged in the index, is saved as a commit in the local repository, and is shared by a push to the remote. A fetch brings the remote commits back, and a restore or a switch brings files out of the repository into the working tree.',
    nodes: [
      { id: 'wt', x: 0, y: 150, w: 200, h: 90, t: 'Working tree', s: 'the files you edit', c: 'src' },
      { id: 'ix', x: 260, y: 150, w: 200, h: 90, t: 'Index', s: 'the next commit', c: 'stg' },
      { id: 'repo', x: 520, y: 150, w: 210, h: 90, t: 'Repository', s: 'commits, in .git', c: 'mart' },
      { id: 'rem', x: 790, y: 150, w: 210, h: 90, t: 'Remote', s: 'origin, on a server', c: 'air' }
    ],
    edges: [
      { id: 'e1', a: 'wt', b: 'ix', d: 'M200 195 H260', n: 1, nb: true },
      { id: 'e2', a: 'ix', b: 'repo', d: 'M460 195 H520', n: 2, nb: true },
      { id: 'e3', a: 'repo', b: 'rem', d: 'M730 195 H790', n: 3, nb: true },
      { id: 'e4', a: 'rem', b: 'repo', d: 'M880 240 C880 330 650 330 625 240', n: 4, bx: 750, by: 322 },
      { id: 'e5', a: 'repo', b: 'wt', d: 'M590 150 C590 60 130 60 100 150', n: 5, bx: 350, by: 72, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_add', x: 216, y: 112, t: 'git add', c: 'src' },
      { id: 'tg_commit', x: 456, y: 112, t: 'git commit', c: 'stg' },
      { id: 'tg_push', x: 738, y: 112, t: 'git push', c: 'air' },
      { id: 'tg_fetch', x: 700, y: 352, t: 'git fetch', c: 'mart' },
      { id: 'tg_restore', x: 250, y: 18, t: 'git restore, git switch', c: 'raw' }
    ]
  };

  /* 2. What a commit points to */
  S.objects = {
    w: 1000, h: 400,
    label: 'A commit holds a message, an author, a date, the id of its parent and the id of a tree. A tree lists files and folders, and points to a blob for the text of each file. Every object is named by the hash of its own content.',
    nodes: [
      { id: 'c2', x: 0, y: 40, w: 190, h: 80, t: 'Commit 2', s: 'message, author, date', c: 'mart' },
      { id: 'c1', x: 0, y: 280, w: 190, h: 80, t: 'Commit 1', s: 'the first commit', c: 'mart' },
      { id: 'root', x: 280, y: 150, w: 170, h: 80, t: 'Tree', s: 'the root folder', c: 'stg' },
      { id: 'models', x: 540, y: 10, w: 190, h: 70, t: 'Tree models/', s: 'a folder', c: 'stg' },
      { id: 'loader', x: 540, y: 120, w: 190, h: 70, t: 'Tree loader/', s: 'a folder', c: 'stg' },
      { id: 'readme', x: 540, y: 250, w: 190, h: 70, t: 'Blob', s: 'README.md', c: 'raw' },
      { id: 'sql', x: 810, y: 10, w: 190, h: 70, t: 'Blob', s: 'orders_daily.sql', c: 'raw' },
      { id: 'rate', x: 810, y: 120, w: 190, h: 70, t: 'Blob', s: 'tax_rate.txt', c: 'raw' }
    ],
    edges: [
      { id: 'e1', a: 'c2', b: 'c1', d: 'M95 120 V280', n: 1, bx: 95, by: 200 },
      { id: 'e2', a: 'c2', b: 'root', d: 'M190 90 C240 90 230 190 280 190', n: 2, bx: 236, by: 140 },
      { id: 'e3', a: 'root', b: 'models', d: 'M450 170 C500 170 500 45 540 45', n: 3, bx: 498, by: 105 },
      { id: 'e4', a: 'root', b: 'loader', d: 'M450 190 C500 190 500 155 540 155', n: 3, nb: true },
      { id: 'e5', a: 'root', b: 'readme', d: 'M450 210 C500 210 500 285 540 285', n: 3, nb: true },
      { id: 'e6', a: 'models', b: 'sql', d: 'M730 45 H810', n: 4, nb: true },
      { id: 'e7', a: 'loader', b: 'rate', d: 'M730 155 H810', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_hash', x: 400, y: 345, t: 'each object is named by the hash of its content', c: 'air' },
      { id: 'tg_same', x: 560, y: 235, t: 'same text, same id: stored once', c: 'qual' }
    ]
  };

  /* 3. A branch is a name for a commit */
  S.branches = {
    w: 1000, h: 400,
    label: 'A branch is a name that points to one commit. HEAD says which branch you are on. Commits point back to their parent, and a new commit moves the branch that you are on.',
    nodes: [
      { id: 'a', x: 0, y: 230, w: 120, h: 70, t: 'A', s: 'first commit', c: 'raw' },
      { id: 'b', x: 190, y: 230, w: 120, h: 70, t: 'B', s: 'nightly DAG', c: 'raw' },
      { id: 'm1', x: 380, y: 230, w: 120, h: 70, t: 'M1', s: 'on main', c: 'mart' },
      { id: 'f1', x: 380, y: 60, w: 120, h: 70, t: 'F1', s: 'on feature', c: 'src' },
      { id: 'f2', x: 570, y: 60, w: 120, h: 70, t: 'F2', s: 'on feature', c: 'src' },
      { id: 'main', x: 700, y: 245, w: 150, h: 60, t: 'main', s: 'a branch', c: 'stg' },
      { id: 'feat', x: 780, y: 75, w: 150, h: 60, t: 'feature', s: 'a branch', c: 'ing' },
      { id: 'head', x: 870, y: 330, w: 130, h: 56, t: 'HEAD', s: 'you are here', c: 'air' }
    ],
    edges: [
      { id: 'e1', a: 'b', b: 'a', d: 'M190 265 H120', n: 1, nb: true },
      { id: 'e2', a: 'm1', b: 'b', d: 'M380 265 H310', n: 1, nb: true },
      { id: 'e3', a: 'f1', b: 'b', d: 'M380 95 C320 95 280 170 262 230', n: 2, bx: 316, by: 150 },
      { id: 'e4', a: 'f2', b: 'f1', d: 'M570 95 H500', n: 2, nb: true },
      { id: 'e5', a: 'main', b: 'm1', d: 'M700 275 H500', n: 3, nb: true, k: 'ctl' },
      { id: 'e6', a: 'feat', b: 'f2', d: 'M780 105 H690', n: 3, nb: true, k: 'ctl' },
      { id: 'e7', a: 'head', b: 'main', d: 'M900 330 C900 300 850 290 850 285', n: 4, nb: true, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_parent', x: 30, y: 330, t: 'arrows point to the parent', c: 'raw' },
      { id: 'tg_move', x: 400, y: 330, t: 'a new commit moves the branch you are on', c: 'air' }
    ]
  };

  /* 4. Merge and rebase of the same two branches. Time runs to the right. */
  S.mergerebase = {
    w: 1000, h: 400,
    label: 'The same two branches, joined in two ways. A merge adds one commit with two parents, and keeps the commits F1 and F2 as they are. A rebase copies F1 and F2 on top of the newest commit of main, and the copies get new ids.',
    nodes: [
      { id: 'a1', x: 0, y: 20, w: 90, h: 56, t: 'A', s: '', c: 'raw' },
      { id: 'b1', x: 130, y: 20, w: 90, h: 56, t: 'B', s: '', c: 'raw' },
      { id: 'c1', x: 260, y: 20, w: 90, h: 56, t: 'M1', s: 'main', c: 'mart' },
      { id: 'f1', x: 260, y: 110, w: 90, h: 56, t: 'F1', s: 'feature', c: 'src' },
      { id: 'f2', x: 390, y: 110, w: 90, h: 56, t: 'F2', s: 'feature', c: 'src' },
      { id: 'mm', x: 560, y: 20, w: 110, h: 56, t: 'Merge', s: 'two parents', c: 'stg' },
      { id: 'a2', x: 0, y: 270, w: 90, h: 56, t: 'A', s: '', c: 'raw' },
      { id: 'b2', x: 130, y: 270, w: 90, h: 56, t: 'B', s: '', c: 'raw' },
      { id: 'c2', x: 260, y: 270, w: 90, h: 56, t: 'M1', s: 'main', c: 'mart' },
      { id: 'f1r', x: 390, y: 270, w: 100, h: 56, t: "F1'", s: 'new id', c: 'ing' },
      { id: 'f2r', x: 530, y: 270, w: 100, h: 56, t: "F2'", s: 'new id', c: 'ing' }
    ],
    edges: [
      { id: 'e1', a: 'a1', b: 'b1', d: 'M90 48 H130', n: 1, nb: true },
      { id: 'e2', a: 'b1', b: 'c1', d: 'M220 48 H260', n: 1, nb: true },
      { id: 'e3', a: 'c1', b: 'mm', d: 'M350 48 H560', n: 2, nb: true },
      { id: 'e4', a: 'b1', b: 'f1', d: 'M200 76 C200 138 230 138 260 138', n: 2, bx: 214, by: 118 },
      { id: 'e5', a: 'f1', b: 'f2', d: 'M350 138 H390', n: 2, nb: true },
      { id: 'e6', a: 'f2', b: 'mm', d: 'M480 138 C540 138 600 110 615 76', n: 3, bx: 560, by: 124 },
      { id: 'e7', a: 'a2', b: 'b2', d: 'M90 298 H130', n: 4, nb: true },
      { id: 'e8', a: 'b2', b: 'c2', d: 'M220 298 H260', n: 4, nb: true },
      { id: 'e9', a: 'c2', b: 'f1r', d: 'M350 298 H390', n: 5, nb: true },
      { id: 'e10', a: 'f1r', b: 'f2r', d: 'M490 298 H530', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_merge', x: 700, y: 36, t: 'merge: F1 and F2 keep their ids', c: 'stg' },
      { id: 'tg_rebase', x: 660, y: 286, t: 'rebase: F1 and F2 are copied', c: 'ing' },
      { id: 'tg_hist', x: 20, y: 200, t: 'the history of main is one line only after a rebase or a squash', c: 'raw' }
    ]
  };

  /* 5. Two clones and one remote */
  S.remote = {
    w: 1000, h: 400,
    label: 'Maya and Omar each have a full copy of the repository. They share work through the remote. A push is accepted only when it adds to what the remote already has, so the second person to push is refused and must fetch and combine first.',
    nodes: [
      { id: 'maya', x: 0, y: 150, w: 200, h: 90, t: 'Maya', s: 'her clone', c: 'src' },
      { id: 'origin', x: 400, y: 150, w: 200, h: 90, t: 'origin', s: 'a shared repository', c: 'air' },
      { id: 'omar', x: 800, y: 150, w: 200, h: 90, t: 'Omar', s: 'his clone', c: 'stg' }
    ],
    edges: [
      { id: 'e1', a: 'omar', b: 'origin', d: 'M800 170 H600', n: 1, nb: true },
      { id: 'e2', a: 'maya', b: 'origin', d: 'M200 170 H400', n: 2, nb: true },
      { id: 'e3', a: 'origin', b: 'maya', d: 'M400 220 H200', n: 3, nb: true, k: 'ctl' },
      { id: 'e4', a: 'origin', b: 'omar', d: 'M600 220 H800', n: 4, nb: true, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_first', x: 640, y: 118, t: 'Omar pushes first: accepted', c: 'qual' },
      { id: 'tg_refused', x: 130, y: 118, t: 'Maya pushes second: refused', c: 'mon' },
      { id: 'tg_fetch', x: 200, y: 262, t: 'git fetch, then merge or rebase, then push again', c: 'air' }
    ]
  };

  /* 6. How far a reset goes */
  S.undo = {
    w: 1000, h: 400,
    label: 'A reset moves the branch to another commit. With --soft that is all. With --mixed it also makes the index match that commit. With --hard it also makes the files match, and uncommitted changes in them are lost.',
    nodes: [
      { id: 'cmd', x: 0, y: 150, w: 190, h: 90, t: 'git reset', s: 'and a flag', c: 'src' },
      { id: 'head', x: 270, y: 150, w: 190, h: 90, t: 'HEAD', s: 'the branch moves', c: 'mart' },
      { id: 'ix', x: 540, y: 150, w: 190, h: 90, t: 'Index', s: 'what is staged', c: 'stg' },
      { id: 'wt', x: 810, y: 150, w: 190, h: 90, t: 'Working tree', s: 'your files', c: 'ing' }
    ],
    edges: [
      { id: 'e1', a: 'cmd', b: 'head', d: 'M190 195 H270', n: 1, nb: true },
      { id: 'e2', a: 'head', b: 'ix', d: 'M460 195 H540', n: 2, nb: true },
      { id: 'e3', a: 'ix', b: 'wt', d: 'M730 195 H810', n: 3, nb: true }
    ],
    tags: [
      { id: 'tg_soft', x: 290, y: 262, t: '--soft stops here', c: 'mart' },
      { id: 'tg_mixed', x: 540, y: 300, t: '--mixed stops here', c: 'stg' },
      { id: 'tg_hard', x: 740, y: 262, t: '--hard goes all the way', c: 'mon' },
      { id: 'tg_reflog', x: 270, y: 80, t: 'the reflog remembers where HEAD was', c: 'air' }
    ]
  };

  /* 7. Bisect: sixteen commits, three tests */
  S.bisect = {
    w: 1000, h: 400,
    label: 'Sixteen commits, the first one good and the last one bad. Git tests the commit in the middle of what is left, and each answer removes half of the commits. The recorded run found the first bad commit in three tests.',
    nodes: [
      { id: 'c1', x: 0, y: 170, w: 52, h: 60, t: '1', s: '', c: 'raw' },
      { id: 'c2', x: 62, y: 170, w: 52, h: 60, t: '2', s: '', c: 'raw' },
      { id: 'c3', x: 124, y: 170, w: 52, h: 60, t: '3', s: '', c: 'raw' },
      { id: 'c4', x: 186, y: 170, w: 52, h: 60, t: '4', s: '', c: 'raw' },
      { id: 'c5', x: 248, y: 170, w: 52, h: 60, t: '5', s: '', c: 'raw' },
      { id: 'c6', x: 310, y: 170, w: 52, h: 60, t: '6', s: '', c: 'raw' },
      { id: 'c7', x: 372, y: 170, w: 52, h: 60, t: '7', s: '', c: 'raw' },
      { id: 'c8', x: 434, y: 170, w: 52, h: 60, t: '8', s: '', c: 'raw' },
      { id: 'c9', x: 496, y: 170, w: 52, h: 60, t: '9', s: '', c: 'raw' },
      { id: 'c10', x: 558, y: 170, w: 52, h: 60, t: '10', s: '', c: 'raw' },
      { id: 'c11', x: 620, y: 170, w: 52, h: 60, t: '11', s: '', c: 'raw' },
      { id: 'c12', x: 682, y: 170, w: 52, h: 60, t: '12', s: '', c: 'raw' },
      { id: 'c13', x: 744, y: 170, w: 52, h: 60, t: '13', s: '', c: 'raw' },
      { id: 'c14', x: 806, y: 170, w: 52, h: 60, t: '14', s: '', c: 'raw' },
      { id: 'c15', x: 868, y: 170, w: 52, h: 60, t: '15', s: '', c: 'raw' },
      { id: 'c16', x: 930, y: 170, w: 52, h: 60, t: '16', s: '', c: 'raw' }
    ],
    edges: [
      { id: 'e1', a: 'c1', b: 'c2', d: 'M52 200 H62', n: 1, nb: true },
      { id: 'e2', a: 'c2', b: 'c3', d: 'M114 200 H124', n: 2, nb: true },
      { id: 'e3', a: 'c3', b: 'c4', d: 'M176 200 H186', n: 3, nb: true },
      { id: 'e4', a: 'c4', b: 'c5', d: 'M238 200 H248', n: 4, nb: true },
      { id: 'e5', a: 'c5', b: 'c6', d: 'M300 200 H310', n: 5, nb: true },
      { id: 'e6', a: 'c6', b: 'c7', d: 'M362 200 H372', n: 6, nb: true },
      { id: 'e7', a: 'c7', b: 'c8', d: 'M424 200 H434', n: 7, nb: true },
      { id: 'e8', a: 'c8', b: 'c9', d: 'M486 200 H496', n: 8, nb: true },
      { id: 'e9', a: 'c9', b: 'c10', d: 'M548 200 H558', n: 9, nb: true },
      { id: 'e10', a: 'c10', b: 'c11', d: 'M610 200 H620', n: 10, nb: true },
      { id: 'e11', a: 'c11', b: 'c12', d: 'M672 200 H682', n: 11, nb: true },
      { id: 'e12', a: 'c12', b: 'c13', d: 'M734 200 H744', n: 12, nb: true },
      { id: 'e13', a: 'c13', b: 'c14', d: 'M796 200 H806', n: 13, nb: true },
      { id: 'e14', a: 'c14', b: 'c15', d: 'M858 200 H868', n: 14, nb: true },
      { id: 'e15', a: 'c15', b: 'c16', d: 'M920 200 H930', n: 15, nb: true }
    ],
    tags: [
      { id: 'tg_good', x: 0, y: 250, t: 'good', c: 'qual' },
      { id: 'tg_bad', x: 880, y: 250, t: 'bad', c: 'mon' },
      { id: 'tg_test', x: 300, y: 100, t: 'test the middle of what is left', c: 'air' }
    ]
  };

  /* 8. From a commit to a release */
  S.flow = {
    w: 1000, h: 400,
    label: 'A hook on your machine can stop a commit. After the push, a CI job runs the same checks on a clean checkout, a person reviews the change, and a merge into the protected main branch makes it part of the release that a tag names.',
    nodes: [
      { id: 'you', x: 0, y: 40, w: 160, h: 80, t: 'You', s: 'git commit', c: 'src' },
      { id: 'hook', x: 210, y: 40, w: 170, h: 80, t: 'pre-commit', s: 'a script, local', c: 'mon' },
      { id: 'repo', x: 430, y: 40, w: 170, h: 80, t: 'Local repo', s: 'the commit', c: 'mart' },
      { id: 'rem', x: 650, y: 40, w: 160, h: 80, t: 'Remote', s: 'a branch', c: 'air' },
      { id: 'ci', x: 840, y: 40, w: 160, h: 80, t: 'CI', s: 'checks, clean checkout', c: 'qual' },
      { id: 'rev', x: 650, y: 270, w: 160, h: 80, t: 'Review', s: 'a person reads it', c: 'stg' },
      { id: 'main', x: 840, y: 270, w: 160, h: 80, t: 'main', s: 'protected', c: 'ing' },
      { id: 'tag', x: 430, y: 270, w: 170, h: 80, t: 'Tag v1.2.0', s: 'a release', c: 'ci' }
    ],
    edges: [
      { id: 'e1', a: 'you', b: 'hook', d: 'M160 80 H210', n: 1, nb: true },
      { id: 'e2', a: 'hook', b: 'repo', d: 'M380 80 H430', n: 2, nb: true },
      { id: 'e3', a: 'repo', b: 'rem', d: 'M600 80 H650', n: 3, nb: true },
      { id: 'e4', a: 'rem', b: 'ci', d: 'M810 80 H840', n: 4, nb: true },
      { id: 'e5', a: 'ci', b: 'rev', d: 'M920 120 C920 200 760 200 740 270', n: 5, bx: 840, by: 196 },
      { id: 'e6', a: 'rev', b: 'main', d: 'M810 310 H840', n: 6, nb: true },
      { id: 'e7', a: 'main', b: 'tag', d: 'M840 330 C700 380 600 380 560 350', n: 7, bx: 700, by: 372 }
    ],
    tags: [
      { id: 'tg_bypass', x: 190, y: 150, t: '--no-verify skips the hook', c: 'mon' },
      { id: 'tg_nohooks', x: 190, y: 190, t: 'hooks are not part of a clone', c: 'raw' }
    ]
  };
})();
