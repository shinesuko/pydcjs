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

def set_df(df):
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	js="""
	if (typeof window.cf !== 'undefined') {
	} else {
	window.cfdata={data}
	window.cf = crossfilter(cfdata);
	}
	"""
	end="""})"""
	display(Javascript(begin\
	+js.replace('{data}',df.reset_index().to_json(orient='records'))\
	+end))
	print df.columns

def pieChart(figure=1,width=200,height=200,dim='',group='Count'\
			,cx=100,cy=100,innerRadius=10,slicesCap=5,transitionDuration=500):
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	chart="""
	var dimType = cf.dimension(function(d) {
	return d.{dim};
	});
	var gpType = dimType.group().reduceCount();
	var chart_{figure}_obj = dc.pieChart('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dimType)
		.group(gpType)
		//margins({top: 10, right: 50, bottom: 30, left: 40})
		.cx({cx})
		.cy({cy})
		.innerRadius({innerRadius})
		.slicesCap({slicesCap})
		.transitionDuration(500)
		.ordering(function(t){
		return -t.value;
		})
		.legend(dc.legend())
		.label(function(d) {
		return d.key + ': ' + d.value;
		})
		.render();
	"""
	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{dim}',str(dim))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	.replace('{cx}',str(cx))\
	.replace('{cy}',str(cy))\
	.replace('{innerRadius}',str(innerRadius))\
	.replace('{slicesCap}',str(slicesCap))\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def rowChart(figure=1,width=200,height=200,dim='',group='Count'\
			,xticks=4,elasticX='true',transitionDuration=500):
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	chart="""
	var dimType = cf.dimension(function(d) {
	return d.{dim};
	});
	var gpType = dimType.group().reduceCount();
	var chart_{figure}_obj = dc.rowChart('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dimType)
		.group(gpType)
		.transitionDuration({transitionDuration})
		.elasticX({elasticX})
		.ordering(function(t){
			return -Number(t.value);
		})
		.legend(dc.legend())
		.render();
		//.xAxis().ticks({xticks});
	"""
	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{dim}',str(dim))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	#.replace('{xticks}',str(xticks))\
	.replace('{elasticX}',elasticX)\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def check():
	js="""
	if (typeof window.cf !== 'undefined') {
    console.log('exists!')
	} else {
	console.log('no!')
	}
	"""
	display(Javascript(js))
