import { maxBy, minBy } from "lodash"
import { default as data } from '../data/airlines.json'
import { CANVAS_WIDTH, CANVAS_HEIGHT, ALFA, NODE_RADIUS, SHIFT } from "./const"

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = CANVAS_WIDTH
console.log(CANVAS_WIDTH)
ctx.canvas.height = CANVAS_HEIGHT
ctx.globalAlpha = ALFA



canvas.addEventListener('click', (e) => clickOnCanvas(e));

function clickOnCanvas(e) {
    const pos = {
        x: e.clientX,
        y: e.clientY
    }
    if (data.nodes[0].xScreen && data.nodes[0].yScreen) {
        console.log('test')
        const selectedNode = data.nodes.find(node => isIntersect(pos, node));
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (selectedNode) {
            console.log(selectedNode)
            debugg(selectedNode)
            draw(selectedNode._id)
        } else {
            draw()

        }

        console.log(pos)
    }
    console.log("++++++++++++++++++")
}


function isIntersect(point, node) {
    return Math.sqrt((point.x - node.xScreen) ** 2 + (point.y - node.yScreen) ** 2) < NODE_RADIUS;
}

function draw(n) {
    if (canvas.getContext) {
        displayJson(data);
        const mapScreenParams = mapParams(data.nodes);
        const mapNodes = drawNodes(data.nodes, mapScreenParams)
        // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        drawInitDataFlights(data.edges, mapNodes, n);
    }
}

function displayJson(arr) {
    var outNodes = "<tr><th>ID</th><th>Name</th><th>x</th><th>y</th></tr>";
    var i;
    for (i = 0; i < arr.nodes.length; i++) {
        outNodes += printNodesInfo(arr.nodes[i])
    }
    document.getElementById("nodes").innerHTML = outNodes;
};

function debugg(debugg) {
    if (debugg) {
        document.getElementById("debugg").innerHTML = `Selected node ${debugg.title} , ID = ${debugg._id}`;
        // draw(debugg._id)
    }
};



function printNodesInfo(node) {
    var outNodes = "";
    outNodes += '<tr> <td> <b> id = ' + node._id + '</b> </td> <td>Name: ' + node._attributes.tooltip + '  </td> <td> x: ' + node._attributes.x + ' </td> <td>' + node._attributes.y + '</tr>'
    return outNodes;
};

function mapParams(nodes) {
    var xMax = maxBy(nodes, (item) => item._attributes.x)._attributes.x;
    var yMax = maxBy(nodes, (item) => item._attributes.y)._attributes.y;
    var xMin = minBy(nodes, (item) => item._attributes.x)._attributes.x;
    var yMin = minBy(nodes, (item) => item._attributes.y)._attributes.y;
    console.log(xMax, 'max x', yMax, 'max y \n', xMin, 'min x', yMin, 'min y');

    var mapHeight = yMax - yMin + SHIFT;
    var mapWidth = xMax - xMin + SHIFT;
    const ratio = mapWidth / mapHeight
    return {
        xMax: xMax,
        yMax: yMax,
        xMin: xMin,
        yMin: yMin,
        mapHeight: mapHeight,
        mapWidth: mapWidth,
        ratio: ratio
    };
}

function drawNodes(nodes, m) { // m - object with Map's bounds
    nodes.forEach(item => {
        item.xScreen = SHIFT + (- m.xMin + item._attributes.x) / m.mapWidth * ctx.canvas.width
        item.yScreen = SHIFT + (- m.yMin + item._attributes.y) / m.mapHeight * ctx.canvas.width / m.ratio
        item.title = item._attributes.tooltip.split('(')[0]
    }
    )

    return nodes;
}

function drawInitDataFlights(edges, nodes, n) { // e - Edge's ID, n - node's ID

    const connectedEdge = n && edges.filter(edge => edge._source === n || edge._target === n)
    console.log('connected' + connectedEdge)
    edges.forEach(item => {
        if (item._source !== n || item._target !== n) {
            drawEdges(nodes, item, false)
        }
    })
    connectedEdge && drawEdges(nodes, connectedEdge, true)

    const selectedNode = n && nodes.find(node => node._id === n)

    nodes.forEach(item => {
        if (item._id !== n) {
            drawNode(item, false)
        }
    })
    selectedNode && drawNode(selectedNode, true)


    //TODO if empty also reset
}

function drawEdges(nodes, edges, isSelected) {
    const strokeStyle = isSelected ? 'rgba(255, 0, 0, 0.5)' : 'rgba(165, 165, 165, 0.2)'
    if (isSelected) {
        console.log('selected' + edges)
        edges.forEach(edge => {
            console.log('selected ' + edge)
            ctx.beginPath();
            ctx.moveTo(nodes[edge._source].xScreen, nodes[edge._source].yScreen);
            ctx.lineTo(nodes[edge._target].xScreen, nodes[edge._target].yScreen);
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        })
    } else {
    ctx.beginPath();
    console.log(nodes[edges._source])
    ctx.moveTo(nodes[edges._source].xScreen, nodes[edges._source].yScreen);
    ctx.lineTo(nodes[edges._target].xScreen, nodes[edges._target].yScreen);
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
}
}

function drawNode(node, isSelected) {
    const radius = isSelected ? NODE_RADIUS * 1.5 : NODE_RADIUS
    const nodefillStyle = isSelected ? 'rgba(23, 165, 24, 1)' : 'rgba(255, 165, 0, 0.8)'
    const strokeStyle = isSelected ? 'rgba(54, 150, 54, 1)' : 'rgba(255, 150, 50,1)'
    ctx.beginPath();
    ctx.arc(node.xScreen, node.yScreen, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = nodefillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();

}

document.addEventListener('readystatechange', () => {
    if (document.readyState == 'complete') draw();
});