from __future__ import print_function
import os
import glob
import json
import os
import sys
from collections import defaultdict

def calc_stats(bps):
  stats = {
    'num_consensus_bps': 0,
    'num_wsbp': 0,
    'num_svs': 0,
    'consensus_bps_with_sv': 0,
    'svs_with_consensus_bp': 0,
  }

  if 'consensus' in bps['bp']:
    for L in bps['bp']['consensus'].values():
      stats['num_consensus_bps'] += len(L)
      stats['num_wsbp'] += len([B for B in L if B['method'] != 'sv'])
      stats['consensus_bps_with_sv'] += len([B for B in L if B['method'].startswith('sv_')])

  if 'sv' in bps['bp']:
    stats['num_svs'] = sum([len(L) for L in bps['bp']['sv'].values()])
  if stats['num_svs'] > 0:
    stats['svs_with_consensus_bp'] = stats['consensus_bps_with_sv'] / float(stats['num_svs'])
  if stats['num_wsbp'] > 0:
    stats['consensus_bps_with_sv'] = stats['consensus_bps_with_sv'] / float(stats['num_wsbp'])

  return stats

def main():
  datasets = {}

  if len(sys.argv) > 1:
    base_dir = os.path.realpath(sys.argv[1])
  else:
    base_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'data')

  for bpfn in glob.glob(os.path.join(base_dir, '*.json')):
    dataset_name = bpfn.split('/')[-1].split('.')[0]
    if dataset_name in ('index', 'metadata'):
      continue
    with open(bpfn) as bpf:
      bps = json.load(bpf)

    datasets[dataset_name] = {
      'bp_path': 'data/%s.json' % dataset_name,
      'methods': bps['methods'],
    }
    print(dataset_name)
    datasets[dataset_name].update(calc_stats(bps))

  out_path = os.path.join(base_dir, 'index.json')
  with open(out_path, 'w') as outf:
    print(json.dumps(datasets), file=outf)

main()
