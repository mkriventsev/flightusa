import { maxBy, minBy, flattenDeep } from "lodash"
import { default as dataStart } from '../data/airlines.json'
import { default as usaMap } from '../data/states.json'
import { CANVAS_WIDTH, CANVAS_HEIGHT, ALFA, NODE_RADIUS, SHIFT } from "./const"

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = CANVAS_WIDTH


console.log(CANVAS_WIDTH)
ctx.canvas.height = CANVAS_HEIGHT
ctx.globalAlpha = ALFA

const data = reparseData(dataStart)
const states = parseUSAmap(usaMap)

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
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.stroke();
        });
    });
}

function parseUSAmap(usaMap) {
    let states = []
    usaMap.features.forEach(feature => {
        if (feature.geometry.type == 'Polygon') {
            let Polygon = feature.geometry.coordinates.map(coordinate =>
                coordinate.map(item => ({
                    x: (item[0] * 10.0 + 1345) * 1.5,
                    y: (item[1] * (-13.5) + 680) * 1.5
                })))
            states.push(Polygon)
        }
        else {
            let MultiPolygon =
                feature.geometry.coordinates.map(coordinate =>
                    coordinate[0].map(item => ({
                        x: (item[0] * 10.0 + 1345) * 1.5,
                        y: (item[1] * (-13.5) + 680) * 1.5
                    })))
            states.push(MultiPolygon)

        }

    }
    );
    return states

}

function reparseData(dataStart) {
    const nodes = dataStart.nodes.map(node => ({
        // id: node._id = {
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
        // title: node._attributes.tooltip.split('(')[0]
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
console.log(data)

// P0 //an initial number of subdivision points P0 for each edge
// S0 //and an initial step size S0. 
// S // The step size S determines the distance a point is moved at each iteration step in the direction of the combined force that is exerted on it. 
// C // fixed number of simulation cycles C is performed
// I // A specific number of iteration steps I is performed during each cycle.
// I0 // I0 is the number of iteration steps during the first cycle.

// P0 = 1,
// S0 = 0.04
// C = 6
// I0 = 50.
// I = 2/3

//cycle  0     1     2     3     4      5
// P     1     2     4     8     16     32
// S     .04   .02   .01   .005  .0025  .00125
// I     50    33    22    15    9      7
function FDEB(data) {
    // console.log(data.edges)
    const { edges, nodes } = data;

    let data_edges = edges
    let data_nodes = nodes

    let edgeCompatibilities = [];
    edges.forEach((edge, index) => {
        edgeCompatibilities[index] = []
    });
    let edgeSubdivision = [];
    const edgesCompatibilitieThreshold = 0.5;
    const K = 0.1;
    const C = 6;
    let P = 1; // P0 - an initial number of subdivision points P0 for each edge
    const P_increase = 2 //the number of subdivision points P is doubled a
    let S = 0.1; // S0 -  an initial step size. 
    const S_decrease = 0.5 // step size S is halved before initiating the next cycle
    let I = 90; // I0 - is the number of iteration steps during the first cycle.
    const I_decrease = 0.66667; // i_decrease - The factor by which I is decreased
    const deviation = 1e-6;
    const eps = 1e-6;
    prepareSubDivisions();

    edgeSubDivisions(P);

    updateEdgeCompatibilities();
    // console.log(edgeCompatibilities)


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

    return edgeSubdivision;

    function forceOnEdge(edge, S, P) {
        const numberOfSegments = P + 1 // numbers of points + 1
        const kp = K / (eLength(edge) * numberOfSegments)  //kp = K/|P|(number of segments), where |P| is the initial length of edge P.
        const forceOnPoint = [{ x: 0, y: 0 }];                             //combined force Fpi exerted on this point is a combination of the

        // const sumElectroForces = {x:0,y:0};
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
                    const deflectionDistance = (1 / (distance(edgeSubdivision[compEdge][p], edgeSubdivision[edge.id][p]) ** 1.0))
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
                console.log(edgeSubdivision)
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
                var updatedEdgeSubdivision = []; //изменяем все саб ноды. Добавляем сорс
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
                edgeSubdivision[i].push(nodes[edge.source]); // начало P0
                edgeSubdivision[i].push(eMidPoint(edge)); // средина точки Pm
                edgeSubdivision[i].push(nodes[edge.target]); // конец P1
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


    //создали сабдивижн массив, наполнили его 2100 раз []
    //апдейт сабдивижн массива - в айди ребра ддобавляем начало и средину
    //подсчет компапибилити листа:
    //если  каждые две вершины компапибилити - если их скор >= трешхолд
    //total edge compatibility Ce(P,Q).
    //We define the total edge compatibility Ce(P,Q) ∈ [0,1]
    // between two edges P and Q as Ce(P,Q) = Ca(P,Q)·Cs(P,Q)·Cp(P,Q)·Cv(P,Q)
    // angle compatibility Ca(P,Q)
    // scale compatibility Cs(P,Q)
    // position compatibility Cp(P,Q) 
    // visibility compatibility Cv(P,Q)
    // цикл по С 
    //цикл по иттерациям
    //цикл по еджам
    //посчитать силу для каждого ребра
    //kp=
    // spring force
    //найти текущую, предыдущую и следующую точки
    //combined force Fpi exerted on this point is a combination of the
    //two neighboring spring forces Fs exerted by pi−1 and pi+1
    //and the sum of all electrostatic forces Fe. 
    //electrostatic force
    //берем компатибл эджи для этого эджа, проходим по всем точкам и считаем силу как


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


    // считаем scale Cs(P,Q) = 2 / ( lavg·min(|P|,|Q|)+max(|P|,|Q|)/lavg ) with lavg : (|P|+|Q|) /2
    function scaleComp(p, q) {
        return 2 / (lAvg(p, q) / Math.min(eLength(p), eLength(q)) + Math.max(eLength(p), eLength(q)) / lAvg(p, q));
    }

    // считаем position Cp(P,Q) = lavg/(lavg + ||kPm −Qm||),  Pm and Qm : midpoints of edges P and Q
    function positionComp(p, q) {
        return lAvg(p, q) / (lAvg(p, q) + distance(eMidPoint(p), eMidPoint(q)))
    }

    // считаем visibility Cv(P,Q) = min(V(P,Q),V(Q,P))

    function visibilityComp(p, q) {
        return Math.min(visibility(p, q), visibility(q, p))
    }

    function visibility(P, Q) {  //with V(P,Q) : max( 1−(2||Pm−Im||/||I0−I1||), 0 ), Im : midpoint of I0 and I1.

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

    // // handling nodes that are on the same location, so that K/edge_length != Inf
    if (Math.abs(target.x - source.x) < 1e-6 &&
        Math.abs(target.y - source.y) < 1e-6) {
        return 1e-6;
    }
    return ((target.x - source.x) ** 2 + (target.y - source.y) ** 2) ** 0.5
}



canvas.addEventListener('click', (e) => clickOnCanvas(e));

function clickOnCanvas(e) {
    const pos = {
        x: e.clientX,
        y: e.clientY - 52
    }
    if (data.nodes[0].x && data.nodes[0].y) {
        console.log('test')
        const selectedNode = data.nodes.find(node => isIntersect(pos, node));
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (selectedNode) {
            console.log(selectedNode)
            debugg(selectedNode)
            draw(selectedNode.id)
        } else {
            draw()
        }

        console.log(pos)
    }
    console.log("++++++++++++++++++")
}


function isIntersect(point, node) {
    return Math.sqrt((point.x - node.x) ** 2 + (point.y - node.y) ** 2) < Math.log(node.weight) * NODE_RADIUS / 2;
}

function draw(n) {
    if (canvas.getContext) {
        displayJson(data);
        const mapScreenParams = mapParams(data.nodes);
        const mapNodes = drawNodes(data.nodes, mapScreenParams)
        // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // console.log('States: ' + states)

        drawUSAmap(states)


        // console.log(mapNodes)
        let results = FDEB(data);
        drawInitDataFlights(data.edges, mapNodes, n);
        console.log(results)
        drawLineFDEB(results)

        //началос
        console.log("ATTT")


    }
}
function drawLineFDEB(newEdges) {
    newEdges.forEach(edge => {
        ctx.beginPath();
        ctx.moveTo(edge[0].x, edge[0].y)
        // console.log(edge[0].x, edge[0].y)
        for (let point = 1; point < edge.length; point++) {
            if (distance(edge[point], edge[point - 1]) > 1) {
                ctx.lineTo(edge[point].x, edge[point].y);
            }
        }
        ctx.strokeStyle = 'rgba(23,123,143,0.1)';
        ctx.stroke();
    });
}

function displayJson(arr) {
    var outNodes = "<tr><th>ID</th><th>Name</th><th>x</th><th>y</th></tr>";
    var i;
    console.log(arr.nodes.length)
    for (i = 0; i < arr.nodes.length; i++) {
        outNodes += printNodesInfo(arr.nodes[i])
    }
    document.getElementById("nodessss").innerHTML = outNodes;
};

function debugg(debugg) {
    if (debugg) {
        document.getElementById("debugg").innerHTML = `Selected node ${debugg.title} , ID = ${debugg.id}`;
        // draw(debugg._id)
    }
};

function printNodesInfo(node) {
    var outNodes = "";
    // debugger
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

function drawNodes(nodes, m) { // m - object with Map's bounds

    nodes.forEach(item => {
        item.xOrig = item.x
        item.yOrig = item.y
        item.x = (SHIFT + 2 + (- m.xMin + item.x)) * 1.5 // / m.mapWidth * ctx.canvas.width
        item.y = (SHIFT / 5 + (- m.yMin + item.y) * 1.35) * 1.5 // / m.mapHeight * ctx.canvas.width  / m.ratio
        // item.title = item.title =
    }
    )

    return nodes;
}

function drawInitDataFlights(edges, nodes, n) { // e - Edge's ID, n - node's ID
    const connectedEdge = n && edges.filter(edge => edge.source === n || edge.target === n)
    console.log('connected' + connectedEdge)
    edges.forEach(item => {
        if (item.source !== n || item.target !== n) {
            drawEdges(nodes, item, false)
        }
    })
    connectedEdge && drawEdges(nodes, connectedEdge, true, n)

    const selectedNode = n && nodes.find(node => node.id === n)

    nodes.forEach(item => {
        if (item.id !== n) {
            drawNode(item, false, connectedEdge)
        }
    })
    selectedNode && connectedEdge && drawNode(selectedNode, true)

    //TODO if empty also reset
}


function drawEdges(nodes, edges, isSelected, n) {
    const strokeStyle = isSelected ? 'rgba(255, 0, 0, 0.0' : 'rgba(165, 165, 165, 0.0)'
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
        // const xb_ = nodes[edges.source].xScreen
        // const yb_ = nodes[edges.source].yScreen
        // const xa_ = (nodes[edges.source].xScreen + nodes[edges.target].xScreen) / 2
        // const ya_ = (nodes[edges.source].yScreen + nodes[edges.target].yScreen) / 2
        // const x2x1 = xa_ - xb_;
        // const y2y1 = ya_ - yb_;

        // const ab = Math.sqrt(x2x1 * x2x1 + y2y1 * y2y1);

        // const v1x = (xb_ -  xa_) / ab;
        // const v1y = (yb_ -  ya_) / ab;

        // const v3x = (v1y > 0 ? - v1y : v1y) * (Math.sqrt(3)/6)*ab;
        // const v3y = (v1x > 0 ? v1x : - v1x) * (Math.sqrt(3)/6)*ab;

        // let xc_ = xa_ - v3x;
        // let yc_ = ya_ - v3y;

        // if (nodes[edges._source].xScreen > nodes[edges._target].xScreen){
        //     xc_ = xa_ - v3x;
        //     yc_ = ya_ - v3y;
        // }
        // else{
        //     xc_ = xa_ + v3x;
        //     yc_ = ya_ + v3y;
        // }

        ctx.moveTo(nodes[edges.source].x, nodes[edges.source].y);
        // ctx.quadraticCurveTo(xc_, yc_, nodes[edges._target].xScreen, nodes[edges._target].yScreen);
        ctx.lineTo(nodes[edges.target].x, nodes[edges.target].y);
    }
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
}

function drawNode(node, isSelected, n) {
    const radius = isSelected ? Math.log(node.weight) * NODE_RADIUS / 2 * 1.5 : Math.log(node.weight) * NODE_RADIUS / 2
    const nodefillStyle = isSelected ? 'rgba(23, 165, 24, 1)' : 'rgba(255, 165, 0, 0.8)'
    const strokeStyle = isSelected ? 'rgba(54, 150, 54, 1)' : 'rgba(255, 150, 50,1)'
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = nodefillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();

}

// Line simplification based on
// the Ramer–Douglas–Peucker algorithm
// referance https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
// points: are and array of arrays consisting of [[x,y],[x,y],...,[x,y]]
// length: is in pixels and is the square of the actual distance.
// returns array of points of the same form as the input argument points.
var simplifyLineRDP = function (points, length) {
    var simplify = function (start, end) { // recursive simplifies points from start to end
        var maxDist, index, i, xx, yy, dx, dy, ddx, ddy, p1, p2, p, t, dist, dist1;
        p1 = points[start];
        p2 = points[end];
        xx = p1[0];
        yy = p1[1];
        ddx = p2[0] - xx;
        ddy = p2[1] - yy;
        dist1 = (ddx * ddx + ddy * ddy);
        maxDist = length;
        for (var i = start + 1; i < end; i++) {
            p = points[i];
            if (ddx !== 0 || ddy !== 0) {
                // dot product
                t = ((p[0] - xx) * ddx + (p[1] - yy) * ddy) / dist1;
                if (t > 1) {
                    dx = p[0] - p2[0];
                    dy = p[1] - p2[1];
                } else
                    if (t > 0) {
                        dx = p[0] - (xx + ddx * t);
                        dy = p[1] - (yy + ddy * t);
                    } else {
                        dx = p[0] - xx;
                        dy = p[1] - yy;
                    }
            } else {
                dx = p[0] - xx;
                dy = p[1] - yy;
            }
            dist = dx * dx + dy * dy
            if (dist > maxDist) {
                index = i;
                maxDist = dist;
            }
        }

        if (maxDist > length) { // continue simplification while maxDist > length
            if (index - start > 1) {
                simplify(start, index);
            }
            newLine.push(points[index]);
            if (end - index > 1) {
                simplify(index, end);
            }
        }
    }
    var end = points.length - 1;
    var newLine = [points[0]];
    simplify(0, end);
    newLine.push(points[end]);
    return newLine;
}
document.addEventListener('readystatechange', () => {
    if (document.readyState == 'complete') draw();
});