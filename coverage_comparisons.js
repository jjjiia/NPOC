$(document).ready(function() {
    $('.js-example-basic-single').select2();
});

//"F_THEME1","F_THEME2", "F_THEME3", "F_THEME4"
var map;
var detailMap;
var themesDefinitions ={
    "SPL_THEME1":"Sum of series for Socioeconomic",
    "RPL_THEME1":"Percentile ranking for Socioeconomic",
    "SPL_THEME2":"Sum of series for Household Composition",
    "RPL_THEME2":"Percentile ranking for Household Composition",
    "SPL_THEME3":"Sum of series for Minority Status/Language",
    "RPL_THEME3":"Percentile ranking for series for Minority Status/Language",
    "SPL_THEME4":"Sum of series for Housing Type/Transportation",
    "RPL_THEME4":"Percentile ranking for Housing Type/Transportation",
    "SPL_THEMES":"Sum of series themes", 
    "RPL_THEMES":"Overall percentile ranking for themes"
}
var currentCapacity = 30
var pub = {
    coverage:"base_case_capacity_"+currentCapacity,
    aiannh:false,
    prison:false,
    satellite:false,
    tract_svi:false,
    all:null,
    centroids:null,
    histo:null,
    pair:"SVIXXXCovid",
    states:null
}
var highlightColor = "#DF6D2A"
var bghighlightColor = "gold"
var outlineColor = "#DF6D2A"
var colors = {
hotspot:["#A7DCDF","#6EAFC3","#3983A8","#02568B"],
SVI:["#A7DCDF","#6EAFC3","#3983A8","#02568B"],
hotspotSVI:["#A7DCDF","#6EAFC3","#3983A8","#02568B"],
highDemand:["#A7DCDF","#6EAFC3","#3983A8","#02568B"]}

var minCoverage = 10
var maxCoverage = 80
var coverageInterval = 10

var colorEnd = "#6FAFC4"
var colorStart = "#E27C3B"
//var colorStart = "#FBD33C"
var colorStart = "#604F23"

//"priority_high_demand","priority_SVI_hotspot","priority_SVI_pop","priority_hotspot"

var keyColors = {high_demand:"#EA00FF",SVI_hotspot:"#F45180",SVI_pop:"#45B6A3",hotspot:"#7E6EFF",SVI_high_demand:"#71BF4D"}
//var keyColors = {high_demand:"#fccc0a",SVI_hotspot:"#996633",SVI_pop:"#0039a6",hotspot:"#00933c",SVI_high_demand:"#b933ad"}
//var keyColors ={high_demand:"#437337",SVI_hotspot:"#c8b046",SVI_pop:"#63bb91",hotspot:"#837632",SVI_high_demand:"#6dbf45"}
//var keyColors = {high_demand:"#717b44",SVI_hotspot:"#79db55",SVI_pop:"#c3d59a",hotspot:"#ccd149",SVI_high_demand:"#619f46"}

var keyColors = {
    SVI:"#70ca7c",
SVI_med:"#44caaf",
Covid:"#6fac38",
Covid_med:"#cb983f",
YPLL:"#d6be3d",
    YPLL_med:"#569f3d",
Unemployment:"#71d770",
Unemployment_med:"#bec23f",
Covid_capita:"#eb9519",
Covid_capita_med:"#e8b72b"
}

 var measureSet = [
     "SVI",
   "Covid",
     "YPLL",
     "Unemployment",
     "Covid_capita",
     "SVI_med",
   "Covid_med",
     "YPLL_med",
     "Unemployment_med",
     "Covid_capita_med"
]
 
function histo(){
var histo = d3.histogram()
    .value(function(d){
        if(d.properties[pub.strategy+"_"+pub.coverage+"_group"]==undefined){
            return 999
        }else{
            return d.properties[pub.strategy+"_"+pub.coverage+"_group"]//.replace("_","")
        }
    })
    .domain([1,10])
    .thresholds(9)
        
var bins = histo(pub.all.features)
    return bins
}

function toTitleCase(str){
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

var countyCentroids = d3.json("county_centroids.geojson")
var counties = d3.json("counties.geojson")
//var aiannh = d3.json("indian_reservations.geojson")
var allData = d3.csv("County_level_proportional_allocation_for_all_policies.csv")
var timeStamp = d3.csv("https://raw.githubusercontent.com/CenterForSpatialResearch/allocation_chw/master/Output/time_stamp.csv")
var states = d3.json("simplestates.geojson")

var coverageSet = []
var coverageDisplayText = {show_all:"Hide Coverage Info"}
for(var c = 1; c<=8; c++){
    var setTerm = "base_case_capacity_"+c*10
     coverageSet.push(setTerm)
    coverageDisplayText[setTerm] = c*10+' CHW per 100,000 residents'
 }

// //var measureSet = ["percentage_scenario_SVI_pop","percentage_scenario_SVI_hotspot","percentage_scenario_hotspot","percentage_scenario_high_demand"]
//  var measureSet = ["percentage_scenario_SVI_pop","percentage_scenario_high_demand","percentage_scenario_SVI_high_demand","percentage_scenario_hotspot",
//  "percentage_scenario_SVI_hotspot"
//  ]
 
 var measureDisplayText = {
     percentage_scenario_high_demand:"New cases",
     percentage_scenario_SVI_high_demand:"SVI + new cases",
     percentage_scenario_hotspot:"New cases per capita",
     percentage_scenario_SVI_pop:"SVI",
     percentage_scenario_SVI_hotspot:"SVI + new cases per capita"
 }
Promise.all([counties,countyCentroids,allData,timeStamp,states])
.then(function(data){
    ready(data[0],data[1],data[2],data[3],data[4])
})

var lineOpacity = {stops:[[0,1],[100,0.3]]}
var lineWeight = {stops:[[-1,0],[-0.01,0],[0,2],[99,.5],[100,0]]}

var fillColor = {
        property:null,
        stops:[
            [0,"#A7DCDF"],
            [.005,"#6EAFC3"],
            [.03,"#3983A8"],
            [.1,"#02568B"]]
}

var centroids = null
var latestDate = null

function ready(counties,centroids,modelData,timeStamp,states){
    pub.states = states
    d3.select("#date").html("Model run as of "+timeStamp["columns"][1])
    var processed = turnToDictFIPS(modelData,"County_FIPS")
    var comparisonsKeys = processed[1]
   // console.log(comparisonsKeys)
    var dataByFIPS = processed[0]
    var combinedGeojson = combineGeojson(dataByFIPS,counties)
    pub.all = combinedGeojson
    drawMap(combinedGeojson,comparisonsKeys)
   
};


function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
//var comparisonsSet = []
function turnToDictFIPS(data,keyColumn){
//var prioritySet = ["priority_high_demand","priority_SVI_hotspot","priority_SVI_pop","priority_hotspot"]
    
    var minCoverage = 10
    var maxCoverage = 80
    var coverageInterval = 10
    

    var newDict = {}
    var maxPriority = 0
    var keys = Object.keys(data[0])

    for(var i in data){
        var key = String(data[i][keyColumn])
        if(key.length==4){
            key= "0"+key
        }
        var newKeys = []
        newDict[key]=data[i]
            // var values = data[i]
            for(var j in measureSet){
                var k1 = ("Proportional_allocation_to_"+measureSet[j])
                var v1 = parseFloat(data[i][k1])
                newDict[key][k1]=v1
                for(var k in measureSet){
                    var k2 =("Proportional_allocation_to_"+measureSet[k])
                    var v2 = parseFloat(data[i][k2])
                    var index1 = j
                    var index2 = k
                    if(index1!=index2){
                        if(index1<index2){
                                var compareKey = "compare_"+k1.replace("Proportional_allocation_to_","")+"XXX"+k2.replace("Proportional_allocation_to_","")
                              
                                    newDict[key][compareKey]=v1-v2
                            
                                if(newKeys.indexOf(compareKey)==-1){
                                    newKeys.push(compareKey)                            
                                }
                            }else{
                                var compareKey = "compare_"+k2.replace("Proportional_allocation_to_","")+"XXX"+k1.replace("Proportional_allocation_to_","")
                                newDict[key][compareKey]=v2-v1
                                if(newKeys.indexOf(compareKey)==-1){
                                    newKeys.push(compareKey)                            
                                }
                            }
                    }
            }
        }
    }
    var comparisonsSet = newKeys
    return [newDict,comparisonsSet]
}

function combineGeojson(all,counties){
    for(var c in counties.features){
        var countyFIPS = counties.features[c].properties.FIPS
        var data = all[countyFIPS]
       // console.log(data)
        
        counties.features[c]["id"]=countyFIPS
        
        if(data!=undefined){            
            var keys = Object.keys(data)
            for(var k in keys){
                var key = keys[k]
                if(isNaN(parseFloat(value))!=true && key!="County_FIPS"){
                     var value = parseFloat(data[key])
                 }else{
                     var value = data[key]
                 }
                counties.features[c].properties[key]=value
            }
        }
    }
    return counties
}

function drawGrid(map,comparisonsSet){
    var drawn = []
    var svg = d3.select("#comparisonGrid").append("svg").attr("width",290).attr("height",300)
    var gridSize = 15
    for(var i in measureSet){
            var x = i*gridSize+140
            var y = 130
                svg.append("text")
                .text(measureSet[i])
                .attr("x",x)
                .attr("y",y)
                .style("font-size","12px")
                .attr("transform","rotate(-90 "+x+","+y+")")
                .attr("fill",keyColors[measureSet[i]])
        
        for(var j in measureSet){
            if(i==0){
                svg.append("text")
                .text(measureSet[j])
                .style("font-size","12px")
                .attr("x",i)
                .attr("y",j*gridSize+gridSize/2)
                .attr("transform","translate(125,135)")
                .attr("text-anchor","end")
                .attr("fill",keyColors[measureSet[j]])
            }
            
            if(j!=i){
                if(i<j){
                    var key = "compare_"+measureSet[i]
                    +"XXX"+measureSet[j]
                }else{
                    var key = "compare_"+measureSet[j]
                    +"XXX"+measureSet[i]
                }
                if(comparisonsSet.indexOf(key)>-1 && drawn.indexOf(key)==-1){
                    svg.append("rect")
                        .attr("width",gridSize-4)
                        .attr("height",gridSize-4)
                        .attr("x",gridSize*j)
                        .attr("y",gridSize*i)
                        .attr("id",key.replace("compare_",""))
                        .attr("class","grid")
                        .attr("transform","translate(130,135)")
                        .attr("cursor","pointer")
                        .on("click",function(){
                            var id = d3.select(this).attr("id")
                          //  var key = "compare_"+id.split("XXX")[0]+"_"+currentCapacity+"_"+id.split("XXX")[1]+"_"+currentCapacity
                            pub.pair = id
                            colorMap(map,id)
                            d3.selectAll(".grid").attr("fill","black")
                            d3.select(this).attr("fill","gold")
                            
                            drawKey(d3.select(this).attr("id"))
                        })
                        drawn.push(key)
                    }else{
                    svg.append("rect")
                        .attr("width",gridSize-6)
                        .attr("height",gridSize-6)
                        .attr("x",gridSize*j)
                        .attr("y",gridSize*i)
                        .attr("transform","translate(130,135)")
                        .attr("fill","none")
                        .attr("stroke","#ddd")
                    }
            }else{
                    svg.append("rect")
                        .attr("width",gridSize-6)
                        .attr("height",gridSize-6)
                        .attr("x",gridSize*j)
                        .attr("y",gridSize*i)
                        .attr("transform","translate(130,135)")
                        .attr("fill","none")
                        .attr("stroke","#ddd")
            }
        }
    }
}
function drawKey(key){
    d3.select("#comparisonKey svg").remove()
    var width = 270
    // compare_percentage_scenario_
  //   high_demand
  //   _base_case_capacity_30_percentage_scenario_
  //   SVI_pop
  //   _base_case_capacity_30
    var k1 = key.split("XXX")[0]//.replace("_base_case_capacity_"+currentCapacity,"")
    var k2 = key.split("XXX")[1]//.replace("_base_case_capacity_"+currentCapacity,"")
   // console.log([k1,k2])
    var svg = d3.select("#comparisonKey").append("svg")
        .attr("width",width).attr('height',120)
    var defs = svg.append("defs");
    var gradient = defs.append("linearGradient")
       .attr("id", "svgGradient")
       .attr("x1", "0%")
       .attr("x2", "100%")
       .attr("y1", "0%")
       .attr("y2", "0%");

    gradient.append("stop")
       .attr('class', 'start')
       .attr("offset", "0%")
       .attr("stop-color", keyColors[k1])
       .attr("stop-opacity", 1);

    gradient.append("stop")
       .attr('class', 'end')
       .attr("offset", "40%")
       .attr("stop-color", "white")
       .attr("stop-opacity", 1);
    gradient.append("stop")
       .attr('class', 'end')
       .attr("offset", "60%")
       .attr("stop-color", "white")
       .attr("stop-opacity", 1);
    gradient.append("stop")
       .attr('class', 'end')
       .attr("offset", "100%")
       .attr("stop-color", keyColors[k2])
       .attr("stop-opacity", 1);
       
    svg.append("text").text("More workers by".toUpperCase()).attr("y",18).attr("x",20)
       .attr("fill","#000").style("font-size","12px").style("font-weight","bold").attr("fill",keyColors[k1])
       
    svg.append("text").text("More workers by".toUpperCase()).attr("y",18).attr("x",width)
       .attr("fill","#000").style("font-size","12px").attr("text-anchor","end").style("font-weight","bold").attr("fill",keyColors[k2])

    svg.append("text").text(k1.toUpperCase()).attr("y",40).attr("x",20).style("font-size","12px").style("font-weight","bold").attr("fill",keyColors[k1])//.attr("fill",keyColors[k1])
    svg.append("text").text(k2.toUpperCase()).attr("y",40).attr("x",width).style("font-size","12px").style("font-weight","bold").attr("text-anchor","end").attr("fill",keyColors[k2])//.attr("fill",keyColors[k2])
    svg.append("text").text("no difference".toUpperCase()).attr("y",75).attr("x",width/2).attr("text-anchor","middle").style("font-size","12px").style("font-weight","bold")
    svg.append("rect")
    .attr("class","key")
    .attr('width',width)
    .attr('height',10)
    .attr("x",20)
    .attr("y",50)
    .attr("fill","url(#svgGradient)")
       .attr("stroke","rgba(0,0,0,.5)")
       .attr("stroke-width",.1)
    
    
svg.append("rect").attr("width",20).attr("height",20).attr("x",20).attr("y",90).attr("fill","#ddd")
svg.append("text").attr("x",45).attr("y",103).text("Counties with no recorded cases")
    
    
}
function colorMap(map,key){
    //console.log(key)
   // console.log(currentCapacity)
    var measureStart = key.split("XXX")[0]
    var measureEnd = key.split("XXX")[1]
    var colorStart = keyColors[measureStart]
    var colorEnd = keyColors[measureEnd]
 //
    var dataProperty = "compare_"+key
    var color = {property:dataProperty,stops:[[-100,colorStart],[0,"#fff"],[100,colorEnd]]}
    map.setPaintProperty("counties", 'fill-color', color)
    
}
function drawMap(data,comparisonsKeys){
//	mapboxgl.accessToken = 'pk.eyJ1Ijoic2lkbCIsImEiOiJkOGM1ZDc0ZTc5NGY0ZGM4MmNkNWIyMmIzNDBkMmZkNiJ9.Qn36nbIqgMc4V0KEhb4iEw';    
    mapboxgl.accessToken = "pk.eyJ1IjoiYzRzci1nc2FwcCIsImEiOiJja2J0ajRtNzMwOHBnMnNvNnM3Ymw5MnJzIn0.fsTNczOFZG8Ik3EtO9LdNQ"//new account
 var maxBounds = [
 [-190,8], // Southwest coordinates
 [-20, 74] // Northeast coordinates
 ];
var bounds = [[-130, 26], 
     [-40, 50]
 ] 
 
 d3.select("#map").style("width",window.innerWidth+"px")
          .style("height",window.innerHeight+"px")
 map = new mapboxgl.Map({
      container: 'map',
    // style:"mapbox://styles/c4sr-gsapp/ckcl1av4c083d1irpftb75l6j",//dare
     style:"mapbox://styles/c4sr-gsapp/ckcnnqpsa2rxx1hp4fhb1j357",//dare2
	//style: "mapbox://styles/sidl/ckbsbi96q3mta1hplaopbjt9s",
	//style:"mapbox://styles/c4sr-gsapp/ckc4s079z0z5q1ioiybc8u6zp",//new account
     //center:[-100,37],
     bounds:bounds,
      zoom: 3.8,
      preserveDrawingBuffer: true,
     minZoom:3.5,
    maxBounds: maxBounds    
  });
    
     map.on("load",function(){        
         zoomToBounds(map)
         //map.setLayoutProperty("mapbox-satellite", 'visibility', 'none');
         map.addSource("counties",{
             "type":"geojson",
             "data":data
         })
         
         map.addLayer({
             'id': 'county_outline',
             'type': 'line',
             'source': 'counties',
             'paint': {
                 'line-color':"#000",
                 'line-opacity':[
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    .05
                 ],
                 'line-width':[
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    2,
                    1
                 ]
             },
             'filter': ['==', '$type', 'Polygon']
         },"ST-OUTLINE");
               //    },"country-label");
         map.addLayer({
             'id': 'counties',
             'type': 'fill',
             'source': 'counties',
             'paint': {
             'fill-color': "#fff",
                 'fill-opacity':.05
             },
             'filter': ['==', '$type', 'Polygon']
         },"county_outline");
         
         
         drawGrid(map,comparisonsKeys)
         coverageMenu(map)
         colorMap(map,pub.pair)
         d3.select("#"+pub.pair).attr("fill","gold")
         drawKey(pub.pair)
         PopulateDropDownList(pub.states.features,map) 
         
         
         //var color = {property:"priority_high_demand",stops:[[-1,0],[0,1]]}
         
         //map.setPaintProperty("counties","fill-opacity",{property:"percentage_scenario_hotspot_base_case_capacity_30",stops:[[-1,0],[0,1]]})
         
         var filter = ["!=","percentage_scenario_SVI_hotspot_base_case_capacity_"+currentCapacity,-1]
         map.setFilter("counties",filter)
         
        //lineOpacity["property"]=pub.strategy+"_"+pub.coverage
       // lineWeight["property"]=pub.strategy+"_"+pub.coverage
        //fillColor["property"]=pub.pai
     
         map.setPaintProperty("counties", 'fill-opacity',1)
        // map.setPaintProperty("counties", 'fill-color',fillColor)
              //var matchString = ["match",["get",pub.strategy+"_"+pub.coverage+"_group"]].concat(groupColorDict)
              //console.log(matchString)
              
             //  map.setPaintProperty("counties", 'fill-color', matchString)  
         
        // d3.select("."+pub.coverage+"_radialC").style("background-color",highlightColor).style("border","1px solid "+ highlightColor)
 //        d3.selectAll("."+pub.coverage).style("color",highlightColor)
 //        d3.selectAll("."+pub.strategy).style("color",highlightColor)
 //        d3.selectAll("."+pub.strategy+"_radialS").style("background-color",highlightColor).style("border","1px solid "+ highlightColor)
 //   
     })

    
     var popup = new mapboxgl.Popup({
         closeButton: false,
         closeOnClick: false
     });     
      var hoveredStateId = null;
     
     var firstMove = true
                  
     map.on('mousemove', 'counties', function(e) {
         var feature = e.features[0]
         map.getCanvas().style.cursor = 'pointer'; 
         if(feature["properties"].FIPS!=undefined){
             if (hoveredStateId) {
             map.setFeatureState(
             { source: 'counties', id: hoveredStateId },
             { hover: false }
             );
             }
             hoveredStateId = e.features[0].id;
             map.setFeatureState(
             { source: 'counties', id: hoveredStateId },
             { hover: true }
             );
             
             
             var x = event.clientX;     // Get the horizontal coordinate
             var y = event.clientY;             
             
             var x = event.clientX+20;     // Get the horizontal coordinate
             var y = event.clientY+20;             
             var w = window.innerWidth;
             var h = window.innerHeight;
             if(x+200>w){
                 x = x-280
             }
             if(y+300>h){
                 y= y-320
             }
              d3.select("#mapPopupCompare").style("visibility","visible")
              .style("left",x+"px")
              .style("top",(y+20)+"px") 
             
             var countyName = feature["properties"]["county"]+" County, "+feature["properties"]["stateAbbr"]
             var population = feature["properties"]["totalPopulation"]
             var geometry = feature["geometry"]
             var countyId = feature["properties"]["FIPS"]
             
             var displayString = countyName+"<br>Population: "+population
             
             var chartData = []
                         //
              for(var p in measureSet){
                  var pk = "Proportional_allocation_to_"+measureSet[p]
                  var pv = feature["properties"][pk]
                 // displayString+=pk+": "+pv+"<br>"
                  chartData.push({axis:pk,value:pv})
              }
             d3.select("#mapPopupCompare").html(displayString)
             drawChart(chartData)
         }       
         
         map.on("mouseleave",'counties',function(){
             d3.select("#mapPopupCompare").style("visibility","hidden")

         })  
     
         var coordinates = geometry.coordinates[0]
         
         var bounds = coordinates.reduce(function(bounds, coord) {
                 return bounds.extend(coord);
             }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
      

     });
    
}
function drawChart(data){
    var min = 9999
    var max = 0
    var minKey = null
    var maxKey = null
    
   // console.log(pub.pair)
    var label =  d3.select("#mapPopupCompare").html()+"<br>"
    
    for(var i in data){
        label += data[i].axis.replace("Proportional_allocation_to_","")+": "+Math.ceil(data[i].value)+"<br>"
        if(data[i].value>max){
            max = Math.ceil(data[i].value)
            maxKey = data[i].axis.replace("Proportional_allocation_to_","")
        }else if(data[i].value<min){
            min = Math.ceil(data[i].value)
            minKey = data[i].axis.replace("Proportional_allocation_to_","")
        }
    }
    var range = Math.round(max-min)
    
    var barHeight = 35
    var xScale = d3.scaleLinear().domain([0,range]).range([2,100])
   // console.log(data)

    d3.select("#mapPopupCompare")
    .html(label
        +"<br>  Prioritizing by <strong>"+maxKey+"</strong> would allocate <strong>"+max+" CHWs</strong>, the most number of workers to the county"
        +"<br> Prioritizing by <strong>"+minKey+"</strong> would allocate <strong>"+min+" CHWs</strong>, the least."
        +"<br> <strong>There is a "+range+" worker difference.</strong>")

    
        //
    // var svg = d3.select("#mapPopupCompare").append("svg").attr("class","chart").attr("width",200).attr("height",250)
    // svg.selectAll("rect")
    // .data(data)
    // .enter()
    // .append("rect")
    // .attr("width",function (d,i){
    //     return 10
    // })
    // .attr("height",2)
    // .attr("x",40)
    // .attr("y",function(d,i){return xScale(d.value)})
    // .attr("opacity",.4)
    //
    // svg.selectAll("text")
 //        .data(data)
 //        .enter()
 //        .append("text")
 //        .text(function (d,i){
 //            return d.axis.replace("Proportional_allocation_to_")
 //        })
 //        .attr("x",40)
 //        .attr("y",function(d,i){return xScale(d.value)})
    
    // svg.selectAll(".textValue")
  //       .data(data)
  //       .enter()
  //       .append("text")
  //       .text(function (d,i){
  //           return Math.round(d.value)
  //       })
  //       .attr("x",35)
  //       .style("font-size","14px")
  //       .attr("y",function(d,i){return xScale(d.value)})
  //       .attr("text-anchor","end")
}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function coverageMenu(map){
    var w = 250
    var h = 200
    var svg = d3.select("#coverageMenu").append("svg").attr("width",w).attr("height",h)
    var startCoverage = pub.coverage.split("_")[3]
    var coverageDisplay = svg.append("text").text(startCoverage).style("font-size","70px").attr("x",40).attr("y",80)
    var plus = svg.append("text").text("+10").style("font-size","14px").attr("x",130).attr("y",40).style("font-weight","bold")
    .style('cursor',"pointer")
    
    .on("click",function(){
        var newCoverage = parseInt(pub.coverage.split("_")[3])+10
        if(newCoverage>80){
            newCoverage=80
        }
        currentCapacity = newCoverage
        if(newCoverage <=80){
            var key = pub.pair.split(parseInt(pub.coverage.split("_")[3])).join(newCoverage)
            pub.pair = key
            pub.coverage = pub.coverage.replace(pub.coverage.split("_")[3],newCoverage)
            coverageDisplay.text(newCoverage)
            minus.attr("fill","#000")
            colorMap(map,key)
        }
        if(newCoverage==80){
            d3.select(this).attr("fill","#aaa")
        }
        
    })
    
    var minus = svg.append("text").text("-10").style("font-size","14px").attr("x",130).attr("y",80).style("font-weight","bold")
    .style('cursor',"pointer")
        .on("click",function(){
            var newCoverage = parseInt(pub.coverage.split("_")[3])-10
            if(newCoverage<10){
                newCoverage=10
            }
        currentCapacity = newCoverage
            
            if(newCoverage >=10){
                var key = pub.pair
                
                pub.coverage = pub.coverage.replace(pub.coverage.split("_")[3],newCoverage)
                coverageDisplay.text(newCoverage)
                plus.attr("fill","#000")
                colorMap(map,key)
            }
            if(newCoverage==10){
                d3.select(this).attr("fill","#aaa")
            }
        })
    
    svg.append("text").text("CHW per 100,000 residents").style("font-size","12px").attr("x",30).attr("y",120)
  
}
function zoomToBounds(mapS){
    //https://docs.mapbox.com/mapbox-gl-js/example/zoomto-linestring/
    var bounds =  new mapboxgl.LngLatBounds([-155, 20], 
        [-55, 55]);
    map.fitBounds(bounds,{padding:20},{bearing:0})
}

function getMaxMin(coords){
    var maxLat = -999
    var minLat = 0
    var maxLng = 0
    var minLng = 999
    for(var i in coords){
        var coord = coords[i]
        if(coord<0){
            if(coord<minLat){
                minLat = coord
            }else if(coord>maxLat){
                maxLat = coord
            }
        }else{
            if(coord>maxLng){
                maxLng = coord
            }else if(coord<minLng){
                minLng = coord
            }
        }
    }
    var bounds = [
    [minLat,minLng], // Southwest coordinates
    [maxLat, maxLng] // Northeast coordinates
    ];
    return bounds
    
   // console.log([minLat,maxLat,minLng,maxLng])
}
function flatDeep(arr, d = 1) {
   return d > 0 ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val, d - 1) : val), [])
                : arr.slice();
};
function PopulateDropDownList(features,map) {
           //Build an array containing Customer records.
    var sorted =features.sort(function(a,b){
        return parseInt(a.properties.GEOID) - parseInt(b.properties["GEOID"]);
        
    })          
    var ddlCustomers = document.getElementById("ddlCustomers");
 
    var option = document.createElement("OPTION");
    option.innerHTML = "Contiguous 48"
    option.value = "C48";
        option.id = "Contiguous 48"
    
    ddlCustomers.options.add(option);
    //Add the Options to the DropDownList.
    var boundsDict = {}
    
    for (var i = 0; i < sorted .length; i++) {
        var option = document.createElement("OPTION");

        //Set Customer Name in Text part.
        option.innerHTML = sorted[i].properties.NAME;
        
        var coordinates = flatDeep(features[i].geometry.coordinates,Infinity)
        //console.log(coordinates)
       boundsDict[sorted[i].properties.GEOID]=getMaxMin(coordinates)
        //Set CustomerId in Value part.
        option.value = sorted[i].properties["GEOID"]
        option.id = sorted[i].properties.NAME
        //Add the Option element to DropDownList.
        if(sorted[i].properties.NAME!="United States Virgin Islands"&& sorted[i].properties.NAME!="American Samoa"&& sorted[i].properties.NAME!="Commonwealth of the Northern Mariana Islands"&& sorted[i].properties.NAME!="Guam"){
          ddlCustomers.options.add(option);
      }
    }
   $('select').on("change",function(){
      // console.log(this.value)
       if(this.value=="C48"){
        //   console.log("ok")
           zoomToBounds(map)
           // map.flyTo({
 //               zoom:3.8,
 //               center: [-94,37],
 //               speed: 0.8, // make the flying slow
 //               curve: 1
 //               //essential: true // this animation is considered essential with respect to prefers-reduced-motion
 //           });
       }else if(this.value=="02"){
           map.flyTo({
               zoom:4,
               center: [-147.653,63.739],
               speed: 0.8, // make the flying slow
               curve: 1
               //essential: true // this animation is considered essential with respect to prefers-reduced-motion
           });
       }
       else{
           var coords = boundsDict[this.value]
           //console.log(coords)
           var bounds =  new mapboxgl.LngLatBounds(coords);
           map.fitBounds(bounds,{padding:50},{bearing:0})
       }
    })
}

//#### Version
//Determine the current version of dc with `dc.version`
d3.selectAll("#version").text(dc.version);
