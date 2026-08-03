(() => {
  'use strict';

  const DIGIT_MASKS = {
    '0': [
      '...............','....#######....','..###########..','.#####...#####.',
      '.####....#####.','#####.....#####','#####.....#####','#####.....#####',
      '#####.....#####','#####.....#####','#####.....#####','#####.....#####',
      '#####.....#####','.####....#####.','.#####...#####.','..###########..',
      '....#######....'
    ],
    '1': [
      '...............','.......###.....','.....#####.....','...#######.....',
      '..########.....','......####.....','......####.....','......####.....',
      '......####.....','......####.....','......####.....','......####.....',
      '......####.....','......####.....','......####.....','.....######....',
      '...##########..'
    ],
    '2': [
      '...............','....#######....','..###########..','..###########..',
      '..#.....######.','........######.','.........#####.','........#####..',
      '........#####..','.......#####...','......#####....','.....#####.....',
      '....####.......','...####........','..############.','.#############.',
      '.#############.'
    ],
    '3': [
      '.....#####.....','..##########...','..###########..','..#.....#####..',
      '.........#####.','.........####..','........#####..','....#######....',
      '....########...','........#####..','.........#####.','.........#####.',
      '.........#####.','.........#####.','.......######..','.###########...',
      '.#########.....'
    ],
    '4': [
      '.........#####.','........######.','.......#######.','......####.####',
      '.....####..####','....####...####','...####....####','..####.....####',
      '.####......####','####.......####','###############','###############',
      '..........####.','..........####.','..........####.','..........####.',
      '.........#####.'
    ],
    '5': [
      '....#########..','...###########.','...##########..','...##########..',
      '...###.........','...###.........','...###.........','...########....',
      '...##########..','...#....######.','.........#####.','.........#####.',
      '.........#####.','.........####..','.......######..','.###########...',
      '.#########.....'
    ],
    '6': [
      '..........##...','........#####..','......#####....','....#####......',
      '...#####.......','..#####........','.#####.........','.###########...',
      '.############..','#####....#####.','#####.....####.','#####.....#####',
      '.####.....####.','.#####....####.','.#####...#####.','..###########..',
      '....#######....'
    ],
    '7': [
      '..############.','.#############.','.#############.','.############..',
      '..........###..','.........###...','........###....','.......####....',
      '.......###.....','......###......','.....####......','.....####......',
      '....####.......','....####.......','...#####.......','...####........',
      '...####........'
    ],
    '8': [
      '...............','...#########...','..###########..','.#####...#####.',
      '.####.....####.','.#####....####.','.######..####..','..##########...',
      '..##########...','...###########.','.####..#######.','.####....######',
      '#####.....#####','#####.....#####','.####.....####.','.############..',
      '...#########...'
    ],
    '9': [
      '...########....','..##########...','.#####...####..','.####....#####.',
      '#####.....####.','#####.....####.','.####.....#####','.#####....####.',
      '..############.','...###########.','.........####..','........#####..',
      '.......#####...','......#####....','....#####......','.#######.......',
      '.####..........'
    ]
  };

  const replacementMasks = `const DIGIT_MASKS=${JSON.stringify(DIGIT_MASKS)};const params=`;

  function replaceOnce(source, pattern, replacement, label) {
    const next = source.replace(pattern, replacement);
    if (next === source) throw new Error(`Counter Field transform failed: ${label}`);
    return next;
  }

  async function load() {
    const response = await fetch('./counter-field.js?v=20260803e', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Counter Field base script failed: ${response.status}`);
    let source = await response.text();

    source = replaceOnce(
      source,
      /const DIGIT_COLS=\d+;const DIGIT_ROWS=\d+;const CELL_X=\d+;const CELL_Y=\d+;const DIGIT_W=\(DIGIT_COLS-1\)\*CELL_X;const DIGIT_H=\(DIGIT_ROWS-1\)\*CELL_Y;const DIGIT_GAP=CELL_X\*\d+;const COLON_W=CELL_X;const PAIR_GAP=\d+;/,
      'const DIGIT_COLS=15;const DIGIT_ROWS=17;const CELL_X=13;const CELL_Y=15;const DIGIT_W=(DIGIT_COLS-1)*CELL_X;const DIGIT_H=(DIGIT_ROWS-1)*CELL_Y;const DIGIT_GAP=CELL_X*2;const COLON_COLS=3;const COLON_W=(COLON_COLS-1)*CELL_X;const PAIR_GAP=52;',
      'matrix geometry'
    );

    source = replaceOnce(
      source,
      /const DIGIT_MASKS=\{.*?\};const params=/,
      replacementMasks,
      'digit masks'
    );

    source = replaceOnce(
      source,
      /let atlas=null;let lastFrameAt=0;let lastClockString='';let lastAnnouncedSecond=-1;/,
      "let atlas=null;let lastFrameAt=0;let lastClockString='';let lastAnnouncedSecond=-1;let lastColonSecond=-1;",
      'colon second state'
    );

    source = replaceOnce(
      source,
      /jitter:\(random\(\)-0\.5\)\*0\.8/g,
      'jitter:(random()-0.5)*0.65',
      'cell jitter'
    );

    source = replaceOnce(
      source,
      /\[3,8\]\.forEach\(\(startRow\)=>\{for\(let rowOffset=0;rowOffset<2;rowOffset\+\+\)\{for\(let colOffset=0;colOffset<2;colOffset\+\+\)\{/,
      '[4,10].forEach((startRow)=>{for(let rowOffset=0;rowOffset<3;rowOffset++){for(let colOffset=0;colOffset<3;colOffset++){',
      'colon matrix'
    );

    source = replaceOnce(
      source,
      /cells\.push\(\{x:item\.x\+colOffset\*CELL_X,y:CLOCK_Y\+\(startRow\+rowOffset\)\*CELL_Y,phase:\(startRow\+rowOffset\+colOffset\)\*0\.7\}\);/,
      'cells.push({x:item.x+colOffset*CELL_X,y:CLOCK_Y+(startRow+rowOffset)*CELL_Y,rowOffset,colOffset,value:0,targetValue:0,settleAt:-Infinity,phase:(startRow+rowOffset+colOffset)*0.7});',
      'colon cell state'
    );

    source = replaceOnce(
      source,
      /const cellW=Math\.ceil\(20\*scale\);const cellH=Math\.ceil\(25\*scale\);/,
      'const cellW=Math.ceil(17*scale);const cellH=Math.ceil(20*scale);',
      'counter atlas size'
    );

    source = replaceOnce(
      source,
      /atlasContext\.font=`\$\{Math\.round\(17\*scale\)\}px \"MP-B\", Georgia, serif`;/,
      'atlasContext.font=`${Math.round(14*scale)}px "MP-B", Georgia, serif`;',
      'counter font size'
    );

    source = replaceOnce(
      source,
      /cell\.nextAmbientChange=nowPerf\+560\+\(cell\.row\*47\+cell\.col\*83\)%720;\}\}for\(const cell of backgroundCells\)\{/,
      'cell.nextAmbientChange=nowPerf+560+(cell.row*47+cell.col*83)%720;}}if(state.second!==lastColonSecond){const targetValue=state.second%10;const firstColonFrame=lastColonSecond<0;lastColonSecond=state.second;const transitionStart=state.logicalMs-state.millisecond;for(const cell of colonCells){if(firstColonFrame)cell.value=(targetValue+9)%10;cell.targetValue=targetValue;const rank=cell.rowOffset*3+cell.colOffset;cell.settleAt=noMotion?transitionStart:transitionStart+rank*(520/8);}}for(const cell of colonCells){if(state.logicalMs>=cell.settleAt)cell.value=cell.targetValue;}for(const cell of backgroundCells){',
      'colon number transition'
    );

    source = source.replace(',0,0.08,0.86);continue;', ',0,0.075,0.78);continue;');
    source = source.replace(
      'const alpha=settled?0.96:0.82;const size=settled?1.03:0.98;',
      'const alpha=settled?0.97:0.82;const size=settled?0.98:0.94;'
    );

    source = replaceOnce(
      source,
      /const colonPulse=noMotion\?1:0\.94\+Math\.sin\(nowPerf\*0\.008\)\*0\.04;for\(const cell of colonCells\)\{drawAtlasDigit\(0,cell\.x,cell\.y,2,0\.88,colonPulse\);\}/,
      'const colonPulse=noMotion?1:0.96+Math.sin(nowPerf*0.008)*0.025;for(const cell of colonCells){const settledAge=state.logicalMs-cell.settleAt;const colonSize=settledAge>=0&&settledAge<140?1.04:0.94*colonPulse;drawAtlasDigit(cell.value,cell.x,cell.y,2,0.9,colonSize);}',
      'animated colon rendering'
    );

    source = source.replace(
      'digitHeight:DIGIT_H};',
      'digitHeight:DIGIT_H,colonValues:colonCells.map((cell)=>cell.value)};'
    );

    if (!source.includes('const DIGIT_COLS=15;const DIGIT_ROWS=17;')) {
      throw new Error('Counter Field transform validation failed');
    }
    if (!source.includes('lastColonSecond=-1') || !source.includes('rank*(520/8)')) {
      throw new Error('Counter Field colon animation validation failed');
    }

    const blob = new Blob([source], { type: 'text/javascript' });
    const script = document.createElement('script');
    const objectUrl = URL.createObjectURL(blob);
    script.src = objectUrl;
    script.onload = () => URL.revokeObjectURL(objectUrl);
    script.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      throw new Error('Counter Field transformed script failed to load');
    };
    document.head.appendChild(script);
  }

  load().catch((error) => {
    console.error(error);
    const fallback = document.createElement('script');
    fallback.src = './counter-field.js?v=20260803e';
    document.head.appendChild(fallback);
  });
})();
