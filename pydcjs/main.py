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
    HTML('<link href="https://cdnjs.cloudflare.com/ajax/libs/dc/1.7.5/dc.min.css" rel="stylesheet" type="text/css">'),
    HTML('<link href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.10/components/grid.min.css" rel="stylesheet" type="text/css">'))

def figure(n=4):
	html=""
	for ii in np.arange(1,n+1):
		html+="""<div id="chart_{num}"></div>""".format(num=ii)
	#print "figure"+str(ii)
	#print body+html+body_post
	display(HTML(html))

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
	console.log(cfdata)
	}
	"""
	end="""})"""
	display(Javascript(begin\
	+js.replace('{data}',df.reset_index().to_json(orient='records'))\
	+end))
	print df.columns

def pieChart(figure=1,make_fig=False,width=200,height=200,dim='',group='Count'\
			,cx=100,cy=100,innerRadius=10,slicesCap=5,transitionDuration=500,radius=100):
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	if make_fig:
		html="""<div id="chart_{num}"></div>""".format(num=figure)
		display(HTML(html))
	chart="""
	d3.select("#chart_{figure}")
		.append("text")
		.text("pieCart: {dim}");

	var dim = cf.dimension(function(d) {
	return d.{dim};
	});
	var gp = dim.group().reduceCount();
	var chart_{figure}_obj = dc.pieChart('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dim)
		.group(gp)
		.radius({radius})
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
	.replace('{radius}',str(radius))\
	.replace('{cx}',str(cx))\
	.replace('{cy}',str(cy))\
	.replace('{innerRadius}',str(innerRadius))\
	.replace('{slicesCap}',str(slicesCap))\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def barChart(figure=1,make_fig=False,width=200,height=200,dim='',group='Count'\
			,centerBar='true',xlim=[0,100],ylim=[0,100],gap=10,xticks=5,yticks=5,xlabel=' ',ylabel=' ',elasticX='true',elasticY='true',transitionDuration=500,HorizontalGrid='true',VerticalGrid='true'):
	x_min=xlim[0]
	x_max=xlim[1]
	y_min=ylim[0]
	y_max=ylim[1]
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	if make_fig:
		html="""<div id="chart_{num}"></div>""".format(num=figure)
		display(HTML(html))
	chart="""
	d3.select("#chart_{figure}")
		.append("text")
		.text("barCart: {dim}");
	var dim = cf.dimension(function(d) {
	return d.{dim};
	});
	var gp = dim.group().reduceCount();
	var chart_{figure}_obj = dc.barChart('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dim)
		.group(gp)
		.transitionDuration({transitionDuration})
		.centerBar({centerBar})
		.gap({gap})
		.x(d3.scale.linear().domain([{x_min},{x_max}]))
		.y(d3.scale.linear().domain([{y_min},{y_max}]))
		.renderHorizontalGridLines({HorizontalGrid})
		.renderVerticalGridLines({VerticalGrid})
		.render()
		.yAxisLabel("{ylabel}")
		.xAxisLabel("{xlabel}")
		//.xAxis().ticks({xticks})
		//.yAxis().ticks({xticks})
		.elasticY({elasticY});
		//.elasticX({elasticX});
	dc.renderAll();
	"""
	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{dim}',str(dim))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	.replace('{centerBar}',centerBar)\
	.replace('{gap}',str(gap))\
	.replace('{x_min}',str(x_min))\
	.replace('{x_max}',str(x_max))\
	.replace('{y_min}',str(y_min))\
	.replace('{y_max}',str(y_max))\
	.replace('{VerticalGrid}',VerticalGrid)\
	.replace('{HorizontalGrid}',HorizontalGrid)\
	#.replace('{xticks}',str(xticks))\
	#.replace('{yticks}',str(yticks))\
	.replace('{xlabel}',str(xlabel))\
	.replace('{ylabel}',str(ylabel))\
	#.replace('{elasticX}',elasticX)\
	.replace('{elasticY}',elasticY)\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def lineChart(figure=1,make_fig=False,width=200,height=200,dim='',group='Count'\
			,xlim=[0,100],ylim=[0,100],xticks=5,yticks=5,xlabel=' ',ylabel=' '\
			,elasticX='true',elasticY='true',transitionDuration=500,\
			HorizontalGrid='true',VerticalGrid='true',renderArea='false'):
	x_min=xlim[0]
	x_max=xlim[1]
	y_min=ylim[0]
	y_max=ylim[1]
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	if make_fig:
		html="""<div id="chart_{num}"></div>""".format(num=figure)
		display(HTML(html))
	chart="""
	d3.select("#chart_{figure}")
		.append("text")
		.text("lineCart: {dim}");
	var dim = cf.dimension(function(d) {
	return d.{dim};
	});
	var gp = dim.group().reduceCount();
	var chart_{figure}_obj = dc.lineChart('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dim)
		.group(gp)
		.transitionDuration({transitionDuration})
		.x(d3.scale.linear().domain([{x_min},{x_max}]))
		.y(d3.scale.linear().domain([{y_min},{y_max}]))
		.renderHorizontalGridLines({HorizontalGrid})
		.renderVerticalGridLines({VerticalGrid})
		.renderArea({renderArea})
		.render()
		.yAxisLabel("{ylabel}")
		.xAxisLabel("{xlabel}")
		//.xAxis().ticks({xticks})
		//.yAxis().ticks({xticks})
		.elasticY({elasticY});
		//.elasticX({elasticX});
	dc.renderAll();
	"""
	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{dim}',str(dim))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	.replace('{x_min}',str(x_min))\
	.replace('{x_max}',str(x_max))\
	.replace('{y_min}',str(y_min))\
	.replace('{y_max}',str(y_max))\
	.replace('{VerticalGrid}',VerticalGrid)\
	.replace('{HorizontalGrid}',HorizontalGrid)\
	.replace('{renderArea}',renderArea)\
	#.replace('{xticks}',str(xticks))\
	#.replace('{yticks}',str(yticks))\
	.replace('{xlabel}',xlabel)\
	.replace('{ylabel}',ylabel)\
	#.replace('{elasticX}',elasticX)\
	.replace('{elasticY}',elasticY)\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def scatterPlot(figure=1,make_fig=False,width=200,height=200,dim=['',''],group='Count'\
			,xlim=[0,100],ylim=[0,100],symbolSize=5,elasticY='true',transitionDuration=500,\
			HorizontalGrid='true',VerticalGrid='true',xlabel='x',ylabel='y',xscale='linear',yscale='linear'):
	x_min = xlim[0]
	x_max = xlim[1]
	y_min = ylim[0]
	y_max = ylim[1]
	dim1  = dim[0]
	dim2  = dim[1]

	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	if make_fig:
		html="""<div id="chart_{num}"></div>""".format(num=figure)
		display(HTML(html))
	chart="""
	d3.select("#chart_{figure}")
		.append("text")
		.text("scatterPlott: {dim1},{dim2}");
	var dim = cf.dimension(function(d) {
	return [d.{dim1}, d.{dim2}];
	});
	var gp = dim.group().reduceCount();
	var chart_{figure}_obj = dc.scatterPlot('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dim)
		.group(gp)
		.transitionDuration({transitionDuration})
		.x(d3.scale.{xscale}().domain([{x_min},{x_max}]))
		.y(d3.scale.{yscale}().domain([{y_min},{y_max}]))
		.renderHorizontalGridLines({HorizontalGrid})
		.renderVerticalGridLines({VerticalGrid})
		.brushOn(true)
		.xAxisLabel("{xlabel}")
		.yAxisLabel("{ylabel}")
		.symbolSize({symbolSize})
		//.clipPadding(10)
		.render()
		.elasticY({elasticY});
		//.elasticX({elasticX});
	dc.renderAll();
	"""
	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{dim1}',str(dim1))\
	.replace('{dim2}',str(dim2))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	.replace('{x_min}',str(x_min))\
	.replace('{x_max}',str(x_max))\
	.replace('{y_min}',str(y_min))\
	.replace('{y_max}',str(y_max))\
	.replace('{VerticalGrid}',VerticalGrid)\
	.replace('{HorizontalGrid}',HorizontalGrid)\
	.replace('{symbolSize}',str(symbolSize))\
	.replace('{elasticY}',elasticY)\
	.replace('{xlabel}',str(xlabel))\
	.replace('{ylabel}',str(ylabel))\
	.replace('{yscale}',yscale)\
	.replace('{xscale}',xscale)\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def bubbleChart(figure=1,make_fig=False,width=200,height=200,dim=['','',''],group='Count'\
			,xlim=[0,100],ylim=[0,100],rlim=[1,100],elasticY='true',transitionDuration=500,\
			HorizontalGrid='true',VerticalGrid='true',xlabel='x',ylabel='y'):
	x_min = xlim[0]
	x_max = xlim[1]
	y_min = ylim[0]
	y_max = ylim[1]
	r_min = rlim[0]
	r_max = rlim[1]
	dim1  = dim[0]
	dim2  = dim[1]
	dim3  = dim[2]

	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	if make_fig:
		html="""<div id="chart_{num}"></div>""".format(num=figure)
		display(HTML(html))
	chart="""
	d3.select("#chart_{figure}")
		.append("text")
		.text("bubbleChart: {dim1},{dim2},{dim3}");
	var dim = cf.dimension(function(d) {
	return [d.{dim1}, d.{dim2}, d.{dim3}];
	});
	var gp = dim.group().reduceCount();
	var chart_{figure}_obj = dc.bubbleChart('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dim)
		.group(gp)
		.transitionDuration({transitionDuration})
		.keyAccessor(function(d){return d.key[0];})
		.valueAccessor(function(d){return d.key[1];})
		.radiusValueAccessor(function(d){return d.value})
		//.elasticRadius(true)
		.x(d3.scale.linear().domain([{x_min},{x_max}]))
		.y(d3.scale.linear().domain([{y_min},{y_max}]))
		.renderHorizontalGridLines({HorizontalGrid})
		.renderVerticalGridLines({VerticalGrid})
		.brushOn(true)
		.r(d3.scale.log().domain([{r_min},{r_max}]))
		.xAxisLabel("{xlabel}")
		.yAxisLabel("{ylabel}")
		//.clipPadding(10)
		.label(function(d) {
		return '('+ d.key[0] + ',' + d.key[1] + ')' + ':' + d.value;
		//return d.value;
		})
		.render()
		.elasticY({elasticY});
		//.elasticX({elasticX});
	dc.renderAll();
	"""
	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{dim1}',str(dim1))\
	.replace('{dim2}',str(dim2))\
	.replace('{dim3}',str(dim3))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	.replace('{x_min}',str(x_min))\
	.replace('{x_max}',str(x_max))\
	.replace('{y_min}',str(y_min))\
	.replace('{y_max}',str(y_max))\
	.replace('{r_min}',str(r_min))\
	.replace('{r_max}',str(r_max))\
	.replace('{VerticalGrid}',VerticalGrid)\
	.replace('{HorizontalGrid}',HorizontalGrid)\
	.replace('{elasticY}',elasticY)\
	.replace('{xlabel}',str(xlabel))\
	.replace('{ylabel}',str(ylabel))\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def rowChart(figure=1,make_fig=False,width=200,height=200,dim='',group='Count'\
			,xticks=4,elasticX='true',transitionDuration=500,gap=10):
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	#print(js.replace('{data}',df.reset_index().to_json(orient='records')))
	#print(js)
	if make_fig:
		html="""<div id="chart_{num}"></div>""".format(num=figure)
		display(HTML(html))

	chart="""
	d3.select("#chart_{figure}")
		.append("text")
		.text("rowCart: {dim}")
		.attr("id","chart_{figure}_text");
	var dim = cf.dimension(function(d) {
	return d.{dim};
	});
	var gp = dim.group().reduceCount();
	var chart_{figure}_obj = dc.rowChart('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dim)
		.group(gp)
		.transitionDuration({transitionDuration})
		.elasticX({elasticX})
		.legend(dc.legend())
		//.gap({gap})
		//.xAxisLabel("{xlabel}")
		.render()
		//.yAxisLabel("{ylabel}");
		//.xAxis().ticks({xticks});
	dc.renderAll();
	"""
	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{dim}',str(dim))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	#.replace('{xlabel}',str(xlabel))\
	#.replace('{ylabel}',str(ylabel))\
	#.replace('{xticks}',str(xticks))\
	.replace('{elasticX}',elasticX)\
	.replace('{gap}',str(gap))\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

def heatmap(figure=1,make_fig=False,width=200,height=200,dim=['','',''],group='Count'\
			,transitionDuration=500,xlabel='x',ylabel='y',clim=[0,100],colormap=['blue','red']):
	dim1  = dim[0]
	dim2  = dim[1]
	dim3  = dim[2]
	clim1 = clim[0]
	clim2 = clim[1]
	color1= colormap[0]
	color2= colormap[1]
	if make_fig:
		html="""<div id="chart_{num}"></div>""".format(num=figure)
		display(HTML(html))
	begin="""require(['d3', 'crossfilter', 'dc'], function(d3, crossfilter, dc) {"""
	end="""})"""
	chart="""
	var dim = cf.dimension(function(d) {
	return [d.{dim1}, d.{dim2}];
	});
	var heatColorMapping = function(d){
		return d3.scale.linear().domain([{clim1},{clim2}]).range(["{color1}","{color2}"])(d);
	};
	heatColorMapping.domain = function(d){
		return [{clim1},{clim2}];
	};
	var gp = dim.group().reduce(
	function(p,v){
		++p.count;
		p.sum+=Number(v.{dim3});
		p.ave =p.count ? (p.sum/p.count):0;
		return p;
		},
	function(p,v){
		--p.count;
		p.sum-=Number(v.{dim3});
		p.ave =p.count ? (p.sum/p.count):0;
		return p;
		},
	function(p){return{
		count:0,
		sum:0,
		ave:0};}
	)
	var chart_{figure}_obj = dc.heatMap('#chart_{figure}');
	chart_{figure}_obj
		.width({width})
		.height({height})
		.dimension(dim)
		.group(gp)
		.keyAccessor(function(d){return +d.key[0]})
		.valueAccessor(function(d){return +d.key[1]})
		.colorAccessor(function(d){return +d.value.ave})
		.colors(heatColorMapping)
		.calculateColorDomain()
		.transitionDuration({transitionDuration})
		.label(function(d){
			return [d.key[0],d.key[1],d.value.ave];
		});
	chart_{figure}_obj
		//.xAxisLabel("{xlabel}")
		//.yAxisLabel("{ylabel}")
		.xBorderRadius(0)
		.yBorderRadius(0)
		.render()
	"""

	display(Javascript(begin\
	+chart\
	.replace('{figure}',str(figure))\
	.replace('{width}',str(width))\
	.replace('{height}',str(height))\
	.replace('{dim1}',str(dim1))\
	.replace('{dim2}',str(dim2))\
	.replace('{dim3}',str(dim3))\
	.replace('{clim1}',str(clim1))\
	.replace('{clim2}',str(clim2))\
	.replace('{color1}',str(color1))\
	.replace('{color2}',str(color2))\
	.replace('{width}',str(width))\
	.replace('{xlabel}',str(xlabel))\
	.replace('{ylabel}',str(ylabel))\
	.replace('{transitionDuration}',str(transitionDuration))\
	+end))

	# print chart\
	# .replace('{figure}',str(figure))\
	# .replace('{width}',str(width))\
	# .replace('{height}',str(height))\
	# .replace('{dim1}',str(dim1))\
	# .replace('{dim2}',str(dim2))\
	# .replace('{dim3}',str(dim3))\
	# .replace('{clim1}',str(clim1))\
	# .replace('{clim2}',str(clim2))\
	# .replace('{color1}',str(color1))\
	# .replace('{color2}',str(color2))\
	# .replace('{width}',str(width))\
	# .replace('{xlabel}',str(xlabel))\
	# .replace('{ylabel}',str(ylabel))\
	# .replace('{transitionDuration}',str(transitionDuration))

def check():
	js="""
	if (typeof window.cf !== 'undefined') {
    console.log('exists!')
	} else {
	console.log('no!')
	}
	"""
	display(Javascript(js))
