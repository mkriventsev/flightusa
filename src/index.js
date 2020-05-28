import { maxBy, minBy, flattenDeep } from "lodash"
import { default as dataStart } from '../data/airlines.json'
import { default as defaultFDEB } from '../data/06.6.1.004.60.01.json'
import { default as usaMap } from '../data/states.json'
import { CANVAS_WIDTH, CANVAS_HEIGHT, NODE_RADIUS, SHIFT,SCALE } from "./const"

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = CANVAS_WIDTH
ctx.canvas.height = CANVAS_HEIGHT
// ctx.globalAlpha = ALFA

const data = reparseData(dataStart)
let isInit = false;
let mapScreenParams // = mapParams(data.nodes);
let mapNodes// = changeNodesParams(data.nodes, mapScreenParams)

const states = parseUSAmap(usaMap)

let FDEBEdges = defaultFDEB;
let FDEBparams = {
    compatibility: 0.6,
    cycles: 6,
    initStep: 0.04,
    initPart: 1,
    kBundling: 0.1,
    iter: 50
}
let defaultFDEBparams = FDEBparams

//draw initially USA map, nodes and links
function initialization() {
    // displayJsonDebugOnPage(data);
    mapScreenParams = mapParams(data.nodes);
    mapNodes = changeNodesParams(data.nodes, mapScreenParams)
    drawUSAmap(states)
    // displayJsonDebugOnPage(data);
    drawInitEdges(data.edges, mapNodes);
    drawInitNodes(mapNodes);
    isInit = true
    loadDefaultFDEBparams();
}


// function calculateFDEB() {
//     FDEBEdges = FDEB(data);
//     debugger
//     console.log(FDEBEdges[4]);
// }
function loadDefaultFDEBparams() {
    document.querySelector('#compatibility').value = FDEBparams.compatibility;
    document.querySelector('#cycles').value = FDEBparams.cycles;
    document.querySelector('#initstep').value = FDEBparams.initStep;
    document.querySelector('#initpart').value = FDEBparams.initPart;
    document.querySelector('#kbundling').value = FDEBparams.kBundling;
    document.querySelector('#iter').value = FDEBparams.iter;

    //ctx.globalCompositeOperation='multiply';
}
function entredNewParams() {
    if (FDEBparams.compatibility == document.querySelector('#compatibility').value)
        if (FDEBparams.cycles == document.querySelector('#cycles').value)
            if (FDEBparams.initStep == document.querySelector('#initstep').value)
                if (FDEBparams.initPart == document.querySelector('#initpart').value)
                    if (FDEBparams.kBundling == document.querySelector('#kbundling').value)
                        if (FDEBparams.iter == document.querySelector('#iter').value)
                            return false
    return true;
}
function paramsAreDefault(){
    console.log(defaultFDEBparams);
    console.log(FDEBparams);
    if (FDEBparams.compatibility == defaultFDEBparams.compatibility)
        if (FDEBparams.cycles == defaultFDEBparams.cycles)
            if (FDEBparams.initStep == defaultFDEBparams.initStepvalue)
                if (FDEBparams.initPart == defaultFDEBparams.initPart)
                    if (FDEBparams.kBundling == defaultFDEBparams.kBundling)
                        if (FDEBparams.iter == defaultFDEBparams.iter)
                            return true
    return false;
}
function updateFDEBparams() {
    console.log('old');
    console.log(FDEBparams);
    FDEBparams = {
        compatibility: document.querySelector('#compatibility').value,
        cycles: document.querySelector('#cycles').value,
        initStep: document.querySelector('#initstep').value,
        initPart: document.querySelector('#initpart').value,
        kBundling: document.querySelector('#kbundling').value,
        iter: document.querySelector('#iter').value
    }
    console.log('new');
    console.log(FDEBparams);
}

function draw(n) {
    if (canvas.getContext) {
        // displayJsonDebugOnPage(data);
        drawUSAmap(states)
        // FDEBNodes = FDEB(data);

        // drawInitNodes(mapNodes);
        // drawInitDataFlights(data.edges, mapNodes, n);
        drawLineFDEB(data.nodes, data.edges, FDEBEdges, n)
        drawInitNodes(mapNodes);
        //началос
        console.log("ATTT")
    }
}

function drawUSAmap(states) {
    states.forEach(state => {
        state.forEach(elem => {

            ctx.beginPath();
            ctx.moveTo(elem[0].x, elem[0].y)
            // debugger
            for (let stat = 1; stat < elem.length; stat++) {
                ctx.lineTo(elem[stat].x, elem[stat].y);
            }
            ctx.fillStyle = 'rgba(221,221,221,1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.stroke();
        });
    });
}

function parseUSAmap(usaMap) {
    let states = []
    let minX = -124.25
    let minY = 25.120779
    let maxX = -66.979601
    let maxY = 48.9
    console.log(usaMap);
    usaMap.features.forEach(feature => {
        if (feature.geometry.type == 'Polygon') {
            let Polygon = feature.geometry.coordinates.map(coordinate =>
                coordinate.map(item => ({
                    x: SHIFT + ((item[0] - minX) * 10.0) * SCALE,
                    y: SHIFT + ((-item[1] + maxY) * 13.5) * SCALE
                })))
            states.push(Polygon)
        }
        else {
            let MultiPolygon =
                feature.geometry.coordinates.map(coordinate =>
                    coordinate[0].map(item => ({
                        x: SHIFT + ((item[0] - minX) * 10.0) * SCALE,
                        y: SHIFT + ((-item[1] + maxY) * 13.5) * SCALE
                    })))
            states.push(MultiPolygon)

        }

    });
    return states
}

function reparseData(dataStart) {
    const nodes = dataStart.nodes.map(node => ({
        x: node._attributes.x,
        y: node._attributes.y,
        title: node._attributes.tooltip.split('(')[0],
        id: node._id,
        weight: 0
        // }
    }))

    const edges = dataStart.edges.map(edge => ({
        id: edge._id,
        source: edge._source,
        target: edge._target,
    }))
    edges.forEach(edge => {
        nodes[edge.source].weight++
        nodes[edge.target].weight++
    });

    return {
        nodes,
        edges,
    };
}

//cycle  0     1     2     3     4      5
// P     1     2     4     8     16     32
// S     .04   .02   .01   .005  .0025  .00125
// I     50    33    22    15    9      7
function FDEB(data, FDEBparams) {
    const { edges, nodes } = data;
    console.log('INSIDE FUNCTION');
    
    let edgeCompatibilities = [];
    edges.forEach((edge, index) => {
        edgeCompatibilities[index] = []
    });
    let edgeSubdivision = [];
    // compatibility: 0.6,
    // cycles: 6,
    // initStep: 0.04,
    // initPart: 1,
    // kBundling: 0.1,
    // iter: 50

    const edgesCompatibilitieThreshold = FDEBparams.compatibility;
    const K = FDEBparams.kBundling;
    const C = FDEBparams.cycles;
    let S = FDEBparams.initStep; // S0 -  an initial step size. 
    let P = FDEBparams.initPart; // P0 - an initial number of subdivision points P0 for each edge
    let I = FDEBparams.iter; // I0 - is the number of iteration steps during the first cycle.

    console.log(edgesCompatibilitieThreshold);
    console.log(K)
    console.log(C)
    console.log(S)
    console.log(P)

    const P_increase = 2;
    const S_decrease = 0.5;
    const I_decrease = 0.66667;
    const deviation = 1e-6;

    prepareSubDivisions();
    edgeSubDivisions(P);
    updateEdgeCompatibilities();

    for (let cycle = 0; cycle < C; cycle++) {
        for (let iter = 0; iter < I; iter++) {
            let forces = []
            edges.forEach((edge, index) => {

                forces[index] = forceOnEdge(edge, S, P);
            });
            edges.forEach((edge, index) => {
                for (var p = 0; p <= P; p++) {
                    edgeSubdivision[edge.id][p].x += forces[index][p].x;
                    edgeSubdivision[edge.id][p].y += forces[index][p].y;
                }
            });
        }
        S *= S_decrease;
        P *= P_increase;
        I *= I_decrease;
        edgeSubDivisions(P)
    }
    FDEBEdges = edgeSubdivision;
    return;

    function forceOnEdge(edge, S, P) {
        const numberOfSegments = P + 1 // numbers of points + 1
        const kp = K / (eLength(edge) * numberOfSegments)  //kp = K/|P|(number of segments), where |P| is the initial length of edge P.
        const forceOnPoint = [{ x: 0, y: 0 }];   //combined force Fpi exerted on this point is a combination of the
        for (let p = 1; p <= P; p++) {
            //two neighboring spring forces Fs exerted by pi−1 and pi+1
            let springForceOnPoint = {}
            springForceOnPoint.x = kp * (edgeSubdivision[edge.id][p + 1].x - edgeSubdivision[edge.id][p].x + edgeSubdivision[edge.id][p - 1].x - edgeSubdivision[edge.id][p].x)
            springForceOnPoint.y = kp * (edgeSubdivision[edge.id][p + 1].y - edgeSubdivision[edge.id][p].y + edgeSubdivision[edge.id][p - 1].y - edgeSubdivision[edge.id][p].y)
            //and the sum of all electrostatic forces Fe. 
            let sumElectroForces = { x: 0, y: 0 };
            edgeCompatibilities[edge.id].forEach((compEdge, index) => {
                let partForce = {
                    x: edgeSubdivision[compEdge][p].x - edgeSubdivision[edge.id][p].x,
                    y: edgeSubdivision[compEdge][p].y - edgeSubdivision[edge.id][p].y
                };
                if ((Math.abs(partForce.x) > deviation) || (Math.abs(partForce.y) > deviation)) {
                    const deflectionDistance = (1 / distance(edgeSubdivision[compEdge][p], edgeSubdivision[edge.id][p]) ** 1.0)
                    sumElectroForces.x += deflectionDistance * partForce.x;
                    sumElectroForces.y += deflectionDistance * partForce.y;
                }
            });
            forceOnPoint.push({
                x: S * (springForceOnPoint.x + sumElectroForces.x),
                y: S * (springForceOnPoint.y + sumElectroForces.y)
            })
        }
        forceOnPoint.push({
            x: 0,
            y: 0
        })
        return forceOnPoint;
    }

    function prepareSubDivisions() {
        edges.forEach((edge, i) => {
            edgeSubdivision[i] = []
            if (P != 1) {
                edgeSubdivision[i].push(nodes[edge.source], nodes[edge.target]);
            }
        });
    }

    function edgeLengthPoints(edge) {
        let length = 0;
        for (let p = 1; p < edgeSubdivision[edge].length; p++) {
            length += distance(edgeSubdivision[edge][p], edgeSubdivision[edge][p - 1]);
        }
        return length;
    }
    function edgeSubDivisions(P) {
        edges.forEach((edge, i) => {
            if (P != 1) {
                var averageSegentLength = edgeLengthPoints(edge.id) / (P + 1);
                var currAverageSegentLength = averageSegentLength;
                var updatedEdgeSubdivision = []; // changing all sub-nodes. Adding source
                updatedEdgeSubdivision.push(nodes[edge.source]);
                for (let i = 1; i < edgeSubdivision[edge.id].length; i++) {
                    let oldSegentLength = distance(edgeSubdivision[edge.id][i], edgeSubdivision[edge.id][i - 1])
                    while (oldSegentLength > currAverageSegentLength) {
                        const proportionalPosition = currAverageSegentLength / oldSegentLength;
                        let newx = edgeSubdivision[edge.id][i - 1].x;
                        let newy = edgeSubdivision[edge.id][i - 1].y;
                        newx += proportionalPosition * (edgeSubdivision[edge.id][i].x - edgeSubdivision[edge.id][i - 1].x);
                        newy += proportionalPosition * (edgeSubdivision[edge.id][i].y - edgeSubdivision[edge.id][i - 1].y);
                        updatedEdgeSubdivision.push({ x: newx, y: newy });
                        oldSegentLength -= currAverageSegentLength;
                        currAverageSegentLength = averageSegentLength;
                    }
                    currAverageSegentLength -= oldSegentLength;
                }
                updatedEdgeSubdivision.push(nodes[edge.target]); //target
                edgeSubdivision[edge.id] = updatedEdgeSubdivision;
            }
            else {
                edgeSubdivision[i].push(nodes[edge.source]); // begin  P0
                edgeSubdivision[i].push(eMidPoint(edge)); // middle Pm
                edgeSubdivision[i].push(nodes[edge.target]); // end P1
            }
        });
    }

    function eMidPoint(edge) {
        return pointsMidPoint(nodes[edge.source], nodes[edge.target])
    }

    function pointsMidPoint(a, b) {
        return {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        };
    }
    function updateEdgeCompatibilities() {
        for (let i = 0; i < edges.length - 1; i++) {
            const P = edges[i];
            for (let j = i + 1; j < edges.length; j++) {
                const Q = edges[j];
                if (totalEdgeCompatibility(P, Q) >= edgesCompatibilitieThreshold) {
                    compatibileEdges(P.id, Q.id)
                }
            }
        }
    }

    //(P, Q) { We define the total edge compatibility Ce(P,Q) ∈ [0,1]
    // between two edges P and Q as Ce(P,Q) = Ca(P,Q)·Cs(P,Q)·Cp(P,Q)·Cv(P,Q)
    function totalEdgeCompatibility(P, Q) {
        return angleComp(P, Q) * scaleComp(P, Q) * positionComp(P, Q) * visibilityComp(P, Q)
    }
    //считаем угловую Ca(P,Q) Ca(P,Q) = | cos(α)|, with α : arccos( (P·Q) / (|P||Q|) )
    function angleComp(p, q) {
        return Math.abs(scalarProduct(p, q) / (eLength(p) * eLength(q)));
    }
    // scale Cs(P,Q) = 2 / ( lavg·min(|P|,|Q|)+max(|P|,|Q|)/lavg ) with lavg : (|P|+|Q|) /2
    function scaleComp(p, q) {
        return 2 / (lAvg(p, q) / Math.min(eLength(p), eLength(q)) + Math.max(eLength(p), eLength(q)) / lAvg(p, q));
    }
    // position Cp(P,Q) = lavg/(lavg + ||kPm −Qm||),  Pm and Qm : midpoints of edges P and Q
    function positionComp(p, q) {
        return lAvg(p, q) / (lAvg(p, q) + distance(eMidPoint(p), eMidPoint(q)))
    }
    // visibility Cv(P,Q) = min(V(P,Q),V(Q,P))
    function visibilityComp(p, q) {
        return Math.min(visibility(p, q), visibility(q, p))
    }
    //with V(P,Q) : max( 1−(2||Pm−Im||/||I0−I1||), 0 ), Im : midpoint of I0 and I1.
    function visibility(P, Q) {
        const I0 = vectorProjection(Q.source, P);
        const I1 = vectorProjection(Q.target, P);
        const Im = pointsMidPoint(I0, I1);
        const Pm = eMidPoint(P);
        const PmIm = distance(Pm, Im);
        const I0I1 = distance(I0, I1);
        return (Math.max((1 - 2 * PmIm / I0I1), 0))
    }

    function vectorProjection(idFrom, edgeTo) {
        const point = nodes[idFrom]
        const lineTo = {
            source: {
                x: nodes[edgeTo.source].x,
                y: nodes[edgeTo.source].y
            },
            target: {
                x: nodes[edgeTo.target].x,
                y: nodes[edgeTo.target].y
            }
        }
        const vctr = ((lineTo.source.y - point.y) * (lineTo.source.y - lineTo.target.y) - (lineTo.source.x - point.x) * (lineTo.target.x - lineTo.source.x)) / eLength(edgeTo) ** 2;
        const x = vctr * (lineTo.target.x - lineTo.source.x) + lineTo.source.x
        const y = vctr * (lineTo.target.y - lineTo.source.y) + lineTo.source.y
        return {
            x,
            y
        }
    }

    function compatibileEdges(e1, e2) {
        edgeCompatibilities[e1].push(e2);
        edgeCompatibilities[e2].push(e1);
    }

    function scalarProduct(a, b) { // sum of the products of the corresponding entries of the two sequences of numbers
        const p = eVector(a);
        const q = eVector(b);
        return p.x * q.x + p.y * q.y;
    }

    function eVector(e) { // start coord - end coord
        return {
            x: nodes[e.target].x - nodes[e.source].x,
            y: nodes[e.target].y - nodes[e.source].y
        }
    }

    function lAvg(p, q) {
        return (eLength(p) + eLength(q)) / 2;
    }

    function eLength(edge) {  //helper for edge distance
        return distance(nodes[edge.target], nodes[edge.source])
    }
}
function distance(target, source) {  // ((y2-y1)^2 + (x2-x1)^2) 
    if (Math.abs(target.x - source.x) < 1e-6 &&
        Math.abs(target.y - source.y) < 1e-6) {
        return 1e-6;
    }
    return ((target.x - source.x) ** 2 + (target.y - source.y) ** 2) ** 0.5
}

canvas.addEventListener('click', (e) => clickOnCanvas(e));

function clearCanvas() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    document.getElementById("airport").innerHTML = '';
}

function clickOnCanvas(e) {
    console.log('position');
    const pos = {
        x: e.clientX,
        y: e.clientY - e.target.offsetTop
    }
    if (data.nodes.length > 0 && FDEBEdges) {
        console.log('click event go: ')
        const selectedNode = data.nodes.find(node => isIntersect(pos, node));
        clearCanvas()
        if (selectedNode) {
            console.log('node is selected - x ' + selectedNode.x + ' y ' + selectedNode.y)
            debugToPage(selectedNode)
            draw(selectedNode.id)
        } else {
            draw()
        }
    }
    console.log(pos)
    console.log("++++++++++++++++++")
}


function isIntersect(point, node) {
    return Math.sqrt((point.x - node.x) ** 2 + (point.y - node.y) ** 2) < Math.log(node.weight) * NODE_RADIUS / 2;
}


function drawLineFDEB(nodes, edges, newEdges, n) {
    // debugger
    const connectedEdges = n && edges.filter(edge => edge.source === n || edge.target === n)

    console.log('connected')
    console.log(connectedEdges)

    edges.forEach((edge, index) => {
        ctx.beginPath();
        // debugger
        ctx.moveTo(newEdges[index][0].x, newEdges[index][0].y)
        for (let point = 1; point < newEdges[index].length; point++) {
            if (distance(newEdges[index][point], newEdges[index][point - 1]) > 1) {
                ctx.lineTo(newEdges[index][point].x, newEdges[index][point].y);
            }
        }
        ctx.strokeStyle = 'rgba(23,123,143,0.1)';
        ctx.stroke();
    });
    if (connectedEdges) {
        for (let ce = 0; ce < connectedEdges.length; ce++) {
            const connEdge = connectedEdges[ce];
            ctx.beginPath();
            ctx.moveTo(newEdges[connEdge.id][0].x, newEdges[connEdge.id][0].y)
            // console.log(edge[0].x, edge[0].y)
            for (let point = 1; point < newEdges[connEdge.id].length; point++) {
                if (distance(newEdges[connEdge.id][point], newEdges[connEdge.id][point - 1]) > 1) {
                    ctx.lineTo(newEdges[connEdge.id][point].x, newEdges[connEdge.id][point].y);
                }
            }
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(93,13,43,0.25)';
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    }
}


function displayJsonDebugOnPage(arr) {
    var outNodes = "<tr><th>ID</th><th>Name</th><th>x</th><th>y</th></tr>";
    var i;
    // console.log(arr.nodes.length)
    for (i = 0; i < arr.nodes.length; i++) {
        outNodes += printNodesInfo(arr.nodes[i])
    }
    document.getElementById("nodessss").innerHTML = outNodes;
};

function debugToPage(debugg) {
    console.log(debugg);
    if (debugg) {
        // document.getElementById("debugg").innerHTML = `Selected node ${debugg.title} , ID = ${debugg.id}`;
        document.getElementById("airport").innerHTML = `Airport ${debugg.title} (ID: ${debugg.id})
        <br>Coords: ${debugg.yOrig / 10.0} N, ${-debugg.xOrig / 10.0} W
        <br>Number of in/out links: ${debugg.weight}`;
    }
};

function printNodesInfo(node) {
    var outNodes = "";
    outNodes += '<tr> <td> <b> id = ' + node.id + '</b> </td> <td>Name: ' + node.title + '  </td> <td> x: ' + node.x + ' </td> <td>' + node.y + '</tr>'
    return outNodes;
};

function mapParams(nodes) {
    var xMax = maxBy(nodes, (item) => item.x).x;
    var yMax = maxBy(nodes, (item) => item.y).y;
    var xMin = minBy(nodes, (item) => item.x).x;
    var yMin = minBy(nodes, (item) => item.y).y;
    console.log(xMax, 'max x', yMax, 'max y \n', xMin, 'min x', yMin, 'min y');

    var mapHeight = yMax - yMin;
    var mapWidth = xMax - xMin;
    const ratio = mapWidth / mapHeight
    console.log('ratio ' + ratio)
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

function changeNodesParams(nodes, m) { // m - object with Map's bounds
    nodes.forEach(item => {
        item.xOrig = item.x
        item.yOrig = item.y
        item.x = SHIFT + (- m.xMin + item.x) * SCALE
        item.y = SHIFT + (- m.yMin + item.y) * 1.35 * SCALE
    });
    return nodes;
}

function drawInitNodes(nodes) {
    nodes.forEach(node => {
        drawNode(node, false)
    })
}

function drawInitEdges(edges, nodes) {
    edges.forEach(edge => {
        drawEdges(nodes, edge, false)
    })
}

function drawEdges(nodes, edges, isSelected, n) {
    // const strokeStyle = isSelected ? 'rgba(255, 0, 0, 0.0' : 'rgba(165, 165, 165, 0.3)'
    const strokeStyle = isSelected ? 'rgba(255, 0, 0, 0.3' : 'rgba(23,123,143,0.1)'
    ctx.beginPath();
    let direction;
    if (isSelected) {
        console.log('selected ' + edges.length)
        edges.forEach(edge => {
            // // console.log(edge)
            // if (edge._source == n){
            //     console.log('FROM')
            //     direction = true
            // }
            // if (edge._target == n){
            //     console.log('TO')
            //     direction = false
            // }
            // const xb_ = nodes[edge._source].xScreen
            // const yb_ = nodes[edge._source].yScreen
            // const xa_ = (nodes[edge._source].xScreen + nodes[edge._target].xScreen) / 2
            // const ya_ = (nodes[edge._source].yScreen + nodes[edge._target].yScreen) / 2
            // const x2x1 = xa_ - xb_;
            // const y2y1 = ya_ - yb_;

            // const ab = Math.sqrt(x2x1 ** 2 + y2y1 ** 2);

            // const v1x = (xb_ -  xa_) / ab;
            // const v1y = (yb_ -  ya_) / ab;

            // const v3x = (v1y > 0 ? - v1y : v1y) * (Math.sqrt(3)/3)*ab;
            // const v3y = (v1x > 0 ? v1x : - v1x) * (Math.sqrt(3)/3)*ab;

            // let xc_ = xa_ - v3x;
            // let yc_ = ya_ - v3y;

            // if (nodes[edge._source].xScreen > nodes[edge._target].xScreen){
            //     xc_ = xa_ - v3x;
            //     yc_ = ya_ - v3y;

            // }
            // else{
            //     xc_ = xa_ + v3x;
            //     yc_ = ya_ + v3y;
            // }

            ctx.moveTo(nodes[edge.source].x, nodes[edge.source].y);
            // ctx.quadraticCurveTo(xc_, yc_, nodes[edge._target].xScreen, nodes[edge._target].yScreen);
            ctx.lineTo(nodes[edge.target].x, nodes[edge.target].y);

        })
    } else {

        ctx.moveTo(nodes[edges.source].x, nodes[edges.source].y);
        // ctx.quadraticCurveTo(xc_, yc_, nodes[edges._target].xScreen, nodes[edges._target].yScreen);
        ctx.lineTo(nodes[edges.target].x, nodes[edges.target].y);
    }
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
}

function drawNode(node, isSelected) {
    const radius = isSelected ? Math.log(node.weight) * NODE_RADIUS / 2 * 1.5 : Math.log(node.weight) * NODE_RADIUS / 2
    const nodefillStyle = isSelected ? 'rgba(23, 165, 24, 1)' : 'rgba(255, 165, 0,1.0)'
    const strokeStyle = isSelected ? 'rgba(54, 150, 54, 1)' : 'rgba(255, 150, 50, 0.8)'
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = nodefillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
}


function loaderStart() {
    document.querySelector(".loader_wrapper").style.display = "flex";
}
function loaderEnd() {
    document.querySelector(".loader_wrapper").style.display = "none";
}

let showinitdataButtonEl = document.querySelector('#showinitdata')
showinitdataButtonEl.addEventListener('click', () => {
    loaderStart()
    clearCanvas()
    let FDEBforinit = {
        compatibility: 0.6,
        cycles: 6,
        initStep: 0,
        initPart: 1,
        kBundling: 0.1,
        iter: 50
    }
    FDEB(data,FDEBforinit )
    draw()
    loaderEnd()
});

let calculationButtonEl = document.querySelector('#calculation')
calculationButtonEl.addEventListener('click', () => {
    loaderStart()
    if (entredNewParams()) {
        console.log('entered new params');
        updateFDEBparams()
        console.log(Object.is(defaultFDEBparams, FDEBparams));
        clearCanvas()
        if (!paramsAreDefault()) {
            FDEB(data, FDEBparams)
        } else {
            console.log('params are default');
        }
        draw()
    } else {console.log('not changed params');{
        clearCanvas()
        draw()}
    }
    loaderEnd()
});

document.addEventListener('readystatechange', initialization());

// document.addEventListener('readystatechange', () => {
//     if (document.readyState == 'complete') calculateFDEB();
// });
