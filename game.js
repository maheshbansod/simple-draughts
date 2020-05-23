
class Game {
    constructor(ctx, size = 10, board=null) {
        this.ctx = ctx;

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
                    this.board[i][j]=1; //black
                }
                for(var j=(i+1)%2;j<this.size;j+=2) {
                    this.board[this.size-i-1][j]=2; //red
                }
            }
        }

        this.turn = 2; //red plays first.
    }

    play() {
        this.drawBoard();

        
    }

    handleClick(x, y) {
        //tile size
        var ts = this.ctx.canvas.width/this.size;
        //get board coords from click coords
        var i = Math.floor(y/ts), j = Math.floor(x/ts);

        if(this.board[i][j] != 0) {
            //set `selected` based on turn
            if(this.turn == this.board[i][j]) {
                this.selected = {i:i, j:j};
                this.drawBoard();
            }
        } else {//clicked on blank space - so either (TODO:make a move) or deselect.
            this.selected = null;
            this.drawBoard();
        }
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
                if(this.board[i][j] != 0) {
                    if(this.board[i][j]==1) ctx.fillStyle = '#000'; //black
                    else if(this.board[i][j]==2) ctx.fillStyle = '#f00'; //red

                    ctx.beginPath();
                    ctx.arc( (2*j+1)*ts/2, (2*i+1)*ts/2, ts*2/5, 0, 2*Math.PI);
                    ctx.fill();
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