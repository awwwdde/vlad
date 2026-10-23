type Point = readonly [number, number]
type Polygon = readonly Point[]

// The first frame is the exact 8px pixel grid of the supplied reference.
const REFERENCE = [
  "                        ##       ",
  "                       # #       ",
  "                      #  #       ",
  " ##                   #  ##      ",
  " # ###               #     #     ",
  " #    #             #       #    ",
  "  ##   #            #        #   ",
  "    #   ######     #         #   ",
  "     #        ###  #        # #  ",
  "      #          ###        #  # ",
  "     #                         # ",
  "     #                  ###    # ",
  "     #                       ##  ",
  "     #                      #    ",
  "    #                    ###     ",
  "    #                      #     ",
  "   #                       #     ",
  "   #      #####        ##   #    ",
  "  #      # #   ##    ##  #   #   ",
  " #     ##  #     ####  #  #   #  ",
  "#    ##   #             #  #   # ",
  "#  ##   ##               ## #### ",
  " ##  ###                         "
]
const HIND: readonly Polygon[] = [
  [[4,16],[1,19],[0,21],[2,22],[6,19],[10,17]],
  [[4,16],[4,19],[6,22],[9,22],[8,20],[10,17]],
  [[4,16],[7,18],[12,18],[13,16],[10,16],[9,15]],
  [[4,16],[8,17],[12,20],[15,20],[14,18],[10,16]],
]
const FORE: readonly Polygon[] = [
  [[27,16],[29,18],[32,21],[29,21],[26,19],[24,17]],
  [[27,16],[27,19],[24,22],[21,22],[22,20],[24,17]],
  [[27,16],[25,18],[21,18],[20,16],[23,16],[25,15]],
  [[27,16],[30,17],[32,18],[31,20],[28,19],[25,17]],
]

function frameAt(frame: number): string[] {
  if (frame === 0) return [...REFERENCE.map(row => '  '+row+'  '), ' '.repeat(37), ' '.repeat(37)]
  const grid = Array.from({length: 25}, () => Array<string>(37).fill(' '))
  const dot = (x: number, y: number, char = '#') => { if (y >= 0 && y < 25 && x >= 0 && x < 33) grid[y][x + 2] = char }
  const line = ([ax,ay]: Point, [bx,by]: Point, char: string) => {
    let x = Math.round(ax), y = Math.round(ay)
    const endX = Math.round(bx), endY = Math.round(by), dx = Math.abs(endX-x), dy = -Math.abs(endY-y), sx=x<endX?1:-1, sy=y<endY?1:-1
    let error=dx+dy
    for (;;) { dot(x,y,char); if(x===endX&&y===endY) break; const e=error*2; if(e>=dy){error+=dy;x+=sx} if(e<=dx){error+=dx;y+=sy} }
  }
  const polygon = (points: Polygon, char: string) => points.forEach((point,i) => line(point,points[(i+1)%points.length],char))
  const pose = (poses: readonly Polygon[], phase: number, offsetX=0, offsetY=0): Point[] => {
    const n = phase/2, from = Math.floor(n)%4, t=n-Math.floor(n)
    return poses[from].map(([x,y],i) => [x+(poses[(from+1)%4][i][0]-x)*t+offsetX,y+(poses[(from+1)%4][i][1]-y)*t+offsetY] as Point)
  }
  // Far paws are quieter and a quarter-cycle behind the near pair.
  polygon(pose(HIND,(frame+2)%8,2,-1),'+')
  polygon(pose(FORE,(frame+2)%8,-2,-1),'+')
  polygon(pose(HIND,frame),'#')
  polygon(pose(FORE,frame),'#')
  const body: Polygon = [[6,9],[5,10],[5,13],[4,14],[4,15],[3,17],[10,17],[14,17],[16,18],[17,19],[20,19],[22,18],[24,17],[27,17],[27,15],[25,14],[28,14],[29,12],[31,11],[31,10],[30,9],[29,8],[29,7],[28,6],[27,5],[27,4],[26,3],[25,2],[25,0],[24,0],[23,1],[22,3],[21,4],[20,6],[19,8],[18,9],[17,9],[16,8],[14,8],[13,7],[8,7]]
  // The reference is hollow, but limbs still disappear behind the torso.
  for(let y=0;y<25;y++) for(let x=0;x<33;x++) {
    let inside=false
    for(let i=0,j=body.length-1;i<body.length;j=i++) {
      const [xi,yi]=body[i], [xj,yj]=body[j]
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside
    }
    if(inside) grid[y][x+2]=' '
  }
  REFERENCE.forEach((row,y) => Array.from(row).forEach((char,x) => {
    const tail = y>=3&&y<=8&&x<=8
    const belly = y===17&&x>=10&&x<=14 || y===18&&(x===15||x===16||x===21||x===22) || y===19&&x>=17&&x<=20 || y===17&&(x===23||x===24)
    if(char==='#'&&!tail&&(y<17||belly)) dot(x,y)
  }))
  const tail: Polygon = [[6,9],[5,8],[4,7],[2,6],[1,5],[1,3],[2,3],[3,4],[5,4],[6,5],[7,6],[8,7]]
  const a = [0,.06,.12,.18,.12,.02,-.08,-.12][frame]
  polygon(tail.map(([x,y])=>[6+(x-6)*Math.cos(a)-(y-9)*Math.sin(a),9+(x-6)*Math.sin(a)+(y-9)*Math.cos(a)] as Point),'#')
  return grid.map(row=>row.join(''))
}

export const CAT_FRAMES = Array.from({length:8},(_,i)=>frameAt(i))
