#coding: utf-8

import pandas as pd
from IPython.display import HTML, Javascript, display
import numpy as np

def load_js():
	display(Javascript("""require.config({
    paths: {
        'd3': 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.16/d3.min',
        'crossfilter': 'https://cdnjs.cloudflare.com/ajax/libs/crossfilter/1.3.12/crossfilter.min',
        'dc': 'https://cdnjs.cloudflare.com/ajax/libs/dc/2.0.0-beta.32/dc',
    },
    shim: {
        'crossfilter': {
            deps: [],
            exports: 'crossfilter'
        }
    }
    });"""), 
    HTML('<link href="https://cdnjs.cloudflare.com/ajax/libs/dc/1.7.5/dc.min.css" rel="stylesheet" type="text/css">'))
    
def figure(n=4):
	for ii in np.arange(1,n+1):
		body="""<body>"""
		body_post="""</body>"""
		html="""<div id="chart_{num}"></div>""".format(num=ii)
		print "figure"+str(ii)
		#print body+html+body_post
		display(HTML(body+html+body_post))
		
def test():
	display(Javascript("""
	require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {
	var svg = d3.select("#chart_1").append("svg")
      .attr({
        width: 100,
        height: 100,
      });
    svg.append('circle')
    .attr({
      'cx': 50,
      'cy': 50,
      'r': 20,
    });
	})
	"""))

def plot(df=[]):
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	js="""
	var cfdata={data}
	var cf = crossfilter(cfdata);
	//console.log(cfdata)
	"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='index')))
	#print(js)
	chart="""
	var dimType = cf.dimension(function(d) {
	return d.city;
  	});
  	var gpType = dimType.group().reduceCount();
  	var chart_1_obj = dc.pieChart('#chart_1'); 
	chart_1_obj
		.width(100)
		.height(100)
		.dimension(dimType)
		.group(gpType)
		//margins({top: 10, right: 50, bottom: 30, left: 40})
		.cx(100/2)
		.cy(100/2)
		.innerRadius(100/10)
		.slicesCap(5)    // è„à 3éÌÇÃÇ›ï\é¶ÇµÅAå„ÇÕÇªÇÃëºÇ∆Ç∑ÇÈ
		.transitionDuration(500)
		.ordering(function(t){
		return -t.value;
		})
		.legend(dc.legend())
		.label(function(d) {
	  	//console.log('label', d);
	  	return d.key + ': ' + d.value;
		})
		.render();
	//console.log("chart");
	"""
	display(Javascript(begin+js.replace('{data}',df.reset_index().to_json(orient='index'))+chart+end))

def check():
	js="""
	if (typeof variable !== 'undefined') {
    console.log('exists!')
	} else {
	console.log('no!')
	}
	"""
	display(Javascript(js))
