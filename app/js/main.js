var d3 = require('d3');
var _ = require('lodash');
var FileSaver = require('./FileSaver.min.js');

var r = 20,
  width = 1000,
  height = 800;

d3.select("#save")
    .on("click", writeDownloadLink);

function writeDownloadLink(){
    try {
        var isFileSaverSupported = !!new Blob();
    } catch (e) {
        alert("blob not supported");
    }

    var html = d3.select("svg")
        .attr("title", "test2")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;

    var blob = new Blob([html], {type: "image/svg+xml"});
    FileSaver.saveAs(blob, "myProfile.svg");
};


var svg = d3.select('#graph')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

var diagramSite = svg.append('g');

svg.append('defs').append('marker')
  .attr("id", 'markerArrowEnd')
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 10)
  .attr("refY", 0)
  .attr("markerWidth", 8)
  .attr("markerHeight", 8)
  .attr("orient", "auto")
  .append("path")
  .attr("d", 'M0,-5 L10,0 L0,5')
  .attr('fill', 'black');

var force = d3.layout.force()
  .charge(function(d, i) {
    return i == 0 ? -1000 : -500;
  })
  .linkDistance(200)
  .size([width, height]);

function legend(parentEl, categoryColors) {
  var lege = parentEl.selectAll('.legend').data(['dummy']);
  var legeEnter = lege.enter().append('g')
      .attr('class', 'legend')
    .append('rect')
      .attr('stroke', 'none')
      .attr('fill', '#f0f0f0')
      .attr('width', 100)
      .attr('height', 6 + categoryColors.domain().length * 35);
  var legendItems = lege.selectAll('.legenditem').data(categoryColors.domain()).enter()
    .append('g')
      .attr('class', 'legenditem')
      .attr('transform', (d, i)=> 'translate(' + 4 + ', ' + String(6 + 35 * i) + ')');
  legendItems.append('rect')
      .attr('width', 30)
      .attr('height', 30)
      .attr('fill', d=>categoryColors(d));
  legendItems.append('text')
    .attr('x', 40)
    .attr('y', 20)
    .text(d=>d);
  lege.select('rect').attr('width', lege.node().getBBox().width + 10);
}

function render() {
  d3.json('/all', function(error, data) {
    data = _.filter(data, function(item) {return !item['@id'].startsWith('_:genid-')})
    console.log('data.length:',data.length);
    var nodeById = _.keyBy(data, '@id');

    // // add nodes for objects without definition
    // _.forEach(data, function(item) {
    //   for(var predicate in item) {
    //     if (!predicate.startsWith('@')) {
    //       var values = item[predicate];
    //       _.forEach(values, function(v) {
    //         var vid = v['@id'];
    //         if (vid) {
    //           if (!nodeById[vid]) {
    //             var obj = {'@id': vid, '@type': ['unknown']};
    //             data.push(obj);
    //             nodeById[vid] = obj;
    //           }
    //         }
    //       });
    //     }
    //   }
    // });
    // console.log('data.length:',data.length);

    var nodeTypes = _.map(_.uniqBy(data, d => d['@type'][0]), d=>d['@type'][0]);
    var nodeTypeColors = d3.scale.category20().domain(nodeTypes);
    legend(svg, nodeTypeColors);

    var dataLinks = [];
    var notFoundVids = 0;
    _.forEach(data, function(item) {
      for(var predicate in item) {
        if (!predicate.startsWith('@')) {
          var values = item[predicate];
          _.forEach(values, function(v) {
            var vid = v['@id'];
            if (vid) {
              if (nodeById[vid]) {
                dataLinks.push({source: item['@id'], type: predicate, target: vid});
              } else {
                if (notFoundVids < 10) {
                  console.log('not found object id ' + notFoundVids + ':', vid);
                }
                notFoundVids++;
              }
            } else if (v['@type']) {
              console.log('literal',item['@id'],predicate,v['@value']);
            }
          });
        }
      };
    });
    console.log('not found vids:', notFoundVids);

    renderDiagram();

    function renderDiagram() {
      var fixedLinks = _.map(dataLinks, function(link) {
        return {
          source: nodeById[link.source],
          target: nodeById[link.target]
        };
      });

      force.nodes(data)
        .links(fixedLinks)
        .start();

      var tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("visibility", "hidden")
        .text("a simple tooltip");

      // render node
      var nodes = diagramSite.selectAll('.node')
        .data(data, function(d) {
          return d['@id']
        });

      var nodesEnter = nodes.enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', 'translate(50, 50)')
        .call(force.drag);

      nodesEnter.append('circle')
        .attr('r', r)
        .attr('fill', d=>nodeTypeColors(d['@type'][0]))
        .attr('title', d=>d['@type'][0])
        .on("mouseover", function(a) {
          d3.select(this).transition().duration(200).attr('r', r * 1.2)
          d3.select(this).style('z-index', -100000)
          tooltip.text(a['@id'])
            .style("visibility", "visible")
          return tooltip;
        })
        .on("mousemove", function() {
          return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).transition().duration(200).attr('r', r)
          tooltip.style("visibility", "hidden")
          return tooltip;
        })
        .on("click", function(d) {
          window.prompt('Object id', d['@id']);
        });

      nodes.exit()
        .remove();

      // render links
      var links = diagramSite.selectAll('.link')
        .data(dataLinks, function(d) {
          return String(d.source) + '_' + String(d.target)
        });

      var linksEnter = links.enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke', 'black')
        .attr('marker-end', 'url(#markerArrowEnd)')
        .attr('title', d=>d.type)
        .on("mouseover", function(d) {
          d3.select(this).style('z-index', -100000)
          tooltip.text(d.type)
            .style("visibility", "visible")
          return tooltip;
        })
        .on("mousemove", function() {
          return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
          tooltip.style("visibility", "hidden")
          return tooltip;
        });


      links.exit()
        .remove();

      function adjustEnds(fromPoint, toPoint) {
        var dx = toPoint.x - fromPoint.x,
          dy = toPoint.y - fromPoint.y,
          length = Math.sqrt(dx * dx + dy * dy);
        dx = dx / length * r;
        dy = dy / length * r;
        return {
          source: {
            x: fromPoint.x + dx,
            y: fromPoint.y + dy
          },
          target: {
            x: toPoint.x - dx,
            y: toPoint.y - dy
          }
        };
      }

      force.on("tick", function() {

        var q = d3.geom.quadtree(data),
          i = 0,
          n = data.length;

        while (++i < n) q.visit(collide(data[i]));

        var xRange = d3.extent(data, d=>d.x);
        var yRange = d3.extent(data, d=>d.y);
        var bounds = {x: xRange[0] - 2 * r, y: yRange[0] - 2 * r, width: xRange[1] - xRange[0] + 4 * r, height: yRange[1] - yRange[0] + 4 * r};

        svg
          .attr('width', bounds.width)
          .attr('height', bounds.height);
        diagramSite.attr('transform', 'translate(' + -bounds.x + ',' + -bounds.y + ')');

        nodes.each(function(d) {
          d3.select(this)
            .attr('transform', 'translate(' + d.x + ', ' + d.y + ')');

        });

        links.each(function(d) {
          var adjustedEnds = adjustEnds(nodeById[d.source], nodeById[d.target]);

          d3.select(this)
            .attr("x1", function(d) {
              return adjustedEnds.source.x;
            })
            .attr("y1", function(d) {
              return adjustedEnds.source.y;
            })
            .attr("x2", function(d) {
              return adjustedEnds.target.x;
            })
            .attr("y2", function(d) {
              return adjustedEnds.target.y;
            });
        });
      });
    }
  });
}

function collide(node) {
  var r = node.radius + 16,
    nx1 = node.x - r,
    nx2 = node.x + r,
    ny1 = node.y - r,
    ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
        y = node.y - quad.point.y,
        l = Math.sqrt(x * x + y * y),
        r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  };
}

d3.select('#reload').on('click', function() {
  render();
})

render();
