/**
 * @license Licensed under the Apache License, Version 2.0 (the "License"):
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 * @fileoverview Ardublockly JavaScript for the Blockly resources and bindings.
 */
'use strict';

/** Create a namespace for the application. */
var Ardublockly = Ardublockly || {};

/**
 * Blockly main workspace.
 * @type Blockly.WorkspaceSvg
 */
Ardublockly.workspace = null;

/**
 * Blockly workspace toolbox XML.
 * @type Element
 */
Ardublockly.xmlTree = null;

/**
 * Injects Blockly into a given HTML element. Toolbox XMl has to be a string.
 * @param {!Element} blocklyEl Element to inject Blockly into.
 * @param {!string} toolboxXml String containing the toolbox XML content.
 * @param {!string} blocklyPath String containing the Blockly directory path.
 */
Ardublockly.injectBlockly = function(blocklyEl, toolboxXml, blocklyPath) {
  // Remove any trailing slashes in the blockly path
  if (blocklyPath.substr(-1) === '/') {
    blocklyPath = blocklyPath.slice(0, -1);
  }
  Ardublockly.xmlTree = Blockly.Xml.textToDom(toolboxXml);
  // The Toolbox menu language is edited directly from the XML nodes.
  Ardublockly.updateToolboxLanguage();
  Ardublockly.workspace = Blockly.inject(blocklyEl, {
      collapse: true,
      comments: true,
      css: true,
      disable: true,
      grid: false,
      maxBlocks: Infinity,
      media: blocklyPath + '/media/',
      rtl: false,
      scrollbars: true,
      sounds: true,
      toolbox: Ardublockly.xmlTree,
      trashcan: true,
      zoom: {
        controls: true,
        wheel: false,
        startScale: 1.0,
        maxScale: 2,
        minScale: 0.2,
        scaleSpeed: 1.2
      }
  });
  // On language change the blocks have been stored in session storage
  Ardublockly.loadSessionStorageBlocks();
};
 
/** Binds the event listeners relevant to Blockly. */
Ardublockly.bindBlocklyEventListeners = function() {
  Ardublockly.workspace.addChangeListener(function(event) {
    if (event.type != Blockly.Events.UI) {
      Ardublockly.renderContent();
      var AllBlocks= (Ardublockly.workspace.getAllBlocks())
      for (var i = 0; i <= AllBlocks.length; i++) {
        checkParent(AllBlocks[i])
      }
      document.getElementById('active_blocks').textContent =usedBlocks+1
      var maxBlocks = 9
      document.getElementById('capacity').textContent =
      maxBlocks-usedBlocks-1
      usedBlocks=0
    }
  });
  // Ensure the Blockly workspace resizes accordingly
  window.addEventListener('resize',
      function() { Blockly.asyncSvgResize(Ardublockly.workspace); }, false);
};

/** @return {!string} Generated Arduino code from the Blockly workspace. */
Ardublockly.generateArduino = function() {
  return Blockly.Arduino.workspaceToCode(Ardublockly.workspace);
};

/** @return {!string} Generated XML code from the Blockly workspace. */
Ardublockly.generateXml = function() {
  var xmlDom = Blockly.Xml.workspaceToDom(Ardublockly.workspace);
  return Blockly.Xml.domToPrettyText(xmlDom);
};

/**
 * Loads an XML file from the server and replaces the current blocks into the
 * Blockly workspace.
 * @param {!string} xmlFile XML file path in a reachable server (no local path).
 * @param {!function} cbSuccess Function to be called once the file is loaded.
 * @param {!function} cbError Function to be called if there is a connection
 *     error to the XML server.
 */
Ardublockly.loadXmlBlockFile = function(xmlFile, cbSuccess, cbError) {
  var request = Ardublockly.ajaxRequest();
  var requestCb = function() {
    if (request.readyState == 4) {
      if (request.status == 200) {
        var success = Ardublockly.replaceBlocksfromXml(request.responseText);
        cbSuccess(success);
      } else {
        cbError();
      }
    }
  };
  try {
    request.open('GET', xmlFile, true);
    request.onreadystatechange = requestCb;
    request.send(null);
  } catch (e) {
    cbError();
  }
};

/**
 * Parses the XML from its argument input to generate and replace the blocks
 * in the Blockly workspace.
 * @param {!string} blocksXml String of XML code for the blocks.
 * @return {!boolean} Indicates if the XML into blocks parse was successful.
 */
Ardublockly.replaceBlocksfromXml = function(blocksXml) {
  var xmlDom = null;
  try {
    xmlDom = Blockly.Xml.textToDom(blocksXml);
  } catch (e) {
    return false;
  }
  Ardublockly.workspace.clear();
  var sucess = false;
  if (xmlDom) {
    sucess = Ardublockly.loadBlocksfromXmlDom(xmlDom);
  }
  return sucess;
};

/**
 * Parses the XML from its argument to add the blocks to the workspace.
 * @param {!string} blocksXmlDom String of XML DOM code for the blocks.
 * @return {!boolean} Indicates if the XML into blocks parse was successful.
 */
Ardublockly.loadBlocksfromXmlDom = function(blocksXmlDom) {
  try {
    Blockly.Xml.domToWorkspace(blocksXmlDom, Ardublockly.workspace);
  } catch (e) {
    return false;
  }
  return true;
};

/**
 * Save blocks into session storage. Note that MSIE 11 does not support
 * sessionStorage on file:// URLs.
 */
Ardublockly.saveSessionStorageBlocks = function() {
  if (window.sessionStorage) {
    var xml = Blockly.Xml.workspaceToDom(Ardublockly.workspace);
    var text = Blockly.Xml.domToText(xml);
    window.sessionStorage.loadOnceBlocks = text;
  }
};

/** Load blocks saved on session storage and deletes them from storage. */
Ardublockly.loadSessionStorageBlocks = function() {
  try {
    var loadOnce = window.sessionStorage.loadOnceBlocks;
  } catch (e) {
    // Firefox sometimes throws a SecurityError when accessing sessionStorage.
    // Restarting Firefox fixes this, so it looks like a bug.
    var loadOnce = null;
  }
  if (loadOnce) {
    delete window.sessionStorage.loadOnceBlocks;
    var xml = Blockly.Xml.textToDom(loadOnce);
    Blockly.Xml.domToWorkspace(xml, Ardublockly.workspace);
  }
};

/** Discard all blocks from the workspace. */
Ardublockly.discardAllBlocks = function() {
  var blockCount = Ardublockly.workspace.getAllBlocks().length;
  if (blockCount == 1) {
    Ardublockly.workspace.clear();
    Ardublockly.renderContent();
  } else if (blockCount > 1) {
    Ardublockly.alertMessage(
        Ardublockly.getLocalStr('discardBlocksTitle'),
        Ardublockly.getLocalStr('discardBlocksBody')
            .replace('%1', blockCount),
        true,
        function() {
          Ardublockly.workspace.clear();
          Ardublockly.renderContent();
        });
  }
};

document.getElementById('checks').textContent =0
document.getElementById('hints').textContent =0
var hints=0
var checks=0
var medalearned=false
var tut2=0
var tut3=0
var tut4=0
var tut5=0

/** Check Tutorials Function */
Ardublockly.finish_tutorial = function() {
  var AllBlocks= (Ardublockly.workspace.getAllBlocks())
  var AllBlocks= (Ardublockly.workspace.getAllBlocks())
  for (var i = 0; i <= AllBlocks.length; i++) {
    checkParent(AllBlocks[i])
  }
  usedBlocks=usedBlocks+1
      if(AllBlocks[0] != null && AllBlocks[0].childBlocks_[0] != null){
        if(AllBlocks[0].inputList[3].renderHeight==24){
          if(usedBlocks<=9){
            if (AllBlocks[0].childBlocks_[0].type =="controls_repeat_ext"){
              //Block Changer
              if(AllBlocks[0].childBlocks_[0].childBlocks_[0] != undefined && AllBlocks[0].childBlocks_[0].childBlocks_[1]!=undefined){
                if(AllBlocks[0].childBlocks_[0].childBlocks_[0].type=="sensebox_led" && AllBlocks[0].childBlocks_[0].childBlocks_[1].type=="math_number"){
                  var ChangeBlock= AllBlocks[0].childBlocks_[0].childBlocks_[0]
                  AllBlocks[0].childBlocks_[0].childBlocks_[0]=AllBlocks[0].childBlocks_[0].childBlocks_[1]
                  AllBlocks[0].childBlocks_[0].childBlocks_[1]=ChangeBlock
                }
              }
              if(AllBlocks[0].childBlocks_[0].childBlocks_[0] != undefined && AllBlocks[0].childBlocks_[0].childBlocks_[0].type =="math_number"){
                if(AllBlocks[0].childBlocks_[0].childBlocks_[0].inputList[0].fieldRow[0].text_ == "5"){
                  if(AllBlocks[0].childBlocks_[0].childBlocks_[1]!=undefined){
                    if(AllBlocks[0].childBlocks_[0].childBlocks_[2]==undefined && AllBlocks[0].childBlocks_[0].inputList[2].renderHeight>=30){
                      if(AllBlocks[0].childBlocks_[0].childBlocks_[1] != undefined && AllBlocks[0].childBlocks_[0].childBlocks_[1].type== "sensebox_led"){
                        if(AllBlocks[0].childBlocks_[0].childBlocks_[1].inputList[0].fieldRow[2].text_=="D1" && AllBlocks[0].childBlocks_[0].childBlocks_[1].inputList[0].fieldRow[4].text_=="on"){
                          if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0] != undefined && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].type== "time_delay"){
                            if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0] != undefined && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1]!=undefined){
                              if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0].type=="sensebox_led" && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].type=="math_number"){
                                var ChangeBlock= AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1]
                                AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1] = AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0]
                                AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0]=ChangeBlock
                              }
                            }
                            if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0] != null && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0].type== "math_number"){
                              if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0].inputList[0].fieldRow[0].text_ == "1000"){
                                if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1] != null && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].type== "sensebox_led"){
                                  if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].inputList[0].fieldRow[2].text_=="D1" && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].inputList[0].fieldRow[4].text_=="off"){
                                    if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0]!= null && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].type== "time_delay"){
                                      if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0]!= null && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1]!= null){
                                        if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0].type== "sensebox_led" && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].type== "math_number"){
                                          var ChangeBlock= AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0]
                                          AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0] = AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1]
                                          AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1] = ChangeBlock
                                        }
                                      }
                                      if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0]!= null && AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0].type== "math_number"){
                                        if(AllBlocks[0].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[1].childBlocks_[0].childBlocks_[0].inputList[0].fieldRow[0].text_ == "1000"){
                                          if(medalearned==false){
                                            if(hints<=1 && checks<5){
                                              Ardublockly.alertMessage(
                                                "Glückwunsch. Alles Richtig",
                                                "Du hast dir eine Goldmedaille erarbeitet <br> Jetzt einfach nur noch hochladen und danach das nächste Tutorial bearbeiten",
                                                false);
                                                medalearned=true
                                                tut3="Gold"
                                            }
                                            else if(hints>1 && checks >5){
                                              Ardublockly.alertMessage(
                                                "Glückwunsch. Alles Richtig",
                                                "Du hast dir eine Bronzemedaille erarbeitet <br> Jetzt einfach nur noch hochladen und danach das nächste Tutorial bearbeiten",
                                                false);
                                                medalearned=true
                                                tut3="Bronze"
                                            }
                                            else{
                                              Ardublockly.alertMessage(
                                                "Glückwunsch. Alles Richtig",
                                                "Du hast dir eine Silbermedaille erarbeitet <br> Jetzt einfach nur noch hochladen und danach das nächste Tutorial bearbeiten",
                                                false);
                                                medalearned=true
                                                tut3="Silber"
                                            }
                                          }
                                          else{
                                            Ardublockly.alertMessage(
                                              "Du hast breits eine Medaille verdient",
                                              "Lade deinen Code hoch und starte bitte das nächste Tutorial",
                                              false);
                                          }
                                          
                                        }
                                        else{
                                          Ardublockly.alertMessage(
                                            "Der 3. Math_Numbers Block hat die falsche Eigenschaft",
                                            false);
                                        }}
                                      else{
                                        Ardublockly.alertMessage(
                                          "Falscher/fehlender 9.Block",
                                          false);
                                      }}
                                    else{
                                      Ardublockly.alertMessage(
                                        "Falscher/fehlender 8.Block",
                                        false);
                                    }}
                                  else{
                                    Ardublockly.alertMessage(
                                      "Die Eigenschaften(Pin oder Status) des zweiten Sensebox_LED Blockes sind falsch",
                                      false);
                                  }}
                                else{
                                  Ardublockly.alertMessage(
                                    "Falscher/fehlender 7.Block",
                                    false);
                                }}
                              else{
                                Ardublockly.alertMessage(
                                  "Der 2. Math_Numbers Block hat die falsche Eigenschaft",
                                  false);
                              }}
                            else{
                              Ardublockly.alertMessage(
                                "Falscher/fehlender 6. Block",
                                false);
                            }}
                          else{
                            Ardublockly.alertMessage(
                              "Falscher/fehlender 5. Block",
                              false);
                          }}  
                        else{
                          Ardublockly.alertMessage(
                            "Die Eigenschaften(Pin oder Status) des ersten Sensebox_LED Blockes sind falsch",
                            false);
                        }}
                      else{
                        Ardublockly.alertMessage(
                          "Falscher 4. Block",
                          false);
                      }}
                    else{
                      Ardublockly.alertMessage(
                        "Die Blöcke müssen in die for-Schleife",
                        false);
                    }}
                  else{
                    Ardublockly.alertMessage(
                      "Fehlender 4. Block",
                      false);
                  }}
                else{
                  Ardublockly.alertMessage(
                    "Der 1. Math_Numbers Block hat die falsche Eigenschaft",
                    false);
                }}  
              else{
                Ardublockly.alertMessage(
                  "Falscher/fehlender 3. Block",
                  false);
              }}
            else{
              Ardublockly.alertMessage(
                "Falscher/fehlender 2. Block",
                false);
            }}
            else{
              Ardublockly.alertMessage(
                "Zu viele aktive Blöcke",
                false);
          }}
        else{
          Ardublockly.alertMessage(
            "Blöcke bitte in den Run First Block",
            false);
        }}
      else{
        Ardublockly.alertMessage(
          "Bitte Blöcke einfügen",
          "Wenn du den lila Block gelöscht hast, einfach neu laden",
          false);
      }
      usedBlocks=0   
      checks=checks+1
      document.getElementById('checks').textContent = checks             
}

Ardublockly.hint = function() {
  if(hints==0){
    Ardublockly.alertMessage(
    "Es müssen 6 Blöcke in den do Teil des Repeat-Blockes und keine anderswo",
    false);
    hints=hints+1
    document.getElementById('hints').textContent = hints
  }
  else{
    if(hints==1){
      Ardublockly.alertMessage(
      "Der Teil im do Block sieht exakt so aus wie der aus Tutorial Nr. 2",
      false);
      hints=hints+1
      document.getElementById('hints').textContent = hints
      }
    else{
      Ardublockly.alertMessage(
        "Alle Hints benutzt. Diese waren:",
        "1. Es müssen 6 Blöcke in den do Teil des Repeat-Blockes und keine anderswo <br> 2. Der Teil im do Block sieht exakt so aus wie der aus Tutorial Nr. 2",
        false);
        document.getElementById('hints').textContent = hints
    }
  }
}

/** @return {!boolean} Indicates if the Blockly workspace has blocks. */
Ardublockly.isWorkspaceEmpty = function() {
  return Ardublockly.workspace.getAllBlocks().length ? false : true;
};

/**
 * Changes the Arduino board profile if different from the currently set one.
 * @param {string} newBoard Name of the new profile to set.
 */
Ardublockly.changeBlocklyArduinoBoard = function(newBoard) {
  if (Blockly.Arduino.Boards.selected !== Blockly.Arduino.Boards[newBoard]) {
    Blockly.Arduino.Boards.changeBoard(Ardublockly.workspace, newBoard);
  }
};

/** Update the toolbox categories language. */
Ardublockly.updateToolboxLanguage = function() {
  var categories = ['catLogic', 'catLoops', 'catMath', 'catText',
                    'catVariables', 'catFunctions', 'catInputOutput',
                    'catTime', 'catAudio', 'catMotors', 'catComms'];
  var categoryNodes = Ardublockly.xmlTree.getElementsByTagName('category');
  for (var i = 0, cat; cat = categoryNodes[i]; i++) {
    var catId = cat.getAttribute('id');
    var catText = Ardublockly.getLocalStr(catId);
    if (catText) {
      cat.setAttribute('name', catText);
    }
  }
};

/**
 * Adds a category to the current toolbox.
 * @param {!string} categoryTitle Toolbox category title.
 * @param {!Element} categoryDom Toolbox category to add add the end of tree.
 */
Ardublockly.addToolboxCategory = function(categoryTitle, categoryDom) {
  categoryDom.id = 'cat' + categoryTitle.replace(/\s+/g, '');
  categoryDom.setAttribute('name', categoryTitle);
  Ardublockly.xmlTree.appendChild(document.createElement('sep'));
  Ardublockly.xmlTree.appendChild(categoryDom);
  Ardublockly.workspace.updateToolbox(Ardublockly.xmlTree);
};

/**
 * Removes a category to the current toolbox.
 * @param {!String} categoryTitle Toolbox category name to remove from tree.
 */
Ardublockly.removeToolboxCategory = function(categoryTitle) {
  var categoryId = 'cat' + categoryTitle.replace(/\s+/g, '');
  var categoryNodes = Ardublockly.xmlTree.getElementsByTagName('category');
  for (var i = 0; i < categoryNodes.length; i++) {
    if (categoryNodes[i].getAttribute('id') === categoryId) {
      var previousNode = categoryNodes[i].previousElementSibling;
      Ardublockly.xmlTree.removeChild(categoryNodes[i]);
      if (previousNode && previousNode.nodeName == 'sep') {
        Ardublockly.xmlTree.removeChild(previousNode);
      }
    }
  }
  Ardublockly.workspace.updateToolbox(Ardublockly.xmlTree);
};

/** Closes the toolbox block container sub-menu. */
Ardublockly.blocklyCloseToolbox = function() {
  Ardublockly.workspace.toolbox_.flyout_.hide();
};

/** @return {!integer} The width of the blockly workspace toolbox. */
Ardublockly.blocklyToolboxWidth = function() {
  return Ardublockly.workspace.toolbox_.width;
};

/** @return {!boolean} Indicates if a block is currently being dragged. */
Ardublockly.blocklyIsDragging = function() {
  return (Blockly.dragMode_ != 0) ? true : false;
};

/** Wraps the blockly 'cut' functionality. */
Ardublockly.blocklyCut = function() {
  if (Blockly.selected) {
    Blockly.copy_(Blockly.selected);
    Blockly.selected.dispose(true, true);
  }
};

/** Wraps the blockly 'copy' functionality. */
Ardublockly.blocklyCopy = function() {
  if (Blockly.selected) {
    Blockly.copy_(Blockly.selected);
  }
};

/** Wraps the blockly 'paste' functionality. */
Ardublockly.blocklyPaste = function() {
  if (Blockly.clipboardXml_) {
    Blockly.hideChaff();
    Blockly.clipboardSource_.paste(Blockly.clipboardXml_);
  }
};

/** Wraps the blockly 'delete' functionality. */
Ardublockly.blocklyDelete = function() {
  if (Blockly.selected && Blockly.selected.isDeletable()) {
    Blockly.hideChaff();
    Blockly.selected.dispose(true, true);
  }
};

/** @return {XMLHttpRequest} An XML HTTP Request multi-browser compatible. */
Ardublockly.ajaxRequest = function() {
  var request;
  try {
    // Firefox, Chrome, IE7+, Opera, Safari
    request = new XMLHttpRequest();
  } catch (e) {
    try {
      // IE6 and earlier
      request = new ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {
      try {
        request = new ActiveXObject('Microsoft.XMLHTTP');
      } catch (e) {
        throw 'Your browser does not support AJAX';
        request = null;
      }
    }
  }
  return request;
};

var usedBlocks=0
function checkParent(Object) {
  if(Object!=null){
    if(Object.parentBlock_!=null){
      if(Object.parentBlock_ != "arduino_functions"){
        checkParent(Object.parentBlock_)
      }
      if(Object.parentBlock_.type == "arduino_functions"){
        usedBlocks=usedBlocks+1
      }
    }
  }
}
  
function openUrl()
{
  if(medalearned==true){
    var url1 = "index5.html";
    var url = url1+"?tut2="+tut2+"&tut3="+tut3+"&tut4="+tut4+"&tut5="+tut5+"&board=sensebox-mcu";		
    window.location = url;
  }
  else{
    Ardublockly.alertMessage(
      "Du hast noch keine Medallie verdient",
      false);
  }
}		

function getURLParameter(name) {
  var value = decodeURIComponent((RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, ""])[1]);
  return (value !== 'null') ? value : false;
}
 
window.onload = function(){
  tut2 = getURLParameter('tut2')
  tut3 = getURLParameter('tut3')
  tut4 = getURLParameter('tut4')
  tut5 = getURLParameter('tut5')
}
