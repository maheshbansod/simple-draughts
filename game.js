
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
        }

        this.possibleMoves = null;
        this.intermeds = [];

        this.turn = 2;
        this.total_moves = 0;
        this.mandatory_capture = true;
        this.showPossibleMoves = true;
    }

    /*play() {
        maybe make it using a game loop or sthing in the future?
        this.drawBoard();
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

    /**
     * @brief Find possible moves for a piece
     * 
     * @param {Object {i,j}} piece Piece
     * 
     * @returns array containing the possible moves.
     */
    findPossibleMovesFor(piece) {

        var moves = [];

        var captree = this.getCaptureTree(piece);
        if(captree.length != 0) {
            moves.push({type:'capture',move:captree});
            if(this.mandatory_capture)
                return moves;
        } else if(this.mandatory_capture) {
            for(var i=0;i<this.size;i++)
                for(var j=0;j<this.size;j++)
                    if(this.turn == this.board[i][j]) {
                        if(this.canCapture({i:i,j:j})) {
                            return [];
                        }
                    }
        }

        var i=piece.i, j=piece.j;
        var adjs=[];
        adjs.push({j:j-1},{j:j+1})
        if(this.turn == 1) {//the pieces that go from top to bottom
            adjs[0].i = adjs[1].i = i+1;
        } else adjs[0].i = adjs[1].i = i-1;
        
        for(var it=0;it<2;it++) {
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
        var opps = Number(!(pobed%2));
        var diri = -((pobed-1)*2-1);
        var adjl = {i:piece.i+diri, j:piece.j-1}, adjr = {i:piece.i+diri, j:piece.j+1};
        if(this.isInside(adjl) && this.board[adjl.i][adjl.j]!=0 &&this.board[adjl.i][adjl.j]%2 == opps) {
            var jspace = {i:adjl.i+diri, j:adjl.j-1};
            if(this.isInside(jspace) && this.board[jspace.i][jspace.j]==0)
                return true;
        }
        if(this.isInside(adjr) && this.board[adjr.i][adjr.j]!=0 && this.board[adjr.i][adjr.j]%2 == opps) {
            var jspace = {i:adjr.i+diri, j:adjr.j+1};
            if(this.isInside(jspace) && this.board[jspace.i][jspace.j]==0)
                return true;
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
    getCaptureTree(pos, tree=[]) {
        var diri = 1-(this.turn-1)*2;
        var adjl = {i:pos.i+diri, j:pos.j -1};
        var adjr = {i:pos.i+diri, j:pos.j +1};
        if(this.isInside(adjl)) {
            var p = this.board[adjl.i][adjl.j];
            var adjp = {i:adjl.i+diri, j:adjl.j-1};
            if(p != 0 && p!=this.turn && this.isInside(adjp) && this.board[adjp.i][adjp.j]==0) {
                tree.push({tokill:adjl, jumpat:adjp,nextcap:this.getCaptureTree(adjp)});
            }
        }
        if(this.isInside(adjr)) {
            var p = this.board[adjr.i][adjr.j];
            var adjp = {i:adjr.i+diri, j:adjr.j+1};
            if(p != 0 && p!=this.turn && this.isInside(adjp) && this.board[adjp.i][adjp.j]==0) {
                tree.push({tokill:adjr, jumpat:adjp,nextcap:this.getCaptureTree(adjp)});
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
        this.board[fpos.i][fpos.j] = this.turn; //piece moved
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

    makeCapture(captrees, endm) {
        var stack = [];
        stack = stack.concat(captrees);
        while(stack.length != 0) {
            var top = stack.pop();
            if(this.intermeds.some((el)=>(el.i==top.jumpat.i && el.j==top.jumpat.j))) {
                stack = stack.concat(top.nextcap);
            } else if(endm.i == top.jumpat.i && endm.j == top.jumpat.j) { //reached the last position
                this.board[top.tokill.i][top.tokill.j] = 0; //set empty;
                while(stack.length != 0) {
                    var tokill = stack.pop().tokill;
                    this.board[tokill.i][tokill.j] = 0; //set empty
                }
                this.board[this.selected.i][this.selected.j]=0;//selected element moved
                this.board[endm.i][endm.j]=this.turn;

                this.nextTurn();
                break;
            }
        }
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
            if(this.turn == this.board[i][j]) {
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
                //TODO: check if obligatory capture setting

                if(this.possibleMoves.possibles.some((el)=>el.type=='jump'
                    && el.move.i == i && el.move.j == j)) { //a simple jump
                    this.makeJump(this.selected, {i,j});
                    this.nextTurn();
                } else if(this.possibleMoves.pboard.ends.some((el)=>(el.i==i && el.j==j))) {//capturing move maybe
                    
                    var captrees = this.possibleMoves.possibles[0].move; //first move will be capturing - ensured by findPossibleMoves function

                    var endm = {i:i,j:j};
                    if(captrees) {
                        this.makeCapture(captrees, endm); //attempts capture move
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

    resizeCanvas(width, height) {
        if(height < width)
            ctx.canvas.width = ctx.canvas.height = height;
        else ctx.canvas.width = ctx.canvas.height = width;

        //this.selected = null;
        this.drawBoard();
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
                if(this.board[i][j]==1 || this.board[i][j]==2) {
                    ctx.fillStyle = this.piececolors[this.board[i][j]-1];

                    ctx.beginPath();
                    ctx.arc( (2*j+1)*ts/2, (2*i+1)*ts/2, ts*2/5, 0, 2*Math.PI);
                    ctx.fill();
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