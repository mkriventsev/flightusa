var graphml = require('graphml-js');
var fs = require('fs');

var graphmlText = fs.readFileSync('data/airlines.graphml');
var parser = new graphml.GraphMLParser();

parser.parse(graphmlText, function (err, graph) {
    console.log(graph);
    fs.writeFile("data/airlines.json", JSON.stringify(graph), function (err) {
        if (err) {
            return console.log(err);
        }
    });
})
