
function draw() {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    ctx.canvas.width = window.innerWidth * 0.9;
    ctx.canvas.height = window.innerHeight * 0.9;
    if (canvas.getContext) {
        function points() {
            var value = points_list.data[lineIndexB];
        }
        var ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(60, 65, 5, 0, Math.PI * 2, true);  // Left eye
        ctx.moveTo(95, 65);
        ctx.arc(90, 65, 5, 0, Math.PI * 2, true);  // Right eye
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(85, 65);
        ctx.lineTo(65, 65);
        ctx.closePath();
        ctx.stroke();

        // Quadratric curves example
        ctx.beginPath();
        ctx.moveTo(275, 225);
        ctx.quadraticCurveTo(225, 225, 125, 162.5);
        ctx.quadraticCurveTo(225, 300, 150, 200);
        ctx.quadraticCurveTo(250, 320, 130, 225);
        ctx.quadraticCurveTo(260, 320, 165, 200);
        ctx.quadraticCurveTo(325, 300, 225, 162.5);
        ctx.quadraticCurveTo(325, 225, 175, 125);
        ctx.quadraticCurveTo(25, 25, 175, 25);
        ctx.stroke();

        fetch("../data/airlines.json")
            .then(response => response.json())
            .then(json => console.log(json));

        // #TODO JSON
        // #TODO import 
    }


}
document.addEventListener('readystatechange', () => {
    if (document.readyState == 'complete') draw();
});

