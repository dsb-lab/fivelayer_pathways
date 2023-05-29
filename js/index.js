(function(){
  document.addEventListener('DOMContentLoaded', function(){
    let $$ = selector => Array.from( document.querySelectorAll( selector ) );
    let $ = selector => document.querySelector( selector );

    let tryPromise = fn => Promise.resolve().then( fn );

    let toJson = obj => obj.json();
    let toText = obj => obj.text();

    let cy;

    let $dataset = $('#data');
    let $pathShow = $('#pathShow');
    let $sourceShow = $('#sourceShow');
    let $targetShow = $('#targetShow');
    let srtg = $dataset.value.split('_')[1]
    let diag = $dataset.value.split('_')[2].split('.')[0];
    console.log(srtg,diag);


    let getDataset = name => fetch(`datasets/${name}`).then( toJson );
    let applyDataset = dataset => {
      // so new eles are offscreen
      cy.zoom(0.001);
      cy.pan({ x: -9999999, y: -9999999 });

      // replace eles
      cy.elements().remove();
      cy.add( dataset );

      // preset layout
      layout = {name:'preset',padding:20};
      cy.makeLayout( layout ).run().promiseOn('layoutstop');
    }
    let applyDatasetFromSelect = () => Promise.resolve( $dataset.value ).then( getDataset ).then( applyDataset );
    // let applyDatasetFromSelect = () => Promise.resolve( dataFile ).then( getDataset ).then( applyDataset );

    // set preset stylesheet
    styleName = 'custom.json'
    let convert = res => styleName.match(/[.]json$/) ? toJson(res) : toText(res);
    manualStyle = fetch(`stylesheets/${styleName}`).then( convert );


    let applyStylesheet = stylesheet => {

      if( typeof stylesheet === typeof '' ){
        cy.style().fromString( stylesheet ).update();
      } else {
        cy.style().fromJson( stylesheet ).update();
      }
    };
    let applyStylesheetFromSelect = () => Promise.resolve( manualStyle ).then( applyStylesheet );
    // let applyStylesheetFromSelect = () => Promise.resolve( applyStylesheet() );

    let updateSelector = function(divID,text){
        changeThing(divID,text);
        // console.log(text);
    };

    let getSourcesTargets = function(srtg,diag) {
        var srtgPaths = pathways[srtg][diag];
        var sources = srtgPaths.map(x => x.split(' - ').at( 0));
        var targets = srtgPaths.map(x => x.split(' - ').at(-1));
        sources = Array.from( new Set(sources) );
        targets = Array.from( new Set(targets) );
        return [sources,targets];
    };

    let updateSourceTargets = function(srtg,diag) {
        let [sources,targets] = getSourcesTargets(srtg,diag);

        sourceShowText = "";
        for (let i=0; i<sources.length; i++) {
            var source = sources[i];
            sourceShowText += `<option value="${source}">${source}</option>`
        };

        targetShowText = "";
        for (let i=0; i<targets.length; i++) {
            var target = targets[i];
            targetShowText += `<option value="${target}">${target}</option>`
        };

        updateSelector("sourceShow",sourceShowText);
        updateSelector("targetShow",targetShowText);
    };

    let getSourceTargetPaths = function(srtg,diag) {
        let source = $sourceShow.value;
        let target = $targetShow.value;
        var sourceNode = cy.nodes(`[id="${source}"]`);
        var targetNode = cy.nodes(`[id="${target}"]`);
        var allPaths = pathways[srtg][diag];

        let srtgPaths = [];
        let srtgPathsText = ""
        for (let i=0; i<allPaths.length; i++) {
            path = allPaths[i];
            var pathList = path.split(' - ');

            if (pathList.at(0) == source && pathList.at(-1) == target) {
                srtgPaths.push(path);
                srtgPathsText += `<option value="${srtgPaths.length-1}">` + path + "</option>\n";
            }
        }

        return [srtgPaths, srtgPathsText];
    };

    let dimOthers = function(connectedNodes,connectedEdges) {

        const getAbsentValues = (arr1, arr2) => {
            let res = [];
            for (let i=0; i<arr1.length; i++) {
                el = arr1[i];
                if (!arr2.includes(el)) {
                    res.push(el);
                }
            }
            return res;
        };

        let allNodes = cy.nodes().map(x => x.id());
        let conNodes = connectedNodes.map(x => x.id());
        let otherNodes = getAbsentValues(allNodes, conNodes);

        let allEdges = cy.edges().map(x => x.id());
        let conEdges = connectedEdges.map(x => x.id());
        let otherEdges = getAbsentValues(allEdges, conEdges);

        for (let i=0; i<otherNodes.length; i++) {
            node = cy.nodes(`[id="${otherNodes[i]}"]`);
            node.css({"border-color":"black",
                "border-width":"1",
                "opacity":"0.1"});
        }

        // make the remaining edges more transparent
        for (let i = 0; i < otherEdges.length; i++) {
            edge = cy.edges(`[id="${otherEdges[i]}"]`);
            edge_trans = 0.1*edge.data("edge_trans");
            edge.css({"line-color":"black",
                      "opacity":edge_trans});
        }
    };

    let updatePathway = async function(srtg,diag,nPath) {

        var [srtgPaths, srtgPathsText] = getSourceTargetPaths(srtg,diag);

        allEdges = cy.edges().map(x => [x.data("source"),
                                        x.data("target")]);

        let $dataset = $('#data');
        srtg = $dataset.value.split('_')[1];
        diag = $dataset.value.split('_')[2].split('.')[0];

        var pathName = srtgPaths[nPath]
        var path = pathName.split(' - ');
        console.log('Path ', nPath, path);
        pathActive = document.getElementById("pathActive");
        previousPathsText = pathActive.innerText;
        pathList = previousPathsText.replace(/ *\([^)]*\)\  */g, "").split("\n");
        console.log('previous ',pathList);
        console.log('current  ',pathName);

        pathList.push(pathName);
        console.log('path list ',pathList);
        

        var nPathActive = previousPathsText.split("\n").length;
        if (previousPathsText == "") {
            pathActive.innerText = `(${nPathActive}) ${pathName}`;
        } else {
            pathActive.innerText = `${previousPathsText}\n(${nPathActive+1}) ${pathName}`;
        };

        for (let i=0; i<path.length; i++) {
            node = cy.nodes(`[id="${path[i]}"]`)
            node.css({"border-color":"gold",
                      "border-width":"8",
                      "opacity":"1"});
        }

        cy.nodes(`[id="${path[0]}"]`).css({"border-color":"lime"})
        cy.nodes(`[id="${path.at(-1)}"]`).css({"border-color":"red"})

        let pathNodes = [];
        for (let i=0; i<path.length; i++) {
            var node = cy.nodes(`[id="${path[i]}"]`)
            pathNodes.push(node);
        }

        let pathEdges = [];
        for (let i=0; i<path.length-1; i++) {
            let source = path[i];
            let target = path[i+1];
            edge = cy.edges(`[source="${source}"][target="${target}"]`);
            if (edge.data("source") == undefined) {
                edge = cy.edges(`[source="${target}"][target="${source}"]`)
            }
            
            pathEdges.push(edge);
            edge_thick = 2*edge.data("edge_thick")
            edge_trans = edge.data("edge_trans")

            // gold = "#FFD700"
            gold = "rgb(255, 215, 0)";
            // gold = "hsl(50.6, 100, 50)";

            edge.css({"line-color":gold, // gold
                      "width":edge_thick,
                      "opacity":"1"}); // reset opacity from last click
                      // "opacity":edge_trans}); // reset opacity from last click
        }

        // console.log(pathEdges);
        dimOthers(pathNodes,pathEdges);
    };

    cy = window.cy = cytoscape({
      container: $('#cy')
    });

    $dataset.addEventListener('change', function(){
      tryPromise( applyDatasetFromSelect );
    });

    let initializeDataset = async function() {
        await tryPromise( applyDatasetFromSelect ).then( applyStylesheetFromSelect );
        
        let srtg = $dataset.value.split('_')[1];
        let diag = $dataset.value.split('_')[2].split('.')[0];
        updateSourceTargets(srtg,diag);
        var [sources,targets] = getSourcesTargets(srtg,diag);

        let [srtgPaths, srtgPathsText] = getSourceTargetPaths(srtg,diag);
        tryPromise( updateSelector("pathShow",srtgPathsText) );
        updatePathway(srtg,diag,0); // default show first path
    };
    initializeDataset();

    // tryPromise( applyDatasetFromSelect ).then( applyStylesheetFromSelect ).then( applyLayoutFromSelect );
    // tryPromise( applyDatasetFromSelect ).then( applyStylesheetFromSelect );

    // $dataset.addEventListener('change', function(){
    //   tryPromise( applyDatasetFromSelect ).then( applyStylesheetFromSelect ).then( applyLayoutFromSelect );
    // });

    $dataset.addEventListener('change', function(){
      tryPromise( applyDatasetFromSelect ).then( applyStylesheetFromSelect );
    });

    $pathShow.addEventListener('change', function(){
        let srtg = $dataset.value.split('_')[1];
        let diag = $dataset.value.split('_')[2].split('.')[0];
        updatePathway(srtg,diag,$pathShow.value);
        // updateSelector(srtgPathsText);
    });

    $sourceShow.addEventListener('change', function() {
        let srtg = $dataset.value.split('_')[1];
        let diag = $dataset.value.split('_')[2].split('.')[0];
        var [srtgPaths, srtgPathsText] = getSourceTargetPaths(srtg,diag);
        updateSelector("pathShow",srtgPathsText);
        updatePathway(srtg,diag,0); // default show first path
    });

    $targetShow.addEventListener('change', function() {
        let srtg = $dataset.value.split('_')[1];
        let diag = $dataset.value.split('_')[2].split('.')[0];
        var [srtgPaths, srtgPathsText] = getSourceTargetPaths(srtg,diag);
        updateSelector("pathShow",srtgPathsText);
        updatePathway(srtg,diag,0); // default show first path
    });

    $dataset.addEventListener('change', async function(){
        await tryPromise( applyDatasetFromSelect )
        .then( applyStylesheetFromSelect );

        let srtg = $dataset.value.split('_')[1];
        let diag = $dataset.value.split('_')[2].split('.')[0];
        await updateSourceTargets(srtg,diag);

        var [sources,targets] = getSourcesTargets(srtg,diag);
        let [srtgPaths, srtgPathsText] = getSourceTargetPaths(srtg,diag);
        await updateSelector("pathShow", srtgPathsText);

        updatePathway(srtg,diag,0); // default show first path
    });

    // pathOptions = document.getElementById('#dataset');
    // pathOptions.innerHTML += "<option>Blah</option>";
    // alert(pathOptions.innerHTML)

    cy.on("click", function(event) {
              // make the remaining nodes more transparent
        cy.nodes().css({"border-color":"black",
                        "border-width":"1",
                        "opacity":"1"});

      // highlight positive and negative edges and increase thickness
      for (let i = 0; i < cy.edges().length; i++){
          edge = cy.edges()[i]
          edge.css({"line-color":"black",
                    "width":edge.data("edge_thick"),
                    "opacity":edge.data("edge_trans")}); // reset opacity from last click
      }

    });

    // Keith function for highlighting neighborhood
    cy.on("click", "node", function(event) {

      let clickNode = event.target
      let connectedNodes = clickNode.neighborhood().nodes();
      let remainingNodes = cy.nodes().not(connectedNodes);
      let connectedEdges = clickNode.neighborhood().edges();
      let remainingEdges = cy.edges().not(connectedEdges);
      let nNodes = cy.nodes().length;


      // // make the remaining nodes more transparent
      // remainingNodes.css({"border-color":"black",
      //         "border-width":"1",
      //         "opacity":"0.1"});

      connectedNodes.css({"border-color":"cyan",
              "border-width":"8",
              "opacity":"1"});

      // highlight positive and negative edges and increase thickness
      for (let i = 0; i < connectedEdges.length; i++){
          edge = connectedEdges[i]
          edge_thick = 2*edge.data("edge_thick")
          edge_trans = edge.data("edge_trans")
          edge.css({"line-color":"cyan",
                    "width":edge_thick,
                    "opacity":edge_trans}); // reset opacity from last click
      }

      // // make the remaining edges more transparent
      // for (let i = 0; i < remainingEdges.length; i++) {
      //     edge = remainingEdges[i]
      //     edge_trans = 0.1*edge.data("edge_trans")
      //     edge.css({"line-color":"black",
      //               "opacity":edge_trans});
      // }

      dimOthers(connectedNodes,connectedEdges);

      nodeList = connectedNodes.map(x => x.id());
      nodeStr = String(nodeList).replaceAll(',','\n');

      edgeList = connectedEdges.map(x => [ x.data("source"),
                                           x.data("target"), 
                                           x.data("weight") ] );
      for (let i = 0; i < edgeList.length; i++) {
          let [source,target,weight] = edgeList[i]
          if (source == clickNode.id()) {
              edgeList[i] = [weight,target]
          } else if (target == clickNode.id()) {
              edgeList[i] = [weight,source]
          }
      }

      edgeList = edgeList.sort( (a, b) => {return b[0] - a[0];} );
      edgeStr = String(edgeList).replaceAll(',','\n');

      console.log( "number of nodes " + nNodes + '\n'
                  + "current node " + this.id() + '\n' 
                  + "degree  " + clickNode.data("degree") + '\n' );

      tableText = '';
      for (let i=0; i<edgeList.length; i++) {
          let [weight,node] = edgeList[i]
          weight = String(weight)
          tableText += `${weight.padStart(3)} : ${node.padEnd(20)} \n` // funky apostrophes needed
      }

      // add the text of the nodes and weights
      htmlText = tableText.replaceAll('\n','<br>').replaceAll(' ','&nbsp;');
      document.getElementById('networkInfo').innerHTML = htmlText;

      // adjust dimensions of the box
      topPad = document.getElementById("networkInfo").style["padding-top"].replace('px','')
      lineHeight = document.getElementById("networkInfo").style["line-height"]
      fontSize = document.getElementById("networkInfo").style["font-size"].replace('px','');
      boxHeight = nodeList.length*parseFloat(lineHeight)*parseFloat(fontSize)+2*topPad
      StrHeight = String( Math.floor( boxHeight ) ) + 'px';
      document.getElementById("networkInfo").style.setProperty("height", StrHeight);

      // should be done last to make sure it's not overwritten
      clickNode.css(  {"border-color":"lime",
                       "border-width": "8",
                       "opacity":"1"});
      
    });
  
  });

})();

// tooltips with jQuery
$(document).ready(() => $('.tooltip').tooltipster());