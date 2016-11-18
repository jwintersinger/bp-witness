function BpPlotter(num_methods, bps) {
  this._bps = bps;

  var horiz_padding = 90;
  var vert_padding = 30;
  this._M = [vert_padding, 30, vert_padding, 80],
      //this._W = 1200 - this._M[1] - this._M[3],
      this._H = num_methods*100 + 50 - this._M[0] - this._M[2];

  this._compute_chrom_lens();

  this._svg = d3.select('#container').html('')
      .append('svg:svg')
      .attr('width', '100%')
      .attr('height', this._H + this._M[0] + this._M[2]);
  this._W = this._svg.node().getBoundingClientRect().width - this._M[1] - this._M[3];

  this._xscale = d3.scale.linear()
                         .domain([1, this._total_len])
                         .range([0, this._W]);
  this._xscale.original_domain = this._xscale.domain();
  this._configure_zooming();
}

BpPlotter.prototype.plot = function() {
  // Remove all existing child elements.
  this._svg.selectAll('*').remove();

  this._container = this._svg.append('svg:g')  // This container is for padding
                       .attr('transform', 'translate(' + this._M[3] + ',' + this._M[0] + ')')
                       .append('svg:g'); // This container is for zooming

  this._draw_chrom_markers();
  this._render();
}

BpPlotter.prototype._zoom_scale = function(scale, original_domain, zoom_from, scale_by) {
  var l = scale.domain()[0];
  var r = scale.domain()[1];

  l = zoom_from - (zoom_from - l) / scale_by;
  r = zoom_from + (r - zoom_from) / scale_by;

  l = Math.round(l);
  r = Math.round(r);
  if(r - l < 10)
    return;

  var new_domain = [l, r];
  if(this._is_domain_within_orig(original_domain, new_domain))
    scale.domain(new_domain);
  else
    scale.domain(original_domain);
}

BpPlotter.prototype._is_domain_within_orig = function(original_domain, new_domain) {
  return original_domain[0] <= new_domain[0] && original_domain[1] >= new_domain[1];
}

BpPlotter.prototype._configure_zooming = function() {
  var self = this;

  function handle_mouse_wheel() {
    var evt = d3.event;
    evt.preventDefault();

    var scale_by = 1.4;
    var direction = (evt.deltaY < 0 || evt.wheelDelta > 0) ? 1 : -1;
    if(direction < 0)
      scale_by = 1/scale_by;

    var mouse_coords = d3.mouse(self._svg.node());
    console.log(mouse_coords);
    var target_scale = self._xscale;
    // Take x-coordinate of mouse, figure out where that lies on subject
    // axis, then place that point on centre of new zoomed axis.
    var zoom_from = target_scale.invert(mouse_coords[0]);

    self._zoom_scale(
      target_scale,
      target_scale.original_domain,
      zoom_from,
      scale_by
    );
    self.plot();
  }
  this._svg.on('mousewheel', handle_mouse_wheel); // Chrome
  this._svg.on('wheel',      handle_mouse_wheel); // Firefox, IE
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

BpPlotter.prototype._keyify = function(chrom, pos) {
  return [pos.method, pos.postype, chrom, pos.pos].join('_');
}

BpPlotter.prototype._render = function() {
  var bps = this._bps['bp'];
  this._visual_map = new Map();

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

        self._visual_map[self._keyify(chrom, bp)] = path.node();
        path.datum(bp);

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
          var pos = d3.select(P).datum();
          var key = self._keyify(chrom, pos);

          if(is_active) {
            d3.select('#suppinfo').style('visibility', 'visible').text(chrom + '_' + d3.format(',')(pos.pos) + ' (' + pos.postype + ', ' + pos.method + ')');
          } else {
            d3.select('#suppinfo').style('visibility', 'hidden');
          }

            console.log([Object.keys(self._bps.associates), Object.keys(pos), key]);
          if(self._bps.associates.hasOwnProperty(key)) {
            var elem = self._bps.associates[key].map(function(ass) {
              return self._visual_map[ass];
            });
          } else {
            var elem = [];
          }
          elem.push(P);
          d3.selectAll(elem).classed('active', is_active);
        };

        path.on('mouseenter', function() { toggle_active(this, true); });
        path.on('mouseleave', function() { toggle_active(this, false); });
      });
    });
  });
}

function Interface(sample_list) {
  this._fill_sample_selectors(sample_list);

  var self = this;
  $('#sample-filter').keyup(function(evt) {
    self._filter();
  });

  $('#sample-list-extended').stupidtable();

  d3.selectAll('#sample-list-extended tbody tr').on('click', function(sampid) {
    $('#sample-selector-extended').modal('hide');
    d3.select('#sampid').text(sampid);

    d3.json(sample_list[sampid].bp_path, function(error, bps) {
      // Add two to account for SV and consensus tracks.
      var num_methods = bps.methods.length + 2;
      new BpPlotter(num_methods, bps).plot();
    });
  });
}

Interface.prototype._fill_sample_selectors = function(sample_list) {
  var sampids = Object.keys(sample_list).sort();

  var rows = d3.select('#sample-list-extended tbody').html('')
    .selectAll('tr')
    .data(sampids)
    .enter().append('tr');

  rows.append('td').attr('class', 'sampid').text(function(sampid) { return sampid; });
  ['num_consensus_bps', 'num_wsbp', 'num_svs'].forEach(function(stat) {
    rows.append('td').attr('class', stat).text(function(sampid) {
      return sample_list[sampid][stat];
    });
  });
  ['consensus_bps_with_sv', 'svs_with_consensus_bp'].forEach(function(stat) {
    rows.append('td').attr('class', stat).text(function(sampid) {
      return sample_list[sampid][stat].toFixed(3);
    });
  });
}

Interface.prototype._filter = function() {
  var elems = $('#sample-selector-extended tbody').find('tr');
  elems.hide();

  var visible = elems.filter(function() {
    var sampid = $(this).find('.sampid').text().toLowerCase();
    var sample_filter = $('#sample-filter');
    var filter_text = sample_filter.val().toLowerCase();
    return sampid.indexOf(filter_text) !== -1;
  }).show();
}

function main() {
  d3.json("data/index.json", function(error, sample_list) {
    if(error) return console.warn(error);
    new Interface(sample_list);
    $('#sample-selector-extended').modal('show');
  });
}

main();
