// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const PATROL_POINTS = [
  { x: 1, y: 1 },
  { x: 26, y: 1 },
  { x: 26, y: 29 },
  { x: 1, y: 29 },
];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      releaseAt: g.releaseAt,
      active: g.releaseAt === 0,
      patrolIndex: 0,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function normalizeGhostCell( x, y, width ) {
  if ( y === TUNNEL_ROW ) {
    if ( x < 0 ) x += width;
    else if ( x >= width ) x -= width;
  }
  return { x, y };
}

function ghostNeighbors( grid, x, y ) {
  const width = grid[ 0 ].length;
  return Object.keys( DIRS ).reduce( ( neighbors, dir ) => {
    if ( !canMove( grid, x, y, dir, 'ghost' ) ) return neighbors;
    const d = DIRS[ dir ];
    const cell = normalizeGhostCell( x + d.x, y + d.y, width );
    neighbors.push( { ...cell, dir } );
    return neighbors;
  }, [] );
}

function cellKey( x, y ) {
  return x + ',' + y;
}

// Distancias de ruta más corta para todas las celdas alcanzables desde el inicio.
function ghostDistances( game, startX, startY ) {
  const start = normalizeGhostCell( startX, startY, game.grid[ 0 ].length );
  const distances = new Map( [ [ cellKey( start.x, start.y ), 0 ] ] );
  const queue = [ start ];
  let head = 0;

  while ( head < queue.length ) {
    const cell = queue[ head++ ];
    const distance = distances.get( cellKey( cell.x, cell.y ) );
    for ( const neighbor of ghostNeighbors( game.grid, cell.x, cell.y ) ) {
      const key = cellKey( neighbor.x, neighbor.y );
      if ( distances.has( key ) ) continue;
      distances.set( key, distance + 1 );
      queue.push( { x: neighbor.x, y: neighbor.y } );
    }
  }
  return distances;
}

function legalGhostDirections( game, g ) {
  return Object.keys( DIRS ).filter(
    ( dir ) => canMove( game.grid, g.x, g.y, dir, 'ghost' )
  );
}

function chooseDirectionToward( game, g, targetX, targetY ) {
  if ( g.x === targetX && g.y === targetY ) return;

  const distances = ghostDistances( game, targetX, targetY );
  const choices = legalGhostDirections( game, g );
  if ( !choices.length ) return;

  let best = choices.includes( g.dir ) ? g.dir : choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const next = normalizeGhostCell( g.x + d.x, g.y + d.y, game.grid[ 0 ].length );
    const dist = distances.get( cellKey( next.x, next.y ) );
    if ( dist !== undefined && dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function nearestGhostCell( grid, x, y ) {
  let nearest = null;
  let bestDist = Infinity;
  for ( let cy = 0; cy < grid.length; cy++ ) {
    for ( let cx = 0; cx < grid[ 0 ].length; cx++ ) {
      if ( isWall( grid, cx, cy, 'ghost' ) ) continue;
      const dist = Math.abs( cx - x ) + Math.abs( cy - y );
      if ( dist < bestDist ) {
        bestDist = dist;
        nearest = { x: cx, y: cy };
      }
    }
  }
  return nearest;
}

function ambusherTarget( game ) {
  const p = game.pacman;
  const d = DIRS[ p.dir ];
  const target = normalizeGhostCell(
    Math.round( p.x ) + d.x * 4,
    Math.round( p.y ) + d.y * 4,
    game.grid[ 0 ].length
  );
  if ( !isWall( game.grid, target.x, target.y, 'ghost' ) ) return target;
  return nearestGhostCell( game.grid, target.x, target.y );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  if ( g.kind === 'hunter' ) {
    chooseDirectionToward( game, g, px, py );
  } else if ( g.kind === 'ambusher' ) {
    const target = ambusherTarget( game );
    chooseDirectionToward( game, g, target.x, target.y );
  } else if ( g.kind === 'patrol' ) {
    let target = PATROL_POINTS[ g.patrolIndex ];
    if ( g.x === target.x && g.y === target.y ) {
      g.patrolIndex = ( g.patrolIndex + 1 ) % PATROL_POINTS.length;
      target = PATROL_POINTS[ g.patrolIndex ];
    }
    chooseDirectionToward( game, g, target.x, target.y );
  } else if ( g.kind === 'evasive' ) {
    const distances = ghostDistances( game, px, py );
    const currentDistance = distances.get( cellKey( g.x, g.y ) );
    if ( currentDistance !== undefined && currentDistance <= 6 ) {
      const choices = legalGhostDirections( game, g );
      let best = choices.includes( g.dir ) ? g.dir : choices[ 0 ];
      let bestDist = -Infinity;
      for ( const dir of choices ) {
        const d = DIRS[ dir ];
        const next = normalizeGhostCell( g.x + d.x, g.y + d.y, grid[ 0 ].length );
        const dist = distances.get( cellKey( next.x, next.y ) );
        const score = dist === undefined ? Infinity : dist;
        if ( score > bestDist ) {
          bestDist = score;
          best = dir;
        }
      }
      if ( best ) g.dir = best;
    } else {
      chooseDirectionToward( game, g, px, py );
    }
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.patrolIndex = 0;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game, elapsedSeconds ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => {
    if ( !g.active && elapsedSeconds >= g.releaseAt ) g.active = true;
    if ( g.active ) moveGhost( game, g );
  } );

  for ( const g of game.ghosts ) {
    if ( g.active && collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
