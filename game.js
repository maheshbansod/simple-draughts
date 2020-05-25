
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

        this.turn = 2;
        this.total_moves = 0;
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
     * @brief Find possible moves for a piece . ONLY RETURNS JUMPS . TODO: CAPTURE MOVES
     * 
     * @param {Object {i,j}} piece Piece
     * 
     * @returns array containing the possible moves.
     */
    findPossibleMovesFor(piece) {
        var i=piece.i, j=piece.j;
        var adjs=[];
        adjs.push({j:j-1},{j:j+1})
        if(this.turn == 1) {//the pieces that go from top to bottom
            adjs[0].i = adjs[1].i = i+1;
        } else adjs[0].i = adjs[1].i = i-1;
        
        var moves = [];
        for(var it=0;it<2;it++) {
            if(!this.isInside(adjs[it]))
                continue;
            var p = this.board[adjs[it].i][adjs[it].j];
            if(p == 0) { // empty
                moves.push({type:'jump',move:adjs[it]})
            } else if(this.turn == p) continue; //same player's piece
            else { //capture time maybe
                //var captree = getCaptureTree(piece);
                //captree
            }
        }

        return moves;
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
                possible.forEach( (elem)=> {
                    if(elem.type=='jump')
                        this.board[elem.move.i][elem.move.j]=-12; //mark possible
                    else if(elem.type == 'capture') {
                        ;
                    }
                });
                this.drawBoard();
                possible.forEach( (elem)=> {
                    if(elem.type=='jump')
                        this.board[elem.move.i][elem.move.j]=0; //mark empty again.
                }); 
            }
        } else { //clicked on blank space - so either (TODO:make a move) or deselect.

            if(this.selected) {
                //TODO: check if move is capture or jump and take appropriate action

                if(this.isJumpabble(this.selected,{i,j})) {
                    this.makeJump(this.selected, {i,j})
                    this.nextTurn();
                }
            }

            this.selected = null;
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
                } else if(this.selected && this.board[i][j] == -12) {
                    ctx.fillStyle = 'green';

                    ctx.fillRect(j*ts+ts/10, i*ts+ts/10, ts*4/5, ts*4/5);
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