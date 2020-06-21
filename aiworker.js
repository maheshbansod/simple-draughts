

onmessage = function(e) {
    var board = e.data[0];
    var player = e.data[1];

    var movefinder = new MoveFinder(board);

    postMessage(movefinder.findBestMove(player));
};

class MoveFinder {

    constructor(board) {
        this.board = board;
        this.size = board.length;

        //fix later to take these settings from game object
        this.mandatory_capture = true;

        this.minmax_depth_limit = 5;
    }

    minmaxscore(move, player, mboard=this.board, depth=1, alpha=-Infinity, beta=Infinity) {
        var board = mboard; //trying without copying
        //mboard.map( (row)=>Array.from(row) ); //copy board

        var undoinfo = this.doMove(move, board);
        var score = 0;

        var mult;
        if(player == 1) mult=-1;
        else mult = 1;

        if(this.hasWonOnBoard(player, board)) {
            score = mult*10;
        } else if(depth==this.minmax_depth_limit) {
            score = mult*this.intermediateScore(player, board);
        } else {

            var opponent = (player==1)?2:1;

            var possibleMoves = this.findPossibleMoves(opponent, board);

            //var bestscore = (player==2)?-Infinity:Infinity, sc=0;
            if(opponent == 2) //maximum for opponent==1
            {
                var bestscore = -Infinity;
                for(var i=0;i<possibleMoves.length;i++) {
                    var opmove = possibleMoves[i];
                    bestscore = Math.max(bestscore, this.minmaxscore(opmove, opponent, board, depth+1, alpha, beta));
                    alpha = Math.max(bestscore, alpha);
                    if(alpha >= beta) break;
                }
                score = bestscore;
            } else {
                var bestscore = Infinity;
                for(var i=0;i<possibleMoves.length;i++) {
                    var opmove = possibleMoves[i];
                    bestscore = Math.min(bestscore, this.minmaxscore(opmove, opponent, board, depth+1, alpha, beta));
                    beta = Math.min(bestscore, beta);
                    if(alpha >= beta) break;
                }
                score = bestscore;
            }
        }

        this.undoMove(move, board, undoinfo.deadpieces);
        if(undoinfo.promoted) board[move.piece.i][move.piece.j]-=2; //demote if promoted

        //self.console.log("forplayer:",player,"score:",score);
        return score;
    }

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

    /**
     * FIX THIS after adding to webworker.. also alphabeta pruning for minimax
     * This function will find the best move for `player` based on the current board state.
     */
    findBestMove(player) {
        
        var possibleMoves = this.findPossibleMoves(player);
        if(!possibleMoves) return;

        var maxscore = (player==1)?Infinity:-Infinity, bestmove = possibleMoves[0];
        possibleMoves.forEach( (move) => {
            
            var movescore = this.minmaxscore(move, player);
            //self.console.log("movescore:",movescore);

            if( (player==2 &&  maxscore < movescore)
            || (player == 1 && maxscore > movescore)) {
                bestmove = move;
                maxscore = movescore;
            }
        });
        self.console.log(maxscore);

        return bestmove;
    }

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

    undoCapture(from, moves, board=this.board, deadpieces=null) {
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
    findPossibleMoves(player, board=this.board) {
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
}