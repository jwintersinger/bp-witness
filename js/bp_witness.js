function BpPlotter(iface) {
  this._iface = iface;

  var horiz_padding = 90;
  var vert_padding = 30;
  this._M = [vert_padding, 30, vert_padding, 80],
      //this._W = 1200 - this._M[1] - this._M[3],
      this._H = 7*100 + 50 - this._M[0] - this._M[2];

  this._svg = d3.select('#container').html('')
      .append('svg:svg')
      .attr('width', '100%')
      .attr('height', this._H + this._M[0] + this._M[2]);
  this._W = this._svg.node().getBoundingClientRect().width - this._M[1] - this._M[3];
  this._container = this._svg.append('svg:g')  // This container is for padding
                       .attr('transform', 'translate(' + this._M[3] + ',' + this._M[0] + ')')
                       .append('svg:g'); // This container is for zooming

  var self = this;
  this._svg.call(d3.behavior.zoom().on('zoom', function() {
    self._container.attr('transform', 'translate(' + d3.event.translate + ') scale(' + d3.event.scale + ')');
  }).scaleExtent([1, 100]));

  this._compute_chrom_lens();

  this._xscale = d3.scale.linear()
                         .domain([1, this._total_len])
                         .range([0, this._W]);
  this._draw_chrom_markers();
}

BpPlotter.prototype._compute_chrom_lens = function() {
  var chr_lens = [
    ['1', 248956422],
    ['2', 242193529],
    ['3', 198295559],
    ['4', 190214555],
    ['5', 181538259],
    ['6', 170805979],
    ['7', 159345973],
    ['8', 145138636],
    ['9', 138394717],
    ['10', 133797422],
    ['11', 135086622],
    ['12', 133275309],
    ['13', 114364328],
    ['14', 107043718],
    ['15', 101991189],
    ['16', 90338345],
    ['17', 83257441],
    ['18', 80373285],
    ['19', 58617616],
    ['20', 64444167],
    ['21', 46709983],
    ['22', 50818468],
    ['X', 156040895],
    ['Y', 57227415]
  ];

  var self = this;

  this._chr_lens = {};
  chr_lens.forEach(function(pair) {
    var chrom = pair[0], len = pair[1];
    self._chr_lens[chrom] = len;
  });

  var sum = 0;
  self._cum_chr_lens = {};
  for(var i = 0; i < chr_lens.length; i++) {
    var chr = chr_lens[i][0], size = chr_lens[i][1];
    self._cum_chr_lens[chr] = sum;
    sum += size;
  }

  this._total_len = sum;
}

BpPlotter.prototype._draw_chrom_markers = function() {
  var chroms = this._container.append('svg:g')
                 .attr('class', 'axis')
                 .selectAll('.chrom')
                 .data(Object.keys(this._cum_chr_lens)).enter()
                 .append('svg:g')
                 .attr('class', 'chrom');

  var self = this;
  var get_xpos_line = function(d, i) {
    return self._xscale(self._cum_chr_lens[d] + self._chr_lens[d]);
  };
  var get_xpos_label = function(d, i) {
    return self._xscale(self._cum_chr_lens[d] + 0.5 * self._chr_lens[d]);
  };

  chroms.append('line')
        .attr('x1', get_xpos_line)
        .attr('x2', get_xpos_line)
        .attr('y1', 0)
        .attr('y2', this._H);
  chroms.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', get_xpos_label)
        .attr('y', this._H + this._M[0])
        .text(function(d, i) { return d; });
}

BpPlotter.prototype._label_methods = function(methods) {
  var method_labels = this._container.append('svg:g')
    .attr('class', 'axis')
    .selectAll('.method')
    .data(methods).enter()
    .append('svg:g')
    .attr('class', 'method');
  method_labels.append('text')
    .attr('text-anchor', 'end')
    .attr('alignment-baseline', 'middle')
    .attr('x', -10)
    .attr('y', function(d, i) { return 50 + 100*i; })
    .text(function(d, i) { return d; });
}

BpPlotter.prototype._compute_cum_chr_locus = function(chrom, pos) {
  return this._cum_chr_lens[chrom] + pos;
}

BpPlotter.prototype._stringify_associate = function(associate) {
  return [associate.method, associate.postype, associate.chrom, associate.pos].join('_');
}

BpPlotter.prototype.plot = function(bps) {
  this._bp_to_associate_map = new Map()
  this._associate_to_bp_map = new Map()

  var methods = Object.keys(bps).sort();
  // Place "sv" and "consensus" last.
  ['sv', 'consensus'].forEach(function(meth) {
    var idx = methods.indexOf(meth);
    if(idx === -1)
      return;
    methods.splice(idx, 1);
    methods.push(meth);
  });
  this._label_methods(methods);

  var self = this;
  methods.forEach(function(method, midx) {
    Object.keys(bps[method]).forEach(function(chrom) {
      bps[method][chrom].forEach(function(bp) {
        var xpos = self._xscale(self._compute_cum_chr_locus(chrom, bp.pos));
        var ypos = 100 * midx;
        var path = self._container.append('path');

        self._bp_to_associate_map.set(path.node(), bp.associates);
        self._associate_to_bp_map.set(self._stringify_associate({
          method: method,
          pos: bp.pos,
          chrom: chrom,
          postype: bp.postype,
        }), path.node());

        path.attr('d', 'M0 10 V 90');
        if(bp.postype === 'start') {
          path.attr('d', 'M5 10 Q -5 55 5 90');
        } else if(bp.postype === 'end') {
          path.attr('d', 'M-5 10 Q 5 55 -5 90');
        } else {
          path.attr('d', 'M0 10 V 90');
        }
        path.attr('stroke', 'black');
        path.attr('transform', 'translate(' + xpos + ',' + ypos + ')');

        var toggle_active = function(P, is_active) {
          var elem = self._bp_to_associate_map.get(P).map(function(ass) {
            return self._associate_to_bp_map.get(self._stringify_associate(ass));
          });
          elem.push(P);
          d3.selectAll(elem).classed('active', is_active);
        };

        path.on('mouseenter', function() { toggle_active(this, true); });
        path.on('mouseleave', function() { toggle_active(this, false); });
      });
    });
  });
}

function main() {
  d3.json('data/bp.json', function(error, bps) {
    new BpPlotter().plot(bps);
  });
  return;

  d3.json("data/index.json", function(error, sample_list) {
    if(error) return console.warn(error);
    d3.json("data/metadata.json", function(error, metadata) {
      new Interface(sample_list, metadata);
      $('#sample-selector-extended').modal('show');
    });
  });
}

main();
