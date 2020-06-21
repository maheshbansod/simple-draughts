
class Game {
    constructor(ctx, size = 10, piececolors=['#222','red'], board=null) {
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
            // var str = "0,0,0,0,0,0,1,0,1,0,0,1,0,0,0,1,0,1,0,1,1,0,1,0,1,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,2,0,0,2,0,0,0,0,0,0,0,0,2,0,2,0,2,0,2,0,0,2,0,3,0,2,0,0,0,2,0,0,0,0,0,0,2,0,2,0,0";
            // var arr = str.split(',').map((x)=>Number(x));
            // this.board = [];
            // while(arr.length) this.board.push(arr.splice(0,10));
        }

        this.hasai = true;
        this.isai = [0,1,0]; //set black to AI

        this.possibleMoves = null;
        this.intermeds = [];

        this.piecesn = [0, 15,15];

        this.turn = 2;
        this.total_moves = 0;
        this.mandatory_capture = true;
        this.showPossibleMoves = true;

        this.minmax_depth_limit = 4; //>5 makes it lag for more than two seconds

        this.crownimg = document.createElement('img')
        this.crownimg.src = 'crown.png';
    }

    //CODE BELOW SENT IN THE WORKER aiworker.js
    // minmaxscore(move, player, mboard=this.board, depth=1, alpha, beta) {
    //     var board = mboard; //trying without copying
    //     //mboard.map( (row)=>Array.from(row) ); //copy board

    //     var undoinfo = this.doMove(move, board);
    //     var score = 0;

    //     var mult;
    //     if(player == 1) mult=-1;
    //     else mult = 1;

    //     if(this.hasWonOnBoard(2, board)) {
    //         score = 10;
    //     } else if(this.hasLostOnBoard(2,board)) {
    //         score =  -10;
    //     } else if(depth==this.minmax_depth_limit) {
    //         score = this.intermediateScore(player, board);
    //     } else {

    //         var opponent = (player==1)?2:1;

    //         var possibleMoves = this.findPossibleMoves(opponent, board);

    //         var bestscore = (player==2)?-Infinity:Infinity, sc=0;
    //         possibleMoves.forEach( (move)=> {
    //             sc = this.minmaxscore(move, opponent, board,depth+1);
    //             if( (player==2 && sc > bestscore) ||
    //                 (player==1 && sc < bestscore))
    //                     bestscore = sc;
    //         });
    //         score = bestscore;
    //     }

    //     this.undoMove(move, board, undoinfo.deadpieces);
    //     if(undoinfo.promoted) board[move.piece.i][move.piece.j]-=2; //demote if promoted

    //     return mult*score;
    // }

    /**
     * @brief just calculates how many more pieces `player` has
     */
    intermediateScore(player, board=this.board) {
        var mult=(player==1)?-1:1;
        var counts = [0,0,0,0];
        for(var i=0;i<this.size;i++)
            for(var j=0;j<this.size;j++)
                if(board[i][j]!=0)
                    counts[board[i][j]-1]++;
        //console.log(counts);
        return mult*(counts[1]+counts[3]*2 - counts[0] -counts[2]*2);
    }

    // /**
    //  * FIX THIS after adding to webworker.. also alphabeta pruning for minimax
    //  * This function will find the best move for `player` based on the current board state.
    //  */
    // findBestMove(player=this.turn) {
        
    //     var possibleMoves = this.findPossibleMoves(player);
    //     if(!possibleMoves) return;

    //     var maxscore = 0, bestmove = possibleMoves[0];
    //     possibleMoves.forEach( (move) => {
            
    //         var movescore = this.minmaxscore(move, player);

    //         if( (player==2 &&  maxscore < movescore)
    //         || (player == 1) && maxscore > movescore) {
    //             bestmove = move;
    //             maxscore = movescore;
    //         }
    //     });

    //     return bestmove;
    // }

    doMove(move, board=this.board) {
        var p = move.piece;
        if(move.type=='jump') {
            return this.makeJump(move.piece, move.move, board);
        } else if(move.type=='capture') {
            return this.doCapture(move.piece, move.moves, board);
        }
    }

    undoMove(move, board=this.board,  deadpieces=null) {
        if(move.type == 'jump') {
            this.undoJump(move.piece, move.move, board);
        } else if(move.type=='capture') {
            this.undoCapture(move.piece, move.moves, board, deadpieces)
        }
    }

    /**
     * @brief undoes a jump
     * 
     * @param {i,j} from Position the piece will return to
     * @param {i,j} fpos Position the piece is at before undo
     * @param {Array} board 
     */
    undoJump(from, fpos, board=this.board) {
        var pp = board[fpos.i][fpos.j];
        board[from.i][from.j] = pp;
        board[fpos.i][fpos.j]=0;
    }

    undoCapture(from, moves, board=this.boad, deadpieces=null) {
        if(!deadpieces)
            return;
        moves.forEach((el,i)=>{
            board[el.tokill.i][el.tokill.j]=deadpieces[i];//resurrect
        });
        //then jump back
        var jumpat = moves[moves.length-1].jumpat;
        var pp = board[jumpat.i][jumpat.j]; //the piece
        board[from.i][from.j] = pp;
        board[jumpat.i][jumpat.j] = 0;
    }

    hasWonOnBoard(player, board=this.board) {
        var cp = 0; //opponent player pieces count

        var opponent = (player==1)?2:1;
        for(var i=0;i<this.size;i++)
            for(var j=0;j<this.size;j++)
                if(board[i][j]!=0 && board[i][j]%2==opponent%2)
                    cp++;
        if(cp == 0)
            return true;
    }

    hasLostOnBoard(player, board=this.board) {
        var cp = 0; //player pieces count;

        for(var i=0;i<this.size;i++)
            for(var j=0;j<this.size;j++)
                if(board[i][j]!=0 && board[i][j]%2==player%2)
                    cp++;
        if(cp == 0)
            return true;
    }

    /**
     * @brief checks if a coordinate is valid(inside the board)
     * 
     * @param {Object {i,j}} pos Position to check
     * 
     * @returns true if coords are inside the board, false otherwise.
     */
    isInside(pos, board=this.board) {
        return (pos.i < board.length && pos.i >= 0 && pos.j >= 0 && pos.j < board[0].length);
    }

    /**
     * 
     * @param {i,j} player 
     * @param {Array[]} board 
     */
    findPossibleMoves(player=this.turn, board=this.board) {
        var moves = [];
        for(var i=0;i<this.size;i++) {
            for(var j=0;j<this.size;j++) {
                if(board[i][j]!=0 && board[i][j]%2==player%2) {
                    var pmoves = this.findPossibleMovesFor({i:i,j:j}, board);
                    if(pmoves.length > 0) {
                        pmoves.forEach((elem)=> elem.piece={i:i,j:j});
                        moves=moves.concat(pmoves);
                    }
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
    findPossibleMovesFor(piece, board=this.board) {

        var moves = [];
        var cp = board[piece.i][piece.j];

        var capmoves = this.getCaptureMoves(piece, board);
        if(capmoves.length != 0) {
            //moves.push({type:'capture',move:captree});
            moves=moves.concat(capmoves);
            if(this.mandatory_capture)
                return moves;
        } else if(this.mandatory_capture) {
            for(var i=0;i<this.size;i++)
                for(var j=0;j<this.size;j++)
                    if(board[i][j] != 0 && cp%2 == board[i][j]%2) {
                        if(this.canCapture({i:i,j:j}, board)) {
                            return [];
                        }
                    }
        }

        var i=piece.i, j=piece.j;
        var adjs=[];
        adjs.push({j:j-1},{j:j+1});
        var pb = board[i][j];
        if(pb == 1) {//the pieces that go from top to bottom
            adjs[0].i = adjs[1].i = i+1;
        } else if(pb==2) //only bottom to top
            adjs[0].i = adjs[1].i = i-1;
        else if(pb >= 3) { //can move in any direction
            adjs[0].i = adjs[1].i = i-1;
            adjs.push({j:j-1,i:i+1},{j:j+1,i:i+1});
        }
        
        for(var it=0;it<adjs.length;it++) {
            if(!this.isInside(adjs[it], board))
                continue;
            var p = board[adjs[it].i][adjs[it].j];
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
    canCapture(piece, board=this.board) {
        var pobed = board[piece.i][piece.j];
        if(pobed == 0)
            return false;
        //var opps = Number(!(pobed%2)); //opposite parity
        var diri = -(( (pobed-1)%2 )*2-1);
        var adjl = {i:piece.i+diri, j:piece.j-1}, adjr = {i:piece.i+diri, j:piece.j+1};
        var adjs = [adjl, adjr];
        if(pobed >= 3) adjs = adjs.concat([{i:piece.i-diri,j:adjl.j},{i:piece.i-diri, j:adjr.j}]);

        for(var i=0;i<adjs.length;i++) {
            if(this.isInside(adjs[i],board) && board[adjs[i].i][adjs[i].j]!=0 
            && board[adjs[i].i][adjs[i].j]%2 != pobed%2) {
                var jspace = {i: adjs[i].i - ( Math.floor(i/2)*2-1 )*diri, j:adjs[i].j+( (i%2)*2-1 )}; //jump space
                if(this.isInside(jspace, board) && board[jspace.i][jspace.j]==0)
                    return true;
            }
        }
        return false;
    }

    /**
     * @brief creates an array which contains possible captures from position i,j for a normal piece
     * 
     * @param {i,j} pos position to find captures from
     * @param {i,j} pp . piece that initiated the capture
     * 
     * @returns array containing possible capture moves
     */
    getCaptureMoves(pos, board=this.board, pp = null) {
        var tree = [];
        //var capath = [{type: 'capture', moves:[]}];
        var cpb = pp||board[pos.i][pos.j];
        var diri = 1-((cpb-1)%2)*2;
        var adjl = {i:pos.i+diri, j:pos.j -1};
        var adjr = {i:pos.i+diri, j:pos.j +1};
        var adjs = [adjl, adjr];
        if(cpb >= 3) adjs = adjs.concat([{i:pos.i-diri, j:adjl.j},{i:pos.i-diri,j:adjr.j}])

        for(var i=0;i<adjs.length;i++) {
            if(!this.isInside(adjs[i])) {
                continue;
            }
            var p = board[adjs[i].i][adjs[i].j];
            var adjp = {i:adjs[i].i-(Math.floor(i/2)*2-1)*diri, j: adjs[i].j+( (i%2)*2 -1)};
            if(p != 0 && p%2 != cpb%2 && this.isInside(adjp, board) && board[adjp.i][adjp.j] == 0) {
                var oldpiece = board[adjs[i].i][adjs[i].j];
                board[adjs[i].i][adjs[i].j] = 0; //temporarily make it empty
                var killmove = [{tokill:adjs[i], jumpat:adjp}];
                var nextpaths = this.getCaptureMoves(adjp, board, cpb);
                if(nextpaths.length > 0) {
                    nextpaths.forEach( (el)=> tree.push({type:'capture', moves:killmove.concat(el.moves)}));
                } else
                    tree.push({type:'capture',moves:killmove});
                board[adjs[i].i][adjs[i].j] = oldpiece; //fill again with original piece
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
     * @returns object with property promoted which is true if the piece was promoted and false otherwise
     */
    makeJump(piece, fpos, board=this.board) {

        var pp = board[piece.i][piece.j];
        var promoted = false;

        if(pp <= 2)
        if( (pp == 1 && fpos.i == this.size-1)
        ||  (pp == 2 && fpos.i == 0)) {//reached last row
            pp += 2; //promote to king
            promoted = true;
        }

        board[fpos.i][fpos.j] = pp; //piece moved
        board[piece.i][piece.j] = 0; //set position empty

        return {promoted:promoted};
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
     * @brief performs capture move
     * 
     * @param {i,j} from 
     * @param {array} capmove 
     * @param {Array[][]} board 
     * 
     * @returns object containing deadpieces and whether the capturing piece was promoted
     */
    doCapture(from, capmove, board =this.board) {
        var deadpieces = [];
        capmove.forEach((el)=>{
            deadpieces.push(board[el.tokill.i][el.tokill.j]);
            board[el.tokill.i][el.tokill.j]=0;//kill
        });
        //then jump
        var jumpat = capmove[capmove.length-1].jumpat;
        var pp = board[from.i][from.j]; //the piece
        var promoted = false;
        /*promote if jumping on last row */
        if(pp <= 2)
        if( (pp == 1 && jumpat.i == this.size-1) 
            || (pp == 2 && jumpat.i == 0)) {
            pp+=2;
            promoted = true;
        }
        board[jumpat.i][jumpat.j] = pp; //make it jump
        board[from.i][from.j] = 0; //remove from old pos

        return {deadpieces: deadpieces, promoted:promoted};
    }

    /**
     * 
     * 
     * @param Array[{type:'capture',moves:{[tokill, jumpat]}}] capmoves
     * @param {i,j} endm final position after capture
     * 
     * @returns the number of pieces captured
     */
    makeCaptureWithEnd(capmoves, endm) {

        for(var i=0;i<capmoves.length;i++) {
            var fpos = capmoves[i].moves.slice(-1)[0].jumpat;
            if(fpos.i == endm.i && fpos.j == endm.j) { //endpoint of this move is endm
                //so let's see if the intermeds are all selected

                var d=[];
                //create array with unique elements
                var caparr = capmoves[i].moves.map( (el)=>el.jumpat ).filter( (el, i, arr) => {
                    if(d[el.i+","+el.j])
                        return false;
                    else {
                        d[el.i+","+el.j]=1;
                        return true;
                    }
                });
                var usarr = this.intermeds.concat([endm]);
                if(caparr.length !== usarr.length) continue;
                var notsame = false;
                for(var j=0;j<caparr.length;j++) {
                    if( !usarr.some( (el)=>(el.i == caparr[i].i && el.j==caparr[i].j) )) {
                        notsame = true;
                        break;
                    }
                }
                if(notsame) continue;
                //at this point both sets are same. so make the move
                this.doCapture(this.selected, capmoves[i].moves);

                return capmoves[i].moves.length;
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

        if(this.hasai && this.isai[this.turn]) //ignore if AI's turn to play
            return;
        if(this.board[i][j] != 0) {
            //set `selected` based on turn
            if(this.turn%2 == this.board[i][j]%2) {
                this.selected = {i:i, j:j};
                var possible = this.findPossibleMovesFor(this.selected);
                this.possibleMoves = {possibles: possible,pboard:{ends:[], mids:[]}};
                //fill ends and mids
                possible.forEach( (elem)=> {
                    if(elem.type=='jump')
                        this.possibleMoves.pboard.ends.push(elem.move) //set possible
                    else if(elem.type == 'capture') {
                        this.possibleMoves.pboard.ends.push(elem.moves.slice(-1)[0].jumpat); //possible capture end
                        this.possibleMoves.pboard.mids = this.possibleMoves.pboard.mids.concat(elem.moves.slice(0,elem.moves.length-1).map((el)=>el.jumpat));
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
                    //console.log("hello hello\nhello hello");
                } else if(this.possibleMoves.pboard.ends.some((el)=>(el.i==i && el.j==j))) {//capturing move maybe
                    

                    var capmoves = this.possibleMoves.possibles;
                    var endm = {i:i,j:j};

                    if(capmoves) {
                        var kills = this.makeCaptureWithEnd(capmoves, endm); //attempts capture move

                        if(kills > 0) {
                            this.nextTurn();
                            this.piecesn[this.turn] -= kills;

                            if(this.hasLostOnBoard(this.turn, this.board)) {
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

    callNextTurn() {
        if(this.hasai) {
            if(this.isai[this.turn]) {
                this.makeMove(this.turn);
                return true;
            }
        }
        return false;
    }

    makeMove(player=this.turn) {
        var worker = new Worker('aiworker.js');
        console.log("working on best move.");
        var self = this;
        self.moveWorkingStart();
        worker.onmessage = function(e) {
            var move = e.data;
            self.doMove(move);
            self.drawBoard();
            self.nextTurn();
            self.moveWorkingDone();
            //console.log("turn: ", self.turn);
            //console.log("afternextturnturn: ", self.turn);
        }
        worker.postMessage([this.board, player]);
    }

    nextTurn() {
        this.turn = (this.turn == 1)?2:1;
        this.total_moves++;
        this.callNextTurn();
        //.then(()=>{console.log("yo1")});
        //console.log('yoyo!')
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

    moveWorkingStart() {
        console.log("thinking of a move");
    }

    moveWorkingDone() {
        console.log("move working done");
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
                // if(this.selected && this.selected.i == i && this.selected.j == j)
                //     ctx.fillStyle='#060';
                // else
                if( ((i+j)%2) == 0 ) {
                    ctx.fillStyle = '#8b4513'; //brown
                } else ctx.fillStyle = '#fff'; //white

                ctx.fillRect(j*ts, i*ts, ts, ts);

                //draw piece
                if(this.board[i][j]>=1 && this.board[i][j]<=4) {
                    this.drawPiece({i:i,j:j}, this.board[i][j], ts);
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
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.arc( (2*j+1)*ts/2, (2*i+1)*ts/2, ts*2/5, 0, 2*Math.PI);
            ctx.stroke();
            // ctx.strokeRect(j*ts, i*ts, ts, ts);
        }
    }

    drawPiece(pos, piece, width) {
        var ctx = this.ctx;
        var {i,j} = pos;
        var ts = width;

        var cx =(2*j+1)*ts/2, cy=(2*i+1)*ts/2; //center point
        var r = ts*2/5; //radius

        ctx.beginPath();
        ctx.fillStyle = '#432008'; //shadow
        ctx.arc( cx-ts/10, cy+ts/10, r, 0, 2*Math.PI);
        ctx.fill();

        var pcolor = this.piececolors[(piece+1)%2];
        ctx.fillStyle = pcolor; //piece
        ctx.beginPath();    
        ctx.arc( cx, cy, r, 0, 2*Math.PI);
        ctx.fill();

        //adding some shine and shadow


        var shinew = 2, shiner = r-shinew;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(cx,cy,shiner,  0, Math.PI/2);
        ctx.fill();
        ctx.fillStyle = pcolor;
        ctx.beginPath();
        ctx.arc(cx, cy, shiner-shinew, 0, 2*Math.PI);
        ctx.fill();

        if((piece+1)%2==0) {
            ctx.fillStyle = '#000';
        } else {
            ctx.fillStyle = '#b00';
        }
        var ringst = 3*r/4, ringw = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, ringst, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = pcolor;
        ctx.beginPath();
        ctx.arc(cx, cy, ringst-ringw, 0, 2*Math.PI);
        ctx.fill();


        if(piece>=3) {//add crown
            ctx.drawImage(this.crownimg, j*ts, i*ts, ts, ts);
        }


    }
};