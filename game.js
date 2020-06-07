
class Game {
    constructor(ctx, size = 10, piececolors=['black','red'], board=null) {
        this.ctx = ctx;
        this.piececolors = piececolors;

        //making it square -> chooses the smaller side as side of square
        if(this.ctx.canvas.height < this.ctx.canvas.width)
            this.ctx.canvas.width = this.ctx.canvas.height;
        else this.ctx.canvas.height = this.ctx.canvas.width;
        
        //`size`x`size` board
        this.size = size;

        if(board != null) {
            if( board.length != this.size || board[0].length != this.size ) {
                console.error("Invalid board provided for the given size.\n");
                return null;
            }
            this.board = board;
        } else {

            //create board and put pieces on board.
            this.board = new  Array(this.size).fill(0).map(()=>(new Array(this.size).fill(0)));
            for(var i=0;i<3;i++) {
                for(var j=i%2;j<this.size;j+=2) {
                    this.board[i][j]=1; //piece that start above
                }
                for(var j=(i+1)%2;j<this.size;j+=2) {
                    this.board[this.size-i-1][j]=2; //pieces that start below
                }
            }
            //this.board[0][0] = 1;
            //this.board[3][this.size -1] = 2;
            //var str = "0,0,0,0,0,0,1,0,1,0,0,1,0,0,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,2,0,0,2,0,0,0,0,0,0,0,0,2,0,2,0,2,0,2,0,0,2,0,3,0,2,0,0,0,2,0,0,0,0,0,0,2,0,2,0,0";
            //var arr = str.split(',').map((x)=>Number(x));
            //this.board = [];
            //while(arr.length) this.board.push(arr.splice(0,10));
        }

        this.hasai = true;

        this.possibleMoves = null;
        this.intermeds = [];

        this.piecesn = [0, 15,15];

        this.turn = 1;
        this.total_moves = 0;
        this.mandatory_capture = true;
        this.showPossibleMoves = true;

        this.crownimg = document.createElement('img')
        this.crownimg.src = 'crown.png';
    }

    /**
     * This function will play one turn of the player whose turn it is.
     */
    /*playTurn() {
        var board = copy present board; //or maybe do and undo moves on the actual board?
        var possibleMoves = this.findPossibleMoves(board, player);
        for (move in possibleMoves) {
            this.doMove(move, board);
            
            movescore = this.minmaxscore(board, player);
            if(maxscore < movescore) {
                bestmove = move;
                maxscore = movescore;
            }
        }

        this.doMove(bestmove, this.board);
    }*/

    /**
     * @brief checks if a coordinate is valid(inside the board)
     * 
     * @param {Object {i,j}} pos Position to check
     * 
     * @returns true if coords are inside the board, false otherwise.
     */
    isInside(pos) {
        return (pos.i < this.board.length && pos.i >= 0 && pos.j >= 0 && pos.j < this.board[0].length);
    }

    findPossibleMoves(player=this.turn, board=this.board) {
        var moves = [];
        for(var i=0;i<this.size;i++) {
            for(var j=0;j<this.size;j++) {
                if(board[i][j]==player) {
                    var pmoves = this.findPossibleMovesFor({i:i,j:j});
                    if(pmoves.length > 0)
                        moves.push({piece: {i:i,j:j}, moves:pmoves});
                }
            }
        }
        return moves;
    }

    /**
     * @brief Find possible moves for a piece
     * 
     * @param {Object {i,j}} piece Piece
     * 
     * @returns array containing the possible moves.
     */
    findPossibleMovesFor(piece) {

        var moves = [];
        var cp = this.board[piece.i][piece.j];

        var captree = this.getCaptureTree(piece);
        if(captree.length != 0) {
            moves.push({type:'capture',move:captree});
            if(this.mandatory_capture)
                return moves;
        } else if(this.mandatory_capture) {
            for(var i=0;i<this.size;i++)
                for(var j=0;j<this.size;j++)
                    if(this.board[i][j] != 0 && cp%2 == this.board[i][j]%2) {
                        if(this.canCapture({i:i,j:j})) {
                            return [];
                        }
                    }
        }

        var i=piece.i, j=piece.j;
        var adjs=[];
        adjs.push({j:j-1},{j:j+1});
        var pb = this.board[i][j];
        if(pb == 1) {//the pieces that go from top to bottom
            adjs[0].i = adjs[1].i = i+1;
        } else if(pb==2) //only bottom to top
            adjs[0].i = adjs[1].i = i-1;
        else if(pb >= 3) { //can move in any direction
            adjs[0].i = adjs[1].i = i-1;
            adjs.push({j:j-1,i:i+1},{j:j+1,i:i+1});
        }
        
        for(var it=0;it<adjs.length;it++) {
            if(!this.isInside(adjs[it]))
                continue;
            var p = this.board[adjs[it].i][adjs[it].j];
            if(p == 0) { // empty
                moves.push({type:'jump',move:adjs[it]})
            }
        }


        return moves;
    }

    /**
     * @brief just checks if a piece can capture any other piece.[for normal piece]
     * 
     * @param {Object {i,j}} piece 
     * 
     * @returns if capturing move is possible by `piece` returns true, returns false otherwise.
     */
    canCapture(piece) {
        var pobed = this.board[piece.i][piece.j];
        if(pobed == 0)
            return false;
        //var opps = Number(!(pobed%2)); //opposite parity
        var diri = -(( (pobed-1)%2 )*2-1);
        var adjl = {i:piece.i+diri, j:piece.j-1}, adjr = {i:piece.i+diri, j:piece.j+1};
        var adjs = [adjl, adjr];
        if(pobed >= 3) adjs = adjs.concat([{i:piece.i-diri,j:adjl.j},{i:piece.i-diri, j:adjr.j}]);

        for(var i=0;i<adjs.length;i++) {
            if(this.isInside(adjs[i]) && this.board[adjs[i].i][adjs[i].j]!=0 
            && this.board[adjs[i].i][adjs[i].j]%2 != pobed%2) {
                var jspace = {i: adjs[i].i - ( Math.floor(i/2)*2-1 )*diri, j:adjs[i].j+( (i%2)*2-1 )}; //jump space
                if(this.isInside(jspace) && this.board[jspace.i][jspace.j]==0)
                    return true;
            }
        }
        return false;
    }

    /**
     * @brief creates a tree which contains possible captures from position i,j for a normal piece
     * 
     * @param {i,j} pos 
     * @param {i,j} tree 
     * 
     * @returns the capture tree.
     */
    getCaptureTree(pos, pp = null) {
        var tree = [];
        var cpb = pp||this.board[pos.i][pos.j];
        var diri = 1-((cpb-1)%2)*2;
        var adjl = {i:pos.i+diri, j:pos.j -1};
        var adjr = {i:pos.i+diri, j:pos.j +1};
        var adjs = [adjl, adjr];
        if(cpb >= 3) adjs = adjs.concat([{i:pos.i-diri, j:adjl.j},{i:pos.i-diri,j:adjr.j}])

        for(var i=0;i<adjs.length;i++) {
            if(!this.isInside(adjs[i])) {
                continue;
            }
            var p = this.board[adjs[i].i][adjs[i].j];
            var adjp = {i:adjs[i].i-(Math.floor(i/2)*2-1)*diri, j: adjs[i].j+( (i%2)*2 -1)};
            if(p != 0 && p%2 != cpb%2 && this.isInside(adjp) && this.board[adjp.i][adjp.j] == 0) {
                var oldpiece = this.board[adjs[i].i][adjs[i].j];
                this.board[adjs[i].i][adjs[i].j] = 0; //temporarily make it empty
                tree.push({tokill:adjs[i], jumpat:adjp, nextcap:this.getCaptureTree(adjp, cpb)});
                this.board[adjs[i].i][adjs[i].j] = oldpiece;
            }
        }

        return tree;
    }

    /**
     * 
     * @brief Move piece to position fpos (if possible)
     * 
     * @param {Object {i,j}} piece Coordinate of a piece that's to be moved
     * @param {Object {i,j}} fpos Coordinate of the final position of piece
     * 
     * @returns
     */
    makeJump(piece, fpos) {

        var pp = this.board[piece.i][piece.j];

        if(pp <= 2)
        if( (pp == 1 && fpos.i == this.size-1)
        ||  (pp == 2 && fpos.i == 0)) {//reached last row
            pp += 2; //promote to king
        }

        this.board[fpos.i][fpos.j] = pp; //piece moved
        this.board[piece.i][piece.j] = 0; //set position empty
    }

    /**
     * @brief checks if piece can be moved to fpos
     * 
     * @param {Object {i,j}} piece Coordinate of a piece that's to be moved
     * @param {Object {i,j}} fpos Coordinate of the final position of piece
     * 
     * @returns true if piece can jump to fpos, false otherwise
     */
    isJumpabble(piece, fpos) {
        if(this.turn != this.board[piece.i][piece.j]) //it's not piece's turn
            return false;
        if(this.board[fpos.i][fpos.j] != 0) //final position is not empty
            return false;
        
        if(piece.j == fpos.j-1 || piece.j == fpos.j+1)
            if(( this.turn == 2 && piece.i == fpos.i+1)||(this.turn == 1 && piece.i == fpos.i-1)) {

                return true; //only return true if fpos is valid for the piece
            }
        
        return false;
    }

    /**
     * 
     * 
     * @param Array[{tokill, jumpat, nextcap}] captrees 
     * @param {i,j} endm 
     * 
     * @returns the number of pieces captured
     */
    makeCapture(captrees, endm) {
        var stack = [];
        var stack2 = []; //kill stack
        stack = stack.concat(captrees);
        while(stack.length != 0) {
            var top = stack.pop();
            if(this.intermeds.some((el)=>(el.i==top.jumpat.i && el.j==top.jumpat.j))) {
                stack = stack.concat(top.nextcap);
                stack2.push(top);
            } else if(endm.i == top.jumpat.i && endm.j == top.jumpat.j) { //reached the last position
                
                if(top.nextcap.length > 0) {
                    console.log(top.nextcap);
                    stack = stack.concat(top.nextcap);
                    stack2.push(top);
                    continue;
                }
                
                this.board[top.tokill.i][top.tokill.j] = 0; //set empty;
                var kills = 1 + stack2.length;
                while(stack2.length != 0) {
                    var tokill = stack2.pop().tokill;
                    this.board[tokill.i][tokill.j] = 0; //set empty
                }
                var piecem = this.board[this.selected.i][this.selected.j];
                if(piecem <= 2) {
                    if((endm.i == this.size-1 && piecem == 1)
                        || (endm.i == 0 && piecem == 2)) {// piece reached last row
                        piecem += 2; //promote to king
                    }
                }
                this.board[this.selected.i][this.selected.j]=0;//selected element moved
                this.board[endm.i][endm.j]=piecem;

                return kills;
            }
        }
        return 0;
    }

    /**
     * 
     * @brief performs the click operation on a specific place on the board and takes
     *          appropriate action
     * 
     * @param {Number} x x-coordinated taken from left of canvas
     * @param {Number} y y-coordinate taken from top of canvas
     * 
     */
    handleClick(x, y) {
        //tile size
        var ts = this.ctx.canvas.width/this.size;
        //get board coords from click coords
        var i = Math.floor(y/ts), j = Math.floor(x/ts);

        if(this.board[i][j] != 0) {
            //set `selected` based on turn
            if(this.turn%2 == this.board[i][j]%2) {
                this.selected = {i:i, j:j};
                var possible = this.findPossibleMovesFor(this.selected);
                this.possibleMoves = {possibles: possible,pboard:{ends:[], mids:[]}};
                possible.forEach( (elem)=> {
                    if(elem.type=='jump')
                        this.possibleMoves.pboard.ends.push(elem.move) //set possible
                    else if(elem.type == 'capture') {
                        var stack=[];
                        stack = stack.concat(elem.move);
                        while(stack.length != 0) {
                            var top = stack.pop();
                            if(top.nextcap.length != 0)
                                this.possibleMoves.pboard.mids.push(top.jumpat);
                            else
                                this.possibleMoves.pboard.ends.push(top.jumpat);
                            stack = stack.concat(top.nextcap);
                        }
                    }
                });
                this.drawBoard();

            }
        } else { //clicked on blank space - so either make a move or deselect.

            var isintermed=false;
            if(this.selected) {

                if(this.possibleMoves.possibles.some((el)=>el.type=='jump'
                    && el.move.i == i && el.move.j == j)) { //a simple jump
                    this.makeJump(this.selected, {i,j});
                    this.nextTurn();
                } else if(this.possibleMoves.pboard.ends.some((el)=>(el.i==i && el.j==j))) {//capturing move maybe
                    
                    var captrees = this.possibleMoves.possibles[0].move; //first move will be capturing - ensured by findPossibleMoves function

                    var endm = {i:i,j:j};
                    if(captrees) {
                        var kills = this.makeCapture(captrees, endm); //attempts capture move

                        if(kills > 0) {
                            this.nextTurn();
                            this.piecesn[this.turn] -= kills;

                            if(this.hasLost(this.turn)) {
                                this.gameEndedMessage();
                                this.turn = -1;
                            }
                        }
                    }
                } else if(this.possibleMoves.pboard.mids.some((el)=>(el.i==i && el.j==j))) { //clicked on intermediate move while capture
                    this.intermeds.push({i:i,j:j});
                    isintermed = true;
                }
            }

            if(!isintermed) {
                this.selected = null;
                this.possibleMoves = null;
                this.intermeds = [];
            }
            this.drawBoard();
        }
    }

    nextTurn() {
        this.turn = (this.turn == 1)?2:1;
        this.total_moves++;
    }

    hasLost(player) {
        return this.piecesn[player]==0;
    }

    hasWon(player) {
        return this.piecesn[(player==1)?2:1]==0;
    }

    resizeCanvas(width, height) {
        if(height < width)
            ctx.canvas.width = ctx.canvas.height = height;
        else ctx.canvas.width = ctx.canvas.height = width;

        //this.selected = null;
        this.drawBoard();
    }

    /**
     * this function must be overriden so that 
     * the message can be shown on the UI instead of console.log
     */
    gameEndedMessage() {
        if(this.hasWon(1)) {
            return("Black won");
        } else if(this.hasWon(2))
            return("Red won");
    }

    drawBoard() {
        var ctx = this.ctx;
        var width = ctx.canvas.width;
        //tile size
        var ts = width/this.size;

        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0, width, width);
        for(var i=0;i<this.size;i++) {
            for(var j=0;j<this.size;j++) {

                //draw board tile
                if( ((i+j)%2) == 0 ) {
                    ctx.fillStyle = '#8b4513'; //brown
                } else ctx.fillStyle = '#fff'; //white

                ctx.fillRect(j*ts, i*ts, ts, ts);

                //draw piece
                if(this.board[i][j]>=1 && this.board[i][j]<=4) {
                    ctx.fillStyle = this.piececolors[(this.board[i][j]+1)%2];

                    ctx.beginPath();
                    ctx.arc( (2*j+1)*ts/2, (2*i+1)*ts/2, ts*2/5, 0, 2*Math.PI);
                    ctx.fill();
                    if(this.board[i][j]>=3) {//add crown
                        ctx.drawImage(this.crownimg, j*ts, i*ts, ts, ts);
                    }
                } else if(this.selected) {
                    if(this.showPossibleMoves) {
                        ctx.fillStyle = '#0f0';
                        this.possibleMoves.pboard.ends.forEach((pos)=>(
                            ctx.fillRect(pos.j*ts+ts/10, pos.i*ts+ts/10, ts*4/5, ts*4/5)
                        ));
                        this.possibleMoves.pboard.mids.forEach((pos)=>{
                            ctx.fillStyle = '#0f0';
                            ctx.beginPath();
                            ctx.arc((2*pos.j+1)*ts/2, (2*pos.i+1)*ts/2, ts*2/5, 0, 2*Math.PI);
                            ctx.fill();
                            if(this.intermeds.some((el)=>el.i==pos.i && el.j == pos.j)) {
                                ctx.fillStyle = '#ff0';
                                ctx.arc((2*pos.j+1)*ts/2, (2*pos.i+1)*ts/2, ts/10 , 0, 2*Math.PI)
                                ctx.fill();
                            }
                        });
                    }
                }
            }
        }
        //draw over selected piece
        if(this.selected) {
            var i = this.selected.i, j = this.selected.j;
            ctx.strokeStyle = '#0ff';
            ctx.beginPath();
            ctx.arc( (2*j+1)*ts/2, (2*i+1)*ts/2, ts*2/5, 0, 2*Math.PI);
            ctx.stroke();
        }
    }
};