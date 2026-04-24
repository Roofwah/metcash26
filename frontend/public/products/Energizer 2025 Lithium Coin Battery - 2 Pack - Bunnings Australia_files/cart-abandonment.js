var KAMPYLE_SPECIFIC = (function() {
  var previous;
  var templates = {
    nps: '<div class="form-group rating11" style="margin-bottom: 5px; display:{{Display}}" data-neb-uuid="{{NebUuid}}">' 
        + '<fieldset id="{{Id}}" data-neb-uuid="{{NebUuid}}" >' 
        + '<legend id="lbl_{{Id}}" aria-label="{{Label}}" class="control-label" style="margin-bottom: 0px;"><span>{{Label}}</span><span class="required" data-neb-uuid="{{NebUuid}}">*</span></legend>' 
        + '<div class="grading11"><form>' 
        + '<span class="neb-rating-value"> <label id="lab0{{Id}}" for="grade_radio00{{Id}}"> <span class="native-display-value">0</span> <input aria-hidden="true" type="radio" id="grade_radio00{{Id}}" class="elementVal" name="{{Id}}" value="0" aria-label="{{GRADING0}}" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab0{{Id}}\')" onblur="labelhoverout(\'lab0{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab1{{Id}}" for="grade_radio01{{Id}}"> <span class="native-display-value">1</span> <input aria-hidden="true" type="radio" id="grade_radio01{{Id}}" class="elementVal" name="{{Id}}" value="1" aria-label="2" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab1{{Id}}\')" onblur="labelhoverout(\'lab2{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab2{{Id}}" for="grade_radio02{{Id}}"> <span class="native-display-value">2</span> <input aria-hidden="true" type="radio" id="grade_radio02{{Id}}" class="elementVal" name="{{Id}}" value="2" aria-label="3" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab2{{Id}}\')" onblur="labelhoverout(\'lab3{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab3{{Id}}" for="grade_radio03{{Id}}"> <span class="native-display-value">3</span> <input aria-hidden="true" type="radio" id="grade_radio03{{Id}}" class="elementVal" name="{{Id}}" value="3" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab3{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab4{{Id}}" for="grade_radio04{{Id}}"> <span class="native-display-value">4</span> <input aria-hidden="true" type="radio" id="grade_radio04{{Id}}" class="elementVal" name="{{Id}}" value="4" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab4{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab5{{Id}}" for="grade_radio05{{Id}}"> <span class="native-display-value">5</span> <input aria-hidden="true" type="radio" id="grade_radio05{{Id}}" class="elementVal" name="{{Id}}" value="5" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab5{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab6{{Id}}" for="grade_radio06{{Id}}"> <span class="native-display-value">6</span> <input aria-hidden="true" type="radio" id="grade_radio06{{Id}}" class="elementVal" name="{{Id}}" value="6" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab6{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab7{{Id}}" for="grade_radio07{{Id}}"> <span class="native-display-value">7</span> <input aria-hidden="true" type="radio" id="grade_radio07{{Id}}" class="elementVal" name="{{Id}}" value="7" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab7{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab8{{Id}}" for="grade_radio08{{Id}}"> <span class="native-display-value">8</span> <input aria-hidden="true" type="radio" id="grade_radio08{{Id}}" class="elementVal" name="{{Id}}" value="8" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab8{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab9{{Id}}" for="grade_radio09{{Id}}"> <span class="native-display-value">9</span> <input aria-hidden="true" type="radio" id="grade_radio09{{Id}}" class="elementVal" name="{{Id}}" value="9" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab9{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab10{{Id}}" for="grade_radio10{{Id}}"> <span class="native-display-value">10</span> <input aria-hidden="true" type="radio" id="grade_radio10{{Id}}" class="elementVal" name="{{Id}}" value="10" aria-label="{{GRADING10}}" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab10{{Id}}\')" onblur="labelhoverout(\'lab10{{Id}}\')"></label></span></form>' 
        + '{{description}}' + '</div>' + '</fieldset>' + '</div>',
    grading1to10: '<div class="form-group rating10" style="margin-bottom: 5px; display:{{Display}}" data-neb-uuid="{{NebUuid}}">' 
        + '<fieldset id="{{Id}}" data-neb-uuid="{{NebUuid}}" >' 
        + '<legend id="lbl_{{Id}}" aria-label="{{Label}}" class="control-label" style="margin-bottom: 0px;"><span>{{Label}}</span><span class="required" data-neb-uuid="{{NebUuid}}">*</span></legend>' 
        + '<div class="grading10"><form>' 
        + '<span class="neb-rating-value"> <label id="lab1{{Id}}" for="grade_radio01{{Id}}"> <span class="native-display-value">1</span> <input aria-hidden="true" type="radio" id="grade_radio01{{Id}}" class="elementVal" name="{{Id}}" value="1" aria-label="{{GRADING0}}" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab1{{Id}}\')" onblur="labelhoverout(\'lab1{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab2{{Id}}" for="grade_radio02{{Id}}"> <span class="native-display-value">2</span> <input aria-hidden="true" type="radio" id="grade_radio02{{Id}}" class="elementVal" name="{{Id}}" value="2" aria-label="3" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab2{{Id}}\')" onblur="labelhoverout(\'lab3{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab3{{Id}}" for="grade_radio03{{Id}}"> <span class="native-display-value">3</span> <input aria-hidden="true" type="radio" id="grade_radio03{{Id}}" class="elementVal" name="{{Id}}" value="3" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab3{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab4{{Id}}" for="grade_radio04{{Id}}"> <span class="native-display-value">4</span> <input aria-hidden="true" type="radio" id="grade_radio04{{Id}}" class="elementVal" name="{{Id}}" value="4" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab4{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab5{{Id}}" for="grade_radio05{{Id}}"> <span class="native-display-value">5</span> <input aria-hidden="true" type="radio" id="grade_radio05{{Id}}" class="elementVal" name="{{Id}}" value="5" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab5{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab6{{Id}}" for="grade_radio06{{Id}}"> <span class="native-display-value">6</span> <input aria-hidden="true" type="radio" id="grade_radio06{{Id}}" class="elementVal" name="{{Id}}" value="6" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab6{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab7{{Id}}" for="grade_radio07{{Id}}"> <span class="native-display-value">7</span> <input aria-hidden="true" type="radio" id="grade_radio07{{Id}}" class="elementVal" name="{{Id}}" value="7" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab7{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab8{{Id}}" for="grade_radio08{{Id}}"> <span class="native-display-value">8</span> <input aria-hidden="true" type="radio" id="grade_radio08{{Id}}" class="elementVal" name="{{Id}}" value="8" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab8{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab9{{Id}}" for="grade_radio09{{Id}}"> <span class="native-display-value">9</span> <input aria-hidden="true" type="radio" id="grade_radio09{{Id}}" class="elementVal" name="{{Id}}" value="9" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab9{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab10{{Id}}" for="grade_radio10{{Id}}"> <span class="native-display-value">10</span> <input aria-hidden="true" type="radio" id="grade_radio10{{Id}}" class="elementVal" name="{{Id}}" value="10" aria-label="{{GRADING10}}" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab10{{Id}}\')" onblur="labelhoverout(\'lab10{{Id}}\')"></label></span></form>' 
        + '{{description}}' + '</div>' + '</fieldset>' + '</div>',
    grading0to10: '<div class="form-group rating11" style="margin-bottom: 5px; display:{{Display}}" data-neb-uuid="{{NebUuid}}">' 
        + '<fieldset id="{{Id}}" data-neb-uuid="{{NebUuid}}" >' 
        + '<legend id="lbl_{{Id}}" aria-label="{{Label}}" class="control-label" style="margin-bottom: 0px;"><span>{{Label}}</span><span class="required" data-neb-uuid="{{NebUuid}}">*</span></legend>' 
        + '<div class="grading11"><form>' 
        + '<span class="neb-rating-value"> <label id="lab0{{Id}}" for="grade_radio00{{Id}}"> <span class="native-display-value">0</span> <input aria-hidden="true" type="radio" id="grade_radio00{{Id}}" class="elementVal" name="{{Id}}" value="0" aria-label="{{GRADING0}}" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab0{{Id}}\')" onblur="labelhoverout(\'lab0{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab1{{Id}}" for="grade_radio01{{Id}}"> <span class="native-display-value">1</span> <input aria-hidden="true" type="radio" id="grade_radio01{{Id}}" class="elementVal" name="{{Id}}" value="1" aria-label="2" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab1{{Id}}\')" onblur="labelhoverout(\'lab2{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab2{{Id}}" for="grade_radio02{{Id}}"> <span class="native-display-value">2</span> <input aria-hidden="true" type="radio" id="grade_radio02{{Id}}" class="elementVal" name="{{Id}}" value="2" aria-label="3" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab2{{Id}}\')" onblur="labelhoverout(\'lab3{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab3{{Id}}" for="grade_radio03{{Id}}"> <span class="native-display-value">3</span> <input aria-hidden="true" type="radio" id="grade_radio03{{Id}}" class="elementVal" name="{{Id}}" value="3" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab3{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab4{{Id}}" for="grade_radio04{{Id}}"> <span class="native-display-value">4</span> <input aria-hidden="true" type="radio" id="grade_radio04{{Id}}" class="elementVal" name="{{Id}}" value="4" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab4{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab5{{Id}}" for="grade_radio05{{Id}}"> <span class="native-display-value">5</span> <input aria-hidden="true" type="radio" id="grade_radio05{{Id}}" class="elementVal" name="{{Id}}" value="5" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab5{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab6{{Id}}" for="grade_radio06{{Id}}"> <span class="native-display-value">6</span> <input aria-hidden="true" type="radio" id="grade_radio06{{Id}}" class="elementVal" name="{{Id}}" value="6" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab6{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab7{{Id}}" for="grade_radio07{{Id}}"> <span class="native-display-value">7</span> <input aria-hidden="true" type="radio" id="grade_radio07{{Id}}" class="elementVal" name="{{Id}}" value="7" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab7{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab8{{Id}}" for="grade_radio08{{Id}}"> <span class="native-display-value">8</span> <input aria-hidden="true" type="radio" id="grade_radio08{{Id}}" class="elementVal" name="{{Id}}" value="8" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab8{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab9{{Id}}" for="grade_radio09{{Id}}"> <span class="native-display-value">9</span> <input aria-hidden="true" type="radio" id="grade_radio09{{Id}}" class="elementVal" name="{{Id}}" value="9" aria-label="4" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab9{{Id}}\')" onblur="labelhoverout(\'lab4{{Id}}\')"></label></span>' 
        + '<span class="neb-rating-value"> <label id="lab10{{Id}}" for="grade_radio10{{Id}}"> <span class="native-display-value">10</span> <input aria-hidden="true" type="radio" id="grade_radio10{{Id}}" class="elementVal" name="{{Id}}" value="10" aria-label="{{GRADING10}}" data-neb-uuid="{{NebUuid}}" onfocus="labelhover(\'lab10{{Id}}\')" onblur="labelhoverout(\'lab10{{Id}}\')"></label></span></form>' 
        + '{{description}}' + '</div>' + '</fieldset>' + '</div>',
    // select: '<div class="form-group" id="dropDownContainer" style="display:{{Display}}" data-neb-uuid="{{NebUuid}}">' +
    //   '<fieldset id="{{Id}}" data-neb-uuid = "{{NebUuid}}"> ' +
    //   '<label aria-label="{{ariaLabelText}}" id="lbl_{{Id}}" class="select-label" for="dropdownMenu{{Id}}" aria-labelledby="lbl_{{Id}}">{{Label}}<span class="required" data-neb-uuid="{{NebUuid}}">*</span></label>' +
    //   '<!-- CATEGORY SELECTOR -->' +
    //   '<div class="dropdown" id="dropDown{{Id}}">' +
    //   '  <select data-neb-uuid="{{NebUuid}}" class="neb-dropdown elementVal" id="dropdownMenu{{Id}}">' +
    //   '    <option data-neb-uuid="{{NebUuid}}" value="" disabled selected>{{PlaceHolder}}</option>' +
    //   '   {{DropDownOptions}}' +
    //   '  </select>' +
    //   '</div>' +
    //   '</fieldset> '+
    //   '</div>',
    // textInput: '<div class="form-group" style="display:{{Display}}" data-neb-uuid="{{NebUuid}}" >' +
    //   '<div id="{{Id}}" data-neb-uuid="{{NebUuid}}">' +
    //   '<label tabindex="0" aria-label="{{ariaLabelText}}" for="textInput{{Id}}" id="lbl_{{Id}}" class="catText t2 textInput"">{{Label}}</label>' +
    //   '<div id="textInputDiv{{Id}}" aria-label="{{AriaDescriptionText}}">'+
    //   '<input type="text" id="textInput{{Id}}" class="form-control elementVal textInput" placeholder="{{PlaceHolder}}" data-neb-uuid="{{NebUuid}}" name="{{Id}}" aria-labelledby="lbl_{{Id}} textInputDiv{{Id}} textInput{{Id}}">' +
    //   '</div>' +
    //   '</div>' +
    //   '</div>',
    // "textArea": '<div class="form-group" style="display:{{Display}}" data-neb-uuid="{{NebUuid}}" >' + 
    //     '<div id="textAreaContainer{{Id}}" class="neb-textArea" data-neb-uuid="{{NebUuid}}">' + 
    //     '<label for="textArea{{Id}}" id="lbl_{{Id}}" class="control-label catText t2" aria-label="{{ariaLabelText}}">{{Label}}<span class="required" data-neb-uuid="{{NebUuid}}">*</span></label>' + 
    //     '<textarea id="countTextArea" class="form-control elementVal" rows="{{NumberRow}}" placeholder="{{PlaceHolder}}" aria-labelledby="lbl_{{Id}}" data-neb-uuid="{{NebUuid}}" maxlength="250"></textarea>' +
    //     '<div id="character-counter">'+
    //             '<span id="typed-characters">0</span>'+
                
    //             '<span id="maximum-characters"> of 250 characters</span>'+
    //         '</div>'+ '</div>' + '</div>',
  };

/*  function addAestrisk(componentObj) {
    if (componentObj.required) {
      //componentObj.label = componentObj.label + ' *';
    }
  }*/


//   window.addEventListener('kampyleFormShown', customParameterLoad);
//   function customParameterLoad(){
//     var customParameters = KAMPYLE_SDK.getAllCustomParams();
//     if (customParameters.length > 0) {
//         for (i = 0; i < customParameters.length; i++) {
//             if(customParameters[i].id === kpl_formJson.settings.formLocalizationSettings.customParam.toString()){
//                 if(customParameters[i].value){
//                     window.mLang = customParameters[i].value;
//                     break;
//                 }else
//                     window.mLang = "en";
//             }else
//                 window.mLang = "en";
//         }
//     } else {
//         window.mLang = "en";
//     }
// }

  function getTemplate(component, componentObj) {
    componentObj = componentObj || {};
    //addAestrisk(componentObj);
    var newTemplate = templates[component] || '';
    if (componentObj && componentObj.description.toLowerCase().indexOf('addna|') >= 0) {
      return (newTemplate || '').replace(/{{addNAOption}}/g, 'yes');
    } else {
      return (newTemplate || '').replace(/{{addNAOption}}/g, 'no');
    }
  }

  function testFunction() {
    // $('#datepicker').datepicker({format: "dd.mm.yyyy"}).on('change',function() {$('.datepicker').hide();});
    $('.accumulate .rate-area label').mouseenter(function() {
      var currentUuid = $(this).attr('data-neb-uuid');
      if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
        $(this).addClass("hovered");

        var cnt = $('div[data-neb-uuid='+currentUuid+'] .rate-area label').length;
        var hoveredEle = $('div[data-neb-uuid='+currentUuid+'] .rate-area label.hovered').index();
        hoveredEle = ((hoveredEle + 1) / 2) - 1;
        var allLabels = $('div[data-neb-uuid='+currentUuid+'] .rate-area label');

        for (var i = 0; i < cnt; i++) {
          if (i < hoveredEle) {
            allLabels.eq(i).addClass('hovered');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i == hoveredEle) {
            //allLabels.eq(i).toggleClass('hovered');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i > hoveredEle) {
            allLabels.eq(i).addClass('notHovered');
            //$('.rate-area label')[i].addClass('notHovered');
          }

        }
      }
    });
    $('.accumulate .rate-area label').keypress(function(event){
      if(event.which === 32){
        this.click();
      }
    });

    $('.accumulate ul li').keydown(function(e) {
        if(e.keyCode != 32){
            return;
        }
        if($(this).attr('aria-checked') == 'true'){
            var that = this;
            $(this).attr('aria-checked', false);
            $(this).find('input').prop('checked',false);
            // $(this).find('input').attr('aria-label','Unselected. ' + $(this).find('input').attr('aria-label'));
            $($(this.parentElement.children).find('label')).removeClass('clicked');
            $($(this.parentElement.children).find('label')).removeClass('on');
            $(this.parentElement.children).attr('tabindex','-1');
            $($(this.parentElement.children)[0]).attr('tabindex','0');
            // setTimeout(function(){
            //     $(that).find('input').attr('aria-label',$(that).find('input').attr('aria-label').split('Unselected. ')[1])
            // },100);
            return;
        }
        if($($(this).find('input')).prop('checked') == true){
            // e.preventDefault();
            // var that = this;
            // // $(this).attr('aria-checked', false);
            // $(this).find('input').prop('checked',false);
            // if(window.navigator.userAgent.indexOf('Firefox') != -1){
            //     window.tempVar = $($(this).find('input'))[0].id;
            //     setTimeout(function(){
            //         $('#' + window.tempVar).prop('checked',false)
            //     },75)
            // }
            // // $(this).find('input').attr('aria-label','Unselected. ' + $(this).find('input').attr('aria-label'));
            // $($(this.parentElement.children).find('label')).removeClass('clicked');
            // $($(this.parentElement.children).find('label')).removeClass('on');
            // // $(this.parentElement.children).attr('tabindex','-1');
            // // $($(this.parentElement.children)[0]).attr('tabindex','0');
            // // setTimeout(function(){
            // //     $(that).find('input').attr('aria-label',$(that).find('input').attr('aria-label').split('Unselected. ')[1])
            // // },100);
            // return 0;
        }
        e.preventDefault();
        // $(this.parentElement.children).attr('aria-checked',false);
        // $(this).attr('aria-checked',true);
        var currentUuid = $(this).find('label').attr('data-neb-uuid');
        if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
        var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id

        var cnt = $('#' + fieldsetId + ' .accumulate ul li label').length;
        var allLabels = $('#' + fieldsetId + ' .accumulate ul li label');
          for (var i = 0; i < cnt; i++) {
            allLabels.eq(i).removeClass('notHovered');
            allLabels.eq(i).removeClass('hovered');
            allLabels.eq(i).removeClass('clicked');
            allLabels.eq(i).removeClass('on');
          }
           $(this).find('label').addClass("clicked");
           // $(this.parentElement.children).attr('tabindex','-1')
           // $(this).attr('tabindex','0');
        var hoveredEle = $('#' + fieldsetId + ' .accumulate ul li label.clicked')[0].innerText;
        hoveredEle = parseInt(hoveredEle);
        $('input[data-neb-uuid='+currentUuid+'][value='+ hoveredEle +']').prop('checked',true);
        for (var i = 0; i < cnt; i++) {
          if (i < hoveredEle) {
            allLabels.eq(i).addClass('on');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i == hoveredEle) {
            //allLabels.eq(i).toggleClass('hovered');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i > hoveredEle) {
            allLabels.eq(i).removeClass('hovered');
            allLabels.eq(i).removeClass('clicked');
            allLabels.eq(i).removeClass('on');
            //$('.rate-area label')[i].addClass('notHovered');
          }
        }
      }
    });

    $('.single ul li label').keydown(function(e) {
        if(e.keyCode != 32){
            return;
        }
        if($(this).attr('aria-checked') == 'true'){
            var that = this;
            $(this).attr('aria-checked', false);
            $(this).find('input').prop('checked',false);
            // $(this).find('input').attr('aria-label','Unselected. ' + $(this).find('input').attr('aria-label'));
            $($(this.parentElement.children).find('label')).removeClass('clicked');
            $($(this.parentElement.children).find('label')).removeClass('on');
            // setTimeout(function(){
            //     $(that).find('input').attr('aria-label',$(that).find('input').attr('aria-label').split('Unselected. ')[1])
            // },100);
            return;
        }
        if($($(this).find('input')).prop('checked') == true){
            var that = this;
            // $(this).attr('aria-checked', false);
            $(this).find('input').prop('checked',false);
            // $(this).find('input').attr('aria-label','Unselected. ' + $(this).find('input').attr('aria-label'));
            $($(this.parentElement.children).find('label')).removeClass('clicked');
            $($(this.parentElement.children).find('label')).removeClass('on');
            // $(this.parentElement.children).attr('tabindex','-1');
            // $($(this.parentElement.children)[0]).attr('tabindex','0');
            // setTimeout(function(){
            //     $(that).find('input').attr('aria-label',$(that).find('input').attr('aria-label').split('Unselected. ')[1])
            // },100);
            return 0;
        }

        e.preventDefault();
        // $(this.parentElement.children).attr('aria-checked',false);
        $(this).attr('aria-checked',true);
        var currentUuid = $(this).find('label').attr('data-neb-uuid');
        if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
          var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id

          var cnt = $('#' + fieldsetId + ' .single ul li label').length;
          $(this).find('label').addClass("clicked");
          var hoveredEle = $('#' + fieldsetId + ' .single ul li label.clicked')[0].innerText;
          hoveredEle = parseInt(hoveredEle);
          $('input[data-neb-uuid='+currentUuid+'][value='+ hoveredEle +']').prop('checked',true);
          var allLabels = $('#' + fieldsetId + ' .single ul li label');
          for (var i = 0; i < cnt; i++) {
            allLabels.eq(i).removeClass('notHovered');
            allLabels.eq(i).removeClass('hovered');
            allLabels.eq(i).removeClass('clicked');
            allLabels.eq(i).removeClass('on');
          }
          $(this).find('label').addClass("clicked");
        }
    });


    $('.single .rate-area label').mouseenter(function() {
      var currentUuid = $(this).attr('data-neb-uuid');
      if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
      $(this).addClass("hovered");}});

    $('.accumulate ul li label').click(function(e) {

        if($(this.parentElement).attr('aria-checked') == 'true'){
            $(this.parentElement).attr('aria-checked', false);
            $(this.parentElement).find('input').prop('checked',false);
            $(this).find('input').attr('aria-label','Unselected. ' + $(this).find('input').attr('aria-label'));
            $($(this.parentElement.parentElement.children).find('label')).removeClass('clicked');
            $($(this.parentElement.parentElement.children).find('label')).removeClass('hovered');
            $($(this.parentElement.parentElement.children).find('label')).removeClass('on');
            $(this.parentElement.parentElement.children).attr('tabindex','-1');
            $($(this.parentElement.parentElement.children)[0]).attr('tabindex','0');
            return;
        }
        if($($(this.parentElement).find('input')).prop('checked') == true){
            // e.preventDefault();
            // var that = this;
            // // $(this).attr('aria-checked', false);
            // $(this.parentElement).find('input').prop('checked',false);
            // // $(this).find('input').attr('aria-label','Unselected. ' + $(this).find('input').attr('aria-label'));
            // $($(this.parentElement.parentElement.children).find('label')).removeClass('clicked');
            // $($(this.parentElement.parentElement.children).find('label')).removeClass('on');
            // // $(this.parentElement.children).attr('tabindex','-1');
            // // $($(this.parentElement.children)[0]).attr('tabindex','0');
            // // setTimeout(function(){
            // //     $(that).find('input').attr('aria-label',$(that).find('input').attr('aria-label').split('Unselected. ')[1])
            // // },100);
            // return;
        }

        //$(this.parentElement.parentElement.children).attr('aria-checked',false);
        //$(this.parentElement).attr('aria-checked',true);
        var currentUuid = $(this).attr('data-neb-uuid');
        if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
        var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id

        var cnt = $('#' + fieldsetId + ' .accumulate ul li label').length;
        var allLabels = $('#' + fieldsetId + ' .accumulate ul li label');
          for (var i = 0; i < cnt; i++) {
            allLabels.eq(i).removeClass('notHovered');
            allLabels.eq(i).removeClass('hovered');
            allLabels.eq(i).removeClass('clicked');
            allLabels.eq(i).removeClass('on');
          }
           $(this).addClass("clicked");
           // $(this.parentElement.parentElement.children).attr('tabindex','-1')
           // $(this.parentElement).attr('tabindex','0');
        var hoveredEle = $('#' + fieldsetId + ' .accumulate ul li label.clicked')[0].innerText;
        hoveredEle = parseInt(hoveredEle);
        $('input[data-neb-uuid='+currentUuid+'][value='+ hoveredEle +']').prop('checked',true);
        for (var i = 0; i < cnt; i++) {
          if (i < hoveredEle) {
            allLabels.eq(i).addClass('on');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i == hoveredEle) {
            //allLabels.eq(i).toggleClass('hovered');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i > hoveredEle) {
            allLabels.eq(i).removeClass('hovered');
            allLabels.eq(i).removeClass('clicked');
            allLabels.eq(i).removeClass('on');
            //$('.rate-area label')[i].addClass('notHovered');
          }
        }
      }
    });
    $('.accumulate ul li label').mouseenter(function() {
        var currentUuid = $(this).attr('data-neb-uuid');
        if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
        var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id
        $(this).addClass("hovered");

        var cnt = $('#' + fieldsetId + ' .accumulate ul li label').length;
        var hoveredEle = $('#' + fieldsetId + ' .accumulate ul li label.hovered')[0].innerText;
        hoveredEle = parseInt(hoveredEle);
        var allLabels = $('#' + fieldsetId + ' .accumulate ul li label');

        for (var i = 0; i < cnt; i++) {
          if (i < hoveredEle) {
            allLabels.eq(i).addClass('hovered');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i == hoveredEle) {
            //allLabels.eq(i).toggleClass('hovered');
            //$('.rate-area label')[i].addClass('hovered');
          }

          if (i > hoveredEle) {
            allLabels.eq(i).addClass('notHovered');
            //$('.rate-area label')[i].addClass('notHovered');
          }

        }
      }
    });
    $('.accumulate ul li label').mouseleave(function() {
        var currentUuid = $(this).attr('data-neb-uuid');
        $(this).removeClass("hovered");
        var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id

        var cnt = $('#' + fieldsetId + ' .accumulate ul li label').length;
        var allLabels = $('#' + fieldsetId + ' .accumulate ul li label');

        for (var i = 0; i < cnt; i++) {
          allLabels.eq(i).removeClass('hovered');
          allLabels.eq(i).removeClass('notHovered');
          //$('.rate-area label')[i].addClass('hovered');
        }

      });
    $('.single ul li label').mouseleave(function() {
        var currentUuid = $(this).attr('data-neb-uuid');
        $(this).removeClass("hovered");
      });
    $('.single ul li label').mouseenter(function() {
        var currentUuid = $(this).attr('data-neb-uuid');
        if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
        var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id
        $(this).addClass("hovered");      
      }
    });
    $('.single ul li label').click(function() {

        if($(this.parentElement).attr('aria-checked') == 'true'){
            $(this.parentElement).attr('aria-checked', false);
            $(this.parentElement).find('input').prop('checked',false);
            $($(this.parentElement.parentElement.children).find('label')).removeClass('clicked');
            $($(this.parentElement.parentElement.children).find('label')).removeClass('hovered');
            $($(this.parentElement.parentElement.children).find('label')).removeClass('on');
            $(this.parentElement.parentElement.children).attr('tabindex','-1');
            $($(this.parentElement.parentElement.children)[0]).attr('tabindex','0');
            return;
        }
        if($($(this.parentElement).find('input')).prop('checked') == true){
            var that = this;
            // $(this).attr('aria-checked', false);
            $(this.parentElement).find('input').prop('checked',false);
            // $(this).find('input').attr('aria-label','Unselected. ' + $(this).find('input').attr('aria-label'));
            $($(this.parentElement.parentElement.children).find('label')).removeClass('clicked');
            $($(this.parentElement.parentElement.children).find('label')).removeClass('on');
            // $(this.parentElement.children).attr('tabindex','-1');
            // $($(this.parentElement.children)[0]).attr('tabindex','0');
            // setTimeout(function(){
            //     $(that).find('input').attr('aria-label',$(that).find('input').attr('aria-label').split('Unselected. ')[1])
            // },100);
            return 0;
        }
        $(this.parentElement.parentElement.children).attr('aria-checked',false);
        $(this.parentElement).attr('aria-checked',true);
        var currentUuid = $(this).attr('data-neb-uuid');
        if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
          var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id

          var cnt = $('#' + fieldsetId + ' .single ul li label').length;
          $(this).addClass("clicked");
          $(this.parentElement.parentElement.children).attr('tabindex','-1')
           $(this.parentElement).attr('tabindex','0');
          var hoveredEle = $('#' + fieldsetId + ' .single ul li label.clicked')[0].innerText;
          hoveredEle = parseInt(hoveredEle);
          $('input[data-neb-uuid='+currentUuid+'][value='+ hoveredEle +']').prop('checked',true);
          var allLabels = $('#' + fieldsetId + ' .single ul li label');
          for (var i = 0; i < cnt; i++) {
            allLabels.eq(i).removeClass('notHovered');
            allLabels.eq(i).removeClass('hovered');
            allLabels.eq(i).removeClass('clicked');
            allLabels.eq(i).removeClass('on');
          }
          $(this).addClass("clicked");
        }
    });

    $('.single ul li label').keypress(function(event) {
      if(event.which === 32){
      this.click();   
    }
    });
    $('.accumulate ul li label').keypress(function(event){
      if(event.which === 32){
        this.click();
      }
    });

    $('.radioul .radioli .radioLabel label').keypress(function(event){
      if(event.which === 32){
        this.click()
      }
    });

    $('.li-nps').keydown(function(e){ 
    if(e.which != 9){
        e.preventDefault();    
    } 
    // var tabKey = jQuery.Event('keydown');
    // tabKey.which = 9;
 //    debugger;
    // if(e.which == 37){
    //     if($($(this).find('input')).val() == 0){
    //      tabKey.shiftKey = true;
    //      $(this).trigger(tabKey);
    //      $(this.parentElement.parentElement).prev().focus();
    //     }else{
    //      $(this).prev().focus();
    //     }
    // }else if(e.which == 39){
    //     if($($(this).find('input')).val() == 10){
    //      //$(this.parentElement.parentElement).prev().focus();
    //      $(this).trigger(tabKey);
    //     }else{
    //      $(this).next().focus();
    //     }
    // }
    if(e.which == 38 || e.which == 37){
        if($($(this).find('input')).val() == 0){
            $(this.parentElement.lastElementChild).focus();
        }else{
            $(this).prev().focus();
        }
    }else if(e.which == 40 || e.which == 39){
        if($($(this).find('input')).val() == 10){
            $(this.parentElement.firstElementChild).focus();
        }else{
            $(this).next().focus();
        }
    }
    });
    $('.li-nps input').keydown(function(e){ 
    if(e.which != 9){
        e.preventDefault();    
    } 
    // var tabKey = jQuery.Event('keydown');
    // tabKey.which = 9;
 //    debugger;
    // if(e.which == 37){
    //     if($($(this).find('input')).val() == 0){
    //      tabKey.shiftKey = true;
    //      $(this).trigger(tabKey);
    //      $(this.parentElement.parentElement).prev().focus();
    //     }else{
    //      $(this).prev().focus();
    //     }
    // }else if(e.which == 39){
    //     if($($(this).find('input')).val() == 10){
    //      //$(this.parentElement.parentElement).prev().focus();
    //      $(this).trigger(tabKey);
    //     }else{
    //      $(this).next().focus();
    //     }
    // }
    if(e.which == 38 || e.which == 37){
        if($($(this)).val() == 0){
            $($(this.parentElement.parentElement.lastElementChild).find('input')).focus();
            $($(this.parentElement.parentElement.lastElementChild).find('label')).click();
        }else{
            $($($(this.parentElement).prev()).find('input')).focus();
            $($($(this.parentElement).prev()).find('label')).click();
        }
    }else if(e.which == 40 || e.which == 39){
        if($($(this)).val() == 10){
            $($(this.parentElement.parentElement.firstElementChild).find('input')).focus();
            $($(this.parentElement.parentElement.firstElementChild).find('label')).click();
        }else{
            $($($($(this.parentElement)).next()).find('input')).focus();
            $($($($(this.parentElement)).next()).find('label')).click();
        }
    }
    });
    $('.dropdown-menu li button').keydown(function(e){
        if(e.which == 38){
            e.preventDefault();
            $($($(this.parentElement).prev()).find('button')).focus()
        }
        if(e.which == 40){
            e.preventDefault()
            $($($(this.parentElement).next()).find('button')).focus();
        }
    })
    $('.dropdown-toggle').keydown(function(e){
        var that = this;
        if(e.which == 13 || e.which == 32){
            setTimeout(function(){
                if($($($(that).next()).find('button[aria-selected="true"]')).length == 1){
                    $($($(that).next()).find('button[aria-selected="true"]')).focus()
                }else{
                    $($($(that).next()).find('button')[0]).focus();
                }
            },100);
        }
    });
    $('.dropdown-menu li:last-child button').keydown(function(e){
        if(e.which == 40){
            e.preventDefault();
            $('.dropdown-menu li:first-child button').focus()
        }
    })
  }

  function testFunction1() {
    $('.accumulate .rate-area label').mouseleave(function() {
    var currentUuid = $(this).attr('data-neb-uuid');
      $(this).removeClass("hovered");

      var cnt = $('div[data-neb-uuid=' + currentUuid + '] .rate-area label').length;
      var allLabels = $('div[data-neb-uuid=' + currentUuid + '] .rate-area label');

      for (var i = 0; i < cnt; i++) {
        allLabels.eq(i).removeClass('hovered');
        allLabels.eq(i).removeClass('notHovered');
        //$('.rate-area label')[i].addClass('hovered');
      }

    });
    $('.single .rate-area label').mouseleave(function() {
      var currentUuid = $(this).attr('data-neb-uuid');
      if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
      $(this).removeClass("hovered");}});
  }

  function updateRadioStatus() {
    var currentUuid = $(this).attr('data-neb-uuid');

    $('input[type="radio"]').focusin(function() {
      $(this).attr('aria-checked','true');
    });
    $('input[type="radio"]').focusout(function() {
      $(this).attr('aria-checked','false');
    });
  }

  function clickedStars() {

    $('.accumulate .rate-area input[type="radio"]').click(function() {
    var currentUuid = $(this).attr('data-neb-uuid');
      var cnt = $('div[data-neb-uuid=' + currentUuid + '] .rate-area label').length;
      var allLabels = $('div[data-neb-uuid=' + currentUuid + '] .rate-area label');

      for (var t = 0; t < cnt; t++) {
        allLabels.eq(t).removeClass("clicked");
      }

      var currLabel = $("label[for='" + $(this).attr("id") + "']");
      $(currLabel).addClass("clicked");

      var clickedEle = $('div[data-neb-uuid=' + currentUuid + '] .rate-area label.clicked').index();
      clickedEle = ((clickedEle + 1) / 2) - 1;

      for (var i = 0; i < cnt; i++) {
        if (i < clickedEle) {
          allLabels.eq(i).addClass('clicked');
          //$('.rate-area label')[i].addClass('hovered');
        }

        if (i == clickedEle) {
          //allLabels.eq(i).toggleClass('hovered');
          //$('.rate-area label')[i].addClass('hovered');
        }

        if (i > clickedEle) {
          allLabels.eq(i).removeClass('clicked');
          //$('.rate-area label')[i].addClass('notHovered');
        }

      }
    });

    $('.accumulate .rate-area input[type="radio"]').keypress(function(event) {
      if(event.which === 32){
        this.click(); 
    }
    });

    $('.single .rate-area label').click(function() {
      var currentUuid = $(this).attr('data-neb-uuid');
      if($('input[data-neb-uuid='+currentUuid+']').attr('disabled') != 'disabled'){
     var fieldsetId = $('fieldset[data-neb-uuid=' + currentUuid + ']')[0].id

      var cnt = $('#' + fieldsetId + ' .single .rate-area label').length;
      var allLabels = $('#' + fieldsetId + ' .single .rate-area label');
        for (var i = 0; i < cnt; i++) {
          allLabels.eq(i).removeClass('notHovered');
          allLabels.eq(i).removeClass('hovered');
          allLabels.eq(i).removeClass('clicked');
          allLabels.eq(i).removeClass('on');
        }
         $(this).addClass("clicked");
    }
  });

    $('.single .rate-area label').keypress(function(event) {
      if(event.which === 32){
        this.click();
  }
  });
  }

  function sliderTap(value,scaleType,nebUuid){
    //var nebUuid = $(this).parent().attr("data-neb-uuid");
    $('input[data-neb-uuid='+nebUuid+']').val(value*10).change();
    var loopStart = (scaleType==7)?1:0;
    
    var trLength = $('table div[data-neb-uuid='+nebUuid+']').length;
    for(var i=loopStart; i<trLength; i++){
      if(i==value){
        $('#td'+value+'_'+nebUuid+' div').attr("aria-checked",'true');
      }else{
        $('#td'+i+'_'+nebUuid+' div').attr("aria-checked",'false');
      }
    }
  }
  function getPrevious() {
    return previous;
  }

  function setPrevious(newActiveElement) {
    previous = newActiveElement;
  }

  /*function toggleCheckbox(event,nebUuid) {

    var node = event.currentTarget;
  
    var state = node.getAttribute('aria-checked').toLowerCase();
  
    if (event.type === 'click' || 
        (event.type === 'keydown' && event.keyCode === 32)
        ) {

          var trLength = $('fieldset[data-neb-uuid='+nebUuid+'] table tr td div').length;
          for(var i=0; i<trLength; i++){
            $('fieldset[data-neb-uuid='+nebUuid+'] table tr td div').eq(i).attr("aria-checked",'false');
          }

            if (state === 'true') {
              node.setAttribute('aria-checked', 'false');
            }
            else {
              node.setAttribute('aria-checked', 'true');
            }  
  
      event.preventDefault();
      event.stopPropagation();
    }
  
  }*/

  function addCustomElement() {
    $('#page_1').prepend('<div class="row"><div class="col-sm-12 pull-right" style="padding-right: 15px;"><a href="#" class="close" onclick="clickSend()">&times</a></div></div>');
    $('#page_1').prepend('<div class="close-btn-row"><div class="x-button-offset"><div id="btnClose" class="btnClose headerClose" onclick="closeThis()" aria-label="close">x</div></div></div>');
  }

  function getCustomChanges() { //clear if there are no changes on button styling
    $('#submitBtn').text('Submit');
    $('#submitBtn').hide();
  }

  function clickNext() {
    var currentPage = KAMPYLE_DATA.getCurrentPage() + 1;
    var numOfPages = KAMPYLE_DATA.getNumOfPages();
    if (validation(KAMPYLE_DATA.getCurrentPage() - 1)) {
      KAMPYLE_DATA.setCurrentPage(currentPage);
      KAMPYLE_VIEW.showOnlyPage(numOfPages, currentPage);
      if (numOfPages === currentPage) { //last page

        $('#nextBtn').hide();
        $('#submitBtn').show();
      }
      KAMPYLE_VIEW.showBackButton();
      if (KAMPYLE_SPECIFIC.changeFlowBehavior) {
        KAMPYLE_SPECIFIC.changeFlowBehavior(currentPage);
      }
    }
    KAMPYLE_VIEW.focusOnFirstElement();
    KAMPYLE_SDK.iFrameHeightChanged && KAMPYLE_SDK.iFrameHeightChanged();
    KAMPYLE_SDK.scrollToTop();
  }

  function clickClose() {
    KAMPYLE_VIEW.unsetCircularTabNavigation();
    if (typeof(KAMPYLE_SDK) === 'undefined') {
      var closeMe = setTimeout(function() {
        var htmlBackup = $('#newform_innerWrapper').html();
        $('#newform_innerWrapper').html().show();
      }, 1000);
    } else {
      KAMPYLE_SDK.kampyleCloseWindow();
    }
  }

  function clickSend() {
    var currentPage = KAMPYLE_DATA.getCurrentPage() - 1;

    var reasoncmt = getLabelByUuid(KAMPYLE_FORM_MODEL.getNebUuidByUniqueName('REASON_CMT'));
    var maskedData = maskInputText(reasoncmt);
    var inputTxt = document.querySelectorAll('div[data-neb-uuid="' + KAMPYLE_FORM_MODEL.getNebUuidByUniqueName('REASON_CMT') + '"] .elementVal')[0];
    if(!!reasoncmt){
    inputTxt.value = maskedData;
    }

    var data = prepareSubmitContract();
    if (!validation(currentPage)) {
      KAMPYLE_SDK.iFrameHeightChanged && KAMPYLE_SDK.iFrameHeightChanged();
    } else if (validation(currentPage)) {
      KAMPYLE_SDK.kampyleSubmit(data, false /* Do not close after submit*/ );

      $('.page-container').empty();
      //$('.close-btn-row').remove();
      $('#submitBtn').hide();
      

    $('#form').addClass('thankyouRow');
    $('#page_1').removeClass('noSelected');
      //$('#closeBtn').show();
      //$('#closeBtn').text('done');
      //$('div.close-btn-row').css('margin-top', '')

      $('.page-container').prepend('<div class="thankyou">'
                                    +'<span id="thankyou_h2"><h1 style="font-size:28px; text-align:left;color:#383B3E;">'+"Thanks for your feedback!"+'</h1>'
                                    +'<div id="thankyou_imgCont"></div>');

      // if(window.mLang === "sv"){
      //   $('.page-container').prepend('<div class="thankyou">'
      //                               +'<div id="thankyou_imgCont"><img src="res/check.png" alt="" id="thankyou_image"></div>'
      //                               +'<span id="thankyou_h2"><h1 style="font-size:28px; text-align:left;color:#383B3E;">'+"Tack för din feedback!"+'</h1>'
      //                               +'<span id="thankyou_h3">Vi kommer ta den till oss och se till att göra våra guider så bra vi kan.</span></span></div>');
      // }else{
      //   $('.page-container').prepend('<div class="thankyou">'
      //                               +'<div id="thankyou_imgCont"><img src="res/check.png" alt="" id="thankyou_image"></div>'
      //                               +'<span id="thankyou_h2"><h1 style="font-size:28px; text-align:left;color:#383B3E;">'+"Thank you for your feedback!"+'</h1>'
      //                               +'<span id="thankyou_h3">We will take it to heart and make sure to make our guides as good as we can.</span></span></div>');
      // }
      
      
      $('#thankyou_h2 h1').focus();
      //KAMPYLE_SDK.scrollToTop();
      document.querySelector('#form').scrollIntoView();
      $('#closeBtn').css('background-color','#ec0000');
      // if(window.isFrench){
      //   $('#closeBtn').text(CIBC_BASE64.FrenchClose); 
      //   $('#closeBtn').attr('aria-label'," " + CIBC_BASE64.FrenchClose); 
      // }else{
      //   $('#closeBtn').text(CIBC_BASE64.EnglishClose);
      //   $('#closeBtn').attr('aria-label'," " + CIBC_BASE64.EnglishClose);
      // }
      $('#closeBtn').text("Close");
      $('#closeBtn').attr('aria-label'," " + "Close");
      $('#closeBtn').css('color','#ffffff');
      $('#closeBtn').addClass('finishButton');
      $('#footerSection').addClass('thankYouFooter');
      $('.finishButton').keydown(function(e){
        if(e.which==9){
            e.preventDefault();
            setTimeout(function(){
                $('#btnClose').focus()
            }, 100);    
        }
      });
      $('#btnClose').keydown(function(e){
        if(e.which == 9 && e.shiftKey == true){
            e.preventDefault();
            setTimeout(function(){
                $('.finishButton').focus();
            },100)
        }
      });
      setTimeout(function(){
        $('#btnClose').focus();
      },100);
      setTimeout(function(){
        KAMPYLE_SDK.iFrameHeightChanged && KAMPYLE_SDK.iFrameHeightChanged(document.body.scrollHeight+100);
      },200);
      //$('.thankyou').focus();
    }
  }

  function assignHandlers() { //clear if there are no custom components
    $('#screen-capture').on('click', triggerScreenCapture);
    $('.radioButtons input[type=radio]').on('change', radioChange);
    //$('.thumbsup .radio').on('click', radioChange);

  }

function radioChange() {
    $('input:radio').parent().removeClass('checked');
    $(this).parent(this).addClass('checked');

    if (this.type === "") {
        initCond($(this).attr('value'), $(this).attr('data-neb-uuid'), this.type);
    } else {
        initCond(this.value, $(this).attr('data-neb-uuid'), this.type);
    }

    if($(this).val() === "1"){
        //Yes
        clickSend();
    }else{
        //No
        //$('#page_1').addClass('noSelected');
        //$(this).closest('fieldset').children('legend').text('We are sorry to hear that');

        //const maximumCharactersElement = document.querySelector("#maximum-characters");
        //$('#submitBtn').text('Skicka');
        //maximumCharactersElement.textContent = ' av 250 tecken';

         //if(window.mLang === 'sv')
        // {
        //     $('#submitBtn').text('Skicka');
        //     maximumCharactersElement.textContent = ' av 250 tecken';
        // } else{
        //     $('#submitBtn').text('Submit');
        //     maximumCharactersElement.textContent = ' of 250 characters';
        // }

        KAMPYLE_UTILS.setElementStyle(document.getElementById('submitBtn'), {
            display: 'inline-block'
        });
    }
}

  function triggerScreenCapture() {
    KAMPYLE_SDK.kampyleTriggerScreenCapture(disableScreenCapture);
  }

  function disableScreenCapture() {
    KAMPYLE_UTILS.show(document.getElementById('disable-screen-capture'));
    $('.screen-capture').addClass('neb-disabled');
    $('#screen-capture').addClass('neb-disabled');
  }

  /*screenCapture is disabled for all forms except Always On form*/
  function addScreenCapture() {
    var formName = KAMPYLE_SDK.kampyleGetFormObject().name;
    var screenCaptureTemplate =
      '<img id="disable-screen-capture" src="{{disableScreenCapture}}">' +
      '<img title="Attach a Screen Capture to your feedback" id="screen-capture" src="{{screenCapture}}">';
    if (formName === '5. Always on' && !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))) {
      screenCaptureTemplate = '<img id="disable-screen-capture" src="{{disableScreenCapture}}">' +
        '<img title="Attach a Screen Capture to your feedback" id="screen-capture" src="{{screenCapture}}">' + '<style>.screen-capture {visibility: hidden;margin-left:3%;}</style>';
    } else {
      screenCaptureTemplate = '<img id="disable-screen-capture" src="{{disableScreenCapture}}">' +
        '<img title="Attach a Screen Capture to your feedback" id="screen-capture" src="{{screenCapture}}">' + '<style>.screen-capture {display: none;margin-left:3%;}</style>';
    }

    screenCaptureTemplate = screenCaptureTemplate.replace(/{{disableScreenCapture}}/g, KAMPYLE_CLIENT_CONFIG.ROUTES.disableScreenCapture);
    screenCaptureTemplate = screenCaptureTemplate.replace(/{{screenCapture}}/g, KAMPYLE_CLIENT_CONFIG.ROUTES.screenCapture);

    var template = document.createElement('div');
    template.className = 'screen-capture';
    template.innerHTML = screenCaptureTemplate;


    var parent = document.querySelector('div#footerSection div.btnsCol');
    var child = document.querySelector('div#footerSection div.btnsCol button#closeBtn');
    //var child = document.querySelector('div#footerSection div.btnsCol');

    parent.insertBefore(template, child);
  }

  /*If form is Always On, add 'X' button image and hide 'Close' button from footer, else, just add 'X' image*/
  function addCloseButtonWhenLoadDone(extraHeight) {
    Digital_Event_Dispatcher.subscribe('neb_pagesBuildingDone', function() {
      var formName = KAMPYLE_SDK.kampyleGetFormObject().name;
      /*var html =
      '<div class="dummy" aria-label="Close" width="1" height="1"><span style="color:#fff">Form</span></div>' +
      '<div class="close-btn-row">' +
      '<div class="x-button-offset">' +
      '<button id="btnClose" class="btnClose headerClose" onclick="clickClose()"><img id="btnClose" src="https://assets.kampyle.com/resources/RC/clients/target/assets/Close2x.png" aria-label="close"/></button>' +
      '<style>.btn {margin-right:10% !important;};</style>' +
      '</div>' +
      '</div>';*/
      var height = $('.page-container').height() + extraHeight;
      $('.close-btn-row').remove()
      //var html = '<div class="dummy" id="dummy" style="height:0;width:0;"><span id="dummySpan" tabindex="-1" style="color:#fff" aria-label="Feedback Form" onfocus="firstFocusOnLogo()">Feedback Form</span></div>';
      // if(window.isFrench){
      //   var closeHtml = '<div class="close-btn-row">' +
      //   '<div class="x-button-offset">' +
      //   '<button id="btnClose" class="btnClose headerClose" tabindex="0" onclick="clickCloseCustom()" aria-label=" ' + CIBC_BASE64.FrenchClose + '">X</button>' +
      //   '</div>' +
      //   '</div>';
      // }else{
      //   var closeHtml = '<div class="close-btn-row">' +
      //   '<div class="x-button-offset">' +
      //   '<button id="btnClose" class="btnClose headerClose" tabindex="0" onclick="clickCloseCustom()" aria-label=" ' + CIBC_BASE64.EnglishClose + '">X</button>' +
      //   '</div>' +
      //   '</div>';
      // }

      var closeHtml = '<div class="close-btn-row">' +
        '<div class="x-button-offset">' +
        '<button id="btnClose" class="btnClose headerClose" tabindex="0" onclick="clickCloseCustom()" aria-label="Close">X</button>' +
        '</div>' +
        '</div>';
      
      $('.page-container').before($(closeHtml));
      $('#btnClose').keydown(function(e){
        if(e.which == 9 && e.shiftKey == true){
        e.preventDefault();
        setTimeout(function(){
        $('#closeBtn').focus();
        },10)
        }
    });
      $('#closeBtn').keydown(function(e) {
        if(e.which == 9 && e.shiftKey == false){
            e.preventDefault();
            setTimeout(function(){
                $('#btnClose').focus();
            },10);
        }
      })
      $('#submitBtn').keydown(function(e) {
        if(e.which == 9 && e.shiftKey == false){
            e.preventDefault();
            setTimeout(function(){
                $('#closeBtn').focus();
            },10);
        }
      })
      $('#closeBtn').keydown(function(e) {
        if(e.which == 9 && e.shiftKey == true){
            e.preventDefault();
            setTimeout(function(){
                $('#submitBtn').focus();
            },10);
        }
      })
      $('#closeBtn.finishButton').keydown(function(e) {
        if(e.which == 9){
          e.preventDefault()
          setTimeout(function(){
                $('#btnClose').focus()
          },10);
        }
      })
      $('#privacy p:last-of-type a').keydown(function(e){
        if(e.which == 9 && e.shiftKey == false){
            e.preventDefault();
            setTimeout(function(){
                $('#submitBtn').focus();
            },10);
        }
      })
      $('#submitBtn').keydown(function(e){
        if(e.which == 9 && e.shiftKey == true){
            e.preventDefault();
            setTimeout(function(){
                $('#privacy p:last-of-type a').focus();
            },10);
        }
      })
      //$('.powerBySection').append($(closeHtml));
    });
  };

  function changeTexts() {
    //$('#closeBtn').text('cancel');
    $('#nextBtn').text('next');
    var formName = KAMPYLE_SDK.kampyleGetFormObject().name;;
    // if(window.isFrench){
    //     $('#submitBtn').text(CIBC_BASE64.FrenchSubmit);
    // }else{
    //   $('#submitBtn').text('Submit');
    // }

    $('#submitBtn').text('Submit');
    
  }

  function repeatFocusOnClose() {
    $('#medallialink').on('focus', function() {
      $('button#btnClose').focus();
    });
  }

  function firstFocusOnLogo() {
    $('#dummySpan,#dummy').on('focus', function() {
      $('#logo').focus();
    });
  }

  function mouseEnter_Label(currentLabel, customClass) {
    var allLabels = $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass);

    for (var i = 0; i < allLabels.length; i++) {
      allLabels.eq(i).removeClass('on');
    }

    $(currentLabel).addClass("hover");

    var cnt = $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass).length;

    var hoveredEle;
    $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass).each(function(index) {
      if ($(this).hasClass("hover")) {
        hoveredEle = index;
        return;
      }
    })

    //hoveredEle = ((hoveredEle + 1) / 2) - 1;
    var allLabels = $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass);

    for (var i = 0; i < cnt; i++) {
      if (i < hoveredEle) {
        allLabels.eq(i).addClass('hover');
        //$('.rate-area label')[i].addClass('hovered');
      }

      if (i == hoveredEle) {
        //allLabels.eq(i).toggleClass('hovered');
        //$('.rate-area label')[i].addClass('hovered');
      }

      if (i > hoveredEle) {
        allLabels.eq(i).removeClass('hover');
        //$('.rate-area label')[i].addClass('notHovered');
      }

    }
  }

  function mouseLeave_Label(currentLabel, customClass) {
    $(currentLabel).removeClass("hover");

    var cnt = $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass).length;
    var allLabels = $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass);

    for (var i = 0; i < cnt; i++) {
      allLabels.eq(i).removeClass('hover');
      //allLabels.eq(i).removeClass('notHovered');
      //$('.rate-area label')[i].addClass('hovered');
    }

    var clickedEle;
    $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass).each(function(index) {
      if ($(this).hasClass("selected")) {
        clickedEle = index;
        return;
      }
    })

    if (clickedEle >= 0) {
      for (var i = 0; i < cnt; i++) {
        if (i < clickedEle) {
          allLabels.eq(i).addClass('on');
          //$('.rate-area label')[i].addClass('hovered');
        }

        if (i == clickedEle) {
          //allLabels.eq(i).toggleClass('hovered');
          //$('.rate-area label')[i].addClass('hovered');
        }

        if (i > clickedEle) {
          allLabels.eq(i).removeClass('on');
          allLabels.eq(i).removeClass('selected');
          //$('.rate-area label')[i].addClass('notHovered');
        }
      }
    }
  }

  function clickedLabels(currentLabel, customClass) {
    var cnt = $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass).length;
    var allLabels = $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass);

    for (var t = 0; t < cnt; t++) {
      allLabels.eq(t).removeClass("hover");
      allLabels.eq(t).removeClass("selected");
      allLabels.eq(t).removeClass("on");
    }

    //var currLabel = $("label[for='"+ $(this).attr("id") +"']");
    $(currentLabel).addClass("selected");
    $(currentLabel).addClass("on");

    var clickedEle;
    //clickedEle = ((clickedEle + 1) / 2) - 1;
    $('neb-rating .neb-rating .neb-rating-value label.rating-label.' + customClass).each(function(index) {
      if ($(this).hasClass("selected")) {
        clickedEle = index;
        return;
      }
    })

    for (var i = 0; i < cnt; i++) {
      if (i < clickedEle) {
        allLabels.eq(i).addClass('on');
        //$('.rate-area label')[i].addClass('hovered');
      }

      if (i == clickedEle) {
        //allLabels.eq(i).toggleClass('hovered');
        //$('.rate-area label')[i].addClass('hovered');
      }

      if (i > clickedEle) {
        allLabels.eq(i).removeClass('on');
        allLabels.eq(i).removeClass('selected');
        //$('.rate-area label')[i].addClass('notHovered');
      }

    }
  }

  function getLabelByUuid(uid) {

    var selectedElementsArr = document.querySelectorAll('div[data-neb-uuid="' + uid + '"] .elementVal');
    if (selectedElementsArr.length > 1 || selectedElementsArr.type === "checkbox") {
      switch (selectedElementsArr[0].nodeName.toLowerCase()) {
        case 'option':
          for (var i = 0; i < selectedElementsArr.length; i++) {
            if (selectedElementsArr[i].selected) {
              //return selectedElementsArr[i].value;
              return selectedElementsArr[i].getAttribute('piping-value');
            }
          }
          break;
        case 'input':
          if (selectedElementsArr[0].type === "radio") {
            for (var i = 0; i < selectedElementsArr.length; i++) {
              if (selectedElementsArr[i].checked) {
                //return selectedElementsArr[i].value;
                return selectedElementsArr[i].getAttribute('piping-value');;
              }
            }
          } else {
            var totalCheckedElements = [];
            for (var i = 0; i < selectedElementsArr.length; i++) {
              if (selectedElementsArr[i].checked) {
                //totalCheckedElements.push(selectedElementsArr[i].value);
                totalCheckedElements.push(selectedElementsArr[i].getAttribute('piping-value'));
              }
            }
            return totalCheckedElements;
          }
          break;
        case 'label':
          return "";
          break;
      }
    } else {
      if (selectedElementsArr && selectedElementsArr.length) {
        return selectedElementsArr[0].value;
      } else {
        return "";
      }

    }
  };
  function init() {
    //Digital_Event_Dispatcher.subscribe('neb_pagesBuildingDone', addAnchorTextTop);
    //addScreenCapture();
    assignHandlers();
    changeTexts();
    addCloseButtonWhenLoadDone(180);
    //$('.required').hide();
    if ((/Android/i.test(navigator.userAgent))) {
      $('.grading input[type=radio]').css('width', '7%');
      $('.grading input[type=radio]').css('height', '4.5%');
      $('.dummy').remove();
    }
    /*if((/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)))
    {
      $('body').css({"overflow":"hidden"});
    }*/
    //trigger 'done'
    Digital_Event_Dispatcher.trigger('neb_customHtmlDone');
    var formId = KAMPYLE_FORM_MODEL.getFormId();
    //if (isformIdExistOnConfig(formId)) {
    changeFooterStyle();
    //}
    //addPrivacylinks();
    updateTextComponent();
    //$('h1').attr('tabindex',"0");
    //$('#subHeading p').attr('tabindex',"0");
    //$('h4').attr('tabindex',"0");
    //$('p span').attr('tabindex',"0");
    $('.builder-label a').attr('tabindex', '0');
    //KAMPYLE_VIEW.focusOnFirstElement();
    //firstFocusOnLogo();
    if($('.dropdown-toggle').length != 0){
        $('.dropdown-menu li button').attr('tabindex','-1');
        $($('.dropdown-menu li button')[0]).attr('tabindex','0');
    }
    repeatFocusOnClose();
    KAMPYLE_VIEW.focusOnFirstElement();
    setTimeout(function(){
        KAMPYLE_SDK.iFrameHeightChanged && KAMPYLE_SDK.iFrameHeightChanged(document.body.scrollHeight);
      },350);
    //KAMPYLE_SDK.scrollToTop();
    //window.addEventListener('kampyleFormShown', KAMPYLE_SDK.scrollToTop);
    initializeSlider();
    slidersToLeft();
    setupCustomDropdown();
    testFunction1();
    testFunction();
    scaleHover();
    scaleHoverLeave();

    /*const textAreaElement = document.querySelector("#countTextArea");
    const characterCounterElement = document.querySelector("#character-counter");
    const typedCharactersElement = document.querySelector("#typed-characters");
    const maximumCharacters = 250;
    const maximumCharactersElement = document.querySelector("#maximum-characters");

    textAreaElement.addEventListener("input", (event) => {
       
        const typedCharacters = textAreaElement.value.length;
        
        if (typedCharacters > maximumCharacters) {
            return false;
        }
        
        typedCharactersElement.textContent = typedCharacters;
        maximumCharactersElement.textContent = ' av 250 tecken';

        // if(window.mLang === "sv"){
        //     maximumCharactersElement.textContent = ' av 250 tecken';
        // }else{
        //     maximumCharactersElement.textContent = ' of 250 characters';
        // }
    });*/

    window.addEventListener('keydown',function(e){
        if(e.which == 27){
            clickClose();
        }
    });
  }

  function slidersToLeft(){
    if($('.rangeslider__handle').text() == ""){
      $('.rangeslider__handle').css('left','0px');
      $('.rangeslider__fill').css('width','12px');
      setTimeout(slidersToLeft,500);
    }
  }

  function setupCustomDropdown(){
    $(".dropdown-menu li button").click(function(){
      $(this).parents(".dropdown").find('.btn').html($(this).text() + ' <span class="caret"></span>');
      $(this).parents(".dropdown").find('.btn').val($(this).data('value'));
      var selectedVal = $(this)[0].value;
      if(selectedVal == "Other"){
        $(this).parents(".dropdown").find('.btn').attr('value', $(this)[0].value);  
      }else{
         var st = $(this).parents(".dropdown").find('.btn')[0].id;
        $(this).parents(".dropdown").find('.btn').attr('value', $(this)[0].value);
        $(this).parents(".dropdown").find('.btn').attr('aria-label', $($(this)[0]).attr('aria-label'));
        $(this.parentElement.parentElement.parentElement).attr('aria-label','');
        $(this).parents(".dropdown.nps").find('.btn').attr('aria-label', $(this)[0].value);
        $($(this).parents("li")).siblings().children('button').attr('aria-selected',false);
        $(this).attr('aria-selected',true);
        setTimeout(function() {
          $('#'+st).focus();
        },100);
      }
    });
  }
  function initializeSlider(){
    $('input[type="range"]').rangeslider({

      // Feature detection the default is `true`.
      // Set this to `false` if you want to use
      // the polyfill also in Browsers which support
      // the native <input type="range"> element.
      polyfill: false,
  
      // Default CSS classes
      rangeClass: 'rangeslider',
      disabledClass: 'rangeslider--disabled',
      horizontalClass: 'rangeslider--horizontal',
      verticalClass: 'rangeslider--vertical',
      fillClass: 'rangeslider__fill',
      handleClass: 'rangeslider__handle',
  
      // Callback function
      onInit: function() {
        var $handle = $('.rangeslider__handle', this.$range);
        //updateHandle($handle[0], this.value);
      },
  
      // Callback function
      onSlide: function(position, value) {
        var $handle = $('.rangeslider__handle', this.$range);
        var newValue = Math.round(value/10);
        updateHandle($handle[0], newValue);
      },
  
      // Callback function
      onSlideEnd: function(position, value) {}
  }).on('input', function(e) {
    var $handle = $('.rangeslider__handle', e.target.nextSibling);
    updateHandle($handle[0], this.value);
    var csstoset = $('.rangeslider__handle').css('left') + 31;
    $('.rangeslider__handle').css('left', csstoset);
    $('.rangeslider--active-div').css('left',csstoset);
  });
  /* Creating a new element for styling purpose */
  $('.rangeslider.rangeslider--horizontal').append("<div class='rangeslider--active-div'></div>");
  $('.rangeslider.rangeslider--horizontal').attr('aria-hidden','true');
  $('.rangeslider.rangeslider--horizontal').attr('tabindex','-1');
  $('.rangeslider__handle').css('left','0px');
  $('.rangeslider__fill').css('width','12px');
  }

  function updateHandle(el, val) {
    el.textContent = val;
  }

  function maskInputText(value)
  {
    var reg = /(\d{4}\s\d{4}\s\d{4}\s\d{4})|((\S|)+\d{3,}(\S|)+)/g;
    var arr1 = [];
    var arr2 = [];

    arr1 = value.match(reg);
    arr2 = value.match(reg);
    if(arr1 != null && arr1.length > 0)
    {
      for(var i=0; i<arr2.length; i++)
      {
        var num_reg = /\d+/g;
        var currValue = arr2[i].match(num_reg);
        if(currValue.length > 0)
        {
          if(currValue[0].length == 3 || currValue[0].length == 4 || currValue[0].length == 6 || currValue[0].length == 11 || currValue[0].length == 16)
          {
            arr2[i] = arr2[i].replace(currValue[0], '***' + currValue[0].substring(3, currValue[0].length));
          }
        }

      }

      for(var j = 0; j<arr1.length; j++)
      {
        value = value.replace(new RegExp("\\b"+arr1[j].toString()+"\\b"), arr2[j]);
      }

    }

    return value;
  }

  function updateTextComponent() {
    var textElements = KAMPYLE_FORM_MODEL.getElementsByType('label');
    for (var i = 0; i < textElements.length; i++) {
      var nebUuid = textElements[i].nebUuid;
      var currTextElement = document.querySelector('div[data-neb-uuid="' + nebUuid + '"] h2') || null;
      if (currTextElement) {
        currTextElement.setAttribute('tabindex', '-1');
      }
    }
  }

  //function addPrivacylinks() {
  //var linkSection =
  //$('' +
  //'<a target="_blank" id="kampylelink1" href="https://www.target.com/c/target-privacy-policy/-/N-4sr7p">privacy</a>&nbsp;&nbsp;&nbsp;&nbsp;<a target="_blank" id="kampylelink2" href="https://www.target.com/c/target-privacy-policy/-/N-4sr7p">ca privacy rights</a>' +
  //'&nbsp;&nbsp;&nbsp;&nbsp;</pre>');
  //$('.powerBySection').prepend($(linkSection));
  //}

  function changeFooterStyle() {
    //KAMPYLE_UTILS.show(document.getElementById('submitBtn'), 'inline-block');
    //KAMPYLE_UTILS.hide(document.getElementById('nextBtn'));
  }

  function errorBox(failedList) {

    var domElem = $("#error-container");
  var listOfErrors = '<div id="error-div" class="error-div">' +
    '<div id="error-title" class="error-title" tabindex="-1">ERROR</div><ol>';

  //iterate on the array of failed list and create links for the errors
  $.each(failedList, function(i) {
    var id = failedList[i].id;
    var missingValueText = id + '">Missing Value:' + $('#lbl_' + id).text() + '</a></li>'

    switch (failedList[i].component) {
      case 'email':
      case 'url':
      case 'radio':
        listOfErrors += '<li><a href="#' + missingValueText;
        break;
      case 'nps':
      case 'grading1to10':
      case 'grading0to10':
        listOfErrors += '<li><a href="#grade_radio01' + missingValueText;
        break;
      case 'grading':
        //listOfErrors += '<li><a href="#grade_radio02' + missingValueText;
        listOfErrors += '<li style="display: inline-block; color:red">Please answer this question</li>';
        break;
      case 'select':
        listOfErrors += '<li><a href="#select' + missingValueText;
        break;
      case 'textArea':
        listOfErrors += '<li><a href="#textArea' + missingValueText;
        break;
      case 'textInput':
        listOfErrors += '<li><a href="#textInput' + missingValueText;
        break;
      case 'checkbox':
        listOfErrors += '<li><a href="#div_0_' + missingValueText;
        break;
      case 'emailFormat':
        listOfErrors += '<li><a href="#' + id + '">A valid email address is required. For example: "name@example.com"</a></li>';
        break;
      case 'urlFormat':
        listOfErrors += '<li><a href="#' + id + '">A valid URL address is required. For example: "www.google.com"</a></li>';
        break;
    }
    var fid = failedList[i].id;
    if(failedList[i].component != 'emailFormat'){
      $('fieldset#' + fid).append('<div style="display: inline-block; font-size: 12px; color:#a94442" id="error_'+fid+'" class="error-div">This Field is Required.</div>');
    }else{
      $('fieldset#' + fid).append('<div style="display: inline-block; color:red" id="error_'+fid+'" class="error-div">Prosimy, podaj adres w formacie: twoj@email.pl</div>');
    }
  })

  listOfErrors += '</ol></div>';
  //domElem.append(listOfErrors);
  $('html, body').animate({
    scrollTop: ($('#error_'+failedList[0].id).offset().top - 300)
    }, 500);
  $("#error-title").focus();
  $('#error_'+failedList[0].id).focus();

  // if(window.KAMPYLE_SPECIFIC) {
  //   KAMPYLE_SPECIFIC.errorBox(failedList);
  // }
};

function changeDisplay(nebUuid) {
    document.querySelector('div[data-neb-uuid="' + nebUuid + '"]').style.display = 'none';
}

function scaleHover(){
    $('.neb-rating-value').mouseenter(function(){
        $(".grading .neb-rating-value").removeClass("notHover");
        $(".grading .neb-rating-value").removeClass("hover");
        var currentStar = $(this);
        currentStar.addClass("hover");

        var hoveredEle = $(this).index();
        var allEle = $('.neb-rating-value');
    });
}

function scaleHoverLeave(){
    $('.neb-rating-value').mouseleave(function() {
        $(".neb-rating-value").removeClass("hover");
    });
}

  //function addAnchorTextTop() {
    //var ratingElements = KAMPYLE_FORM_MODEL.getElementsByType('nps');
    //for (var i = 0; i < ratingElements.length; i++) {
      //var parent = document.querySelector('div.grading');
      //var child = document.querySelector('div.grading>input');
      //var legend = document.querySelector('div.grading legend');

      //parent.insertBefore(legend, child);
    //}
  //}

  function validation(currentPage) {
    var failedList = [];

    //clean any alerts before starting
    $('.error-div').remove();
    $('.validation-error').removeClass('validation-error');

    if (window.KAMPYLE_SDK !== undefined && typeof KAMPYLE_SDK.kampyleGetFormObject === 'function') {
      var formData = window.KAMPYLE_SDK.kampyleGetFormObject();
    }

    if (formData) {
      var currPage = formData.pages[currentPage].dynamicData || null;
    }
    var isDisplayed = true;

    if (currPage) {
      for (var j = 0; j < currPage.length; j++) {
        if ($("div.form-group[data-neb-uuid='" + currPage[j].nebUuid + "']").css('display') === 'none') {
          isDisplayed = false;
        }
        var isFailed = false;
        switch (currPage[j].component) {
          case 'grading':
          case 'nps':
          case 'grading1to10':
          case 'grading0to10':
            var selected = $("input[name='" + currPage[j].id + "']:checked");
            if (currPage[j].required && isDisplayed && selected.length <= 0) {
              isFailed = true;
            }
            break;
          case 'radio':
          case 'checkbox':
            var selected = $("input[name='" + currPage[j].id + "']:checked");
            if (currPage[j].required && isDisplayed && selected.length <= 0) {
              isFailed = true;
            }
            break;
          case 'select':
            var selected = $("#dropdownMenu" + currPage[j].id + " option:selected").val();
            if (currPage[j].required && isDisplayed && selected.length <= 0) {
              isFailed = true;
            }
            break;
          case 'textArea':
            if (currPage[j].required && isDisplayed && $('#textArea' + currPage[j].id).val().trim().length <= 0) {
              isFailed = true;
            }
            break;
          case 'textInput':
            if (currPage[j].required && isDisplayed && $('#textInput' + currPage[j].id).val().trim().length <= 0) {
              isFailed = true;
            }
            break;
          case 'emailInput':
            var itemValue = $('#' + currPage[j].id).val().trim();
            if (currPage[j].required && isDisplayed && itemValue.length <= 0) {
              ErrorName = 'email';
              isFailed = true;
            } else if ((currPage[j].required && isDisplayed && !emailValidation(itemValue)) || (itemValue !== '' && !emailValidation(itemValue))) {
              ErrorName = 'emailFormat';
              isFailed = true;
            }
            break;
          case 'urlInput':
            var itemValue = $('#' + currPage[j].id).val().trim();
            if (currPage[j].required && isDisplayed && itemValue.length <= 0) {
              ErrorName = 'url';
              isFailed = true;
            } else if ((currPage[j].required && isDisplayed && !urlValidation(itemValue)) || (isDisplayed && itemValue !== '' && !urlValidation(itemValue))) {
              ErrorName = 'urlFormat';
              isFailed = true;
            }
            break;
        }
        if (isFailed) {
          var failed = new Object();
          failed.id = currPage[j].id;
          if (currPage[j].component === 'emailInput' || currPage[j].component === 'urlInput') {
            failed.component = ErrorName;
          } else {
            failed.component = currPage[j].component;
          }
          failedList.push(failed);
        }

        isDisplayed = true;
      }
    }

    if (failedList.length > 0) {
      //iterate over the failed list array and color the labels in red.
      $.each(failedList, function(i) {
        $('#lbl_' + failedList[i].id).addClass('validation-error');
      })
      errorBox(failedList);
      KAMPYLE_SDK.iFrameHeightChanged && KAMPYLE_SDK.iFrameHeightChanged();
      return false;
    } else {
      return true;
    }
  }

  function customCompare(nebUuid, inputValue) {
    if (inputValue <= 6 || inputValue >= 9) {
      //page 1
      KAMPYLE_UTILS.show(document.getElementById('nextBtn'), 'inline-block');
      KAMPYLE_UTILS.hide(document.getElementById('submitBtn'));

      //page 2
      KAMPYLE_UTILS.show(document.querySelector('#page_2 button#submitBtn'), 'inline-block');
      KAMPYLE_UTILS.hide(document.getElementById('#page_2 button#nextBtn'));
    }
  }

  function getNestedPropertyValue(obj, propString) {
    if (!obj || !propString) {
      return null;
    }
    var props = propString.split('.');
    var tmpObj = obj;

    var len = props.length;
    for (var i = 0; i < len; i++) {
      if (!!tmpObj && tmpObj.hasOwnProperty(props[i])) {
        tmpObj = tmpObj[props[i]];
      } else {
        return null;
      }
    }
    //Reaching here means we managed to go into the object with all of propString's properties
    return tmpObj;
  };

  function isformIdExistOnConfig(currFormId) {
    var formIdArray = getNestedPropertyValue(window, 'KAMPYLE_FORM_CONFIG.customFormsId') || [];
    if (Array.isArray(formIdArray) && formIdArray.indexOf(currFormId) >= 0) {
      return true;
    } else {
      return false;
    }
  };

  function setFocus(component) {
    if (!!document.getElementById('error-div')) {
      document.getElementById('error-title').focus();
      return;
    }
    if (!!document.querySelector('.thankyou')) {
      document.querySelector('.thankyou h2').focus();
      return;
    }

    var element;
    var checkedValue;
    var checkedElement;
    var componentType = component.component;
    var nebUuid = component.nebUuid;
    var id = component.id;
    switch (componentType) {
      case 'textInput':
      case 'emailInput':
      case 'urlInput':
        element = $('input[data-neb-uuid="' + nebUuid + '"]');
        break;
      case 'label':
        element = document.querySelector('#' + component.unique_name + 'Container').firstChild;
        break;
      case 'radio':
        element = $('input[data-neb-uuid="' + nebUuid + '"]').first();
        break;
      case 'textArea':
        element = $('textArea[data-neb-uuid="' + nebUuid + '"]');
        break;
      case 'checkbox':
        element = $('fieldset[data-neb-uuid="' + nebUuid + '"] div').first();
        break;
      case 'select':
        element = $('select[data-neb-uuid="' + nebUuid + '"]');
        break;
        /*case 'grading':
          checkedValue = KAMPYLE_VIEW.getValueByUuid(nebUuid);
          checkedElement = $('input[value=' + checkedValue + '][data-neb-uuid=' + nebUuid + ']');
          if (checkedValue !== undefined) {
            labelhover('lab' + checkedValue + id);
            element = checkedElement;
          }
          else {
            labelhover('lab1' + id);
            element = $('input[data-neb-uuid="' + nebUuid + '"]').first();
          }
          break;*/
      case 'nps':
        /*case 'grading1to10':
          checkedValue = KAMPYLE_VIEW.getValueByUuid(nebUuid);
          checkedElement = $('input[value=' + checkedValue + '][data-neb-uuid=' + nebUuid + ']');
          if (checkedValue !== undefined) {
            labelhover('lab' + checkedValue + id);
            element = checkedElement;
          }
          else {
            element = $('input[data-neb-uuid="' + nebUuid + '"]').first();
          }
          break;*/
      default:
        break;
    }
    if (element) {
      // commented out for embedded search to avoid moving focus to bottom of search results
      //element.focus();
    }
    if (componentType === 'nps' || componentType === 'grading1to10') {
      $('#lab0' + id).addClass('grading-focus-element');
    }
    $(element).off('keydown', KAMPYLE_VIEW.checkTabPressOnFirstElement);
    $(element).on('keydown', KAMPYLE_VIEW.checkTabPressOnFirstElement);
  }

  return {
    getTemplate: getTemplate,
    sliderTap: sliderTap,
    //toggleCheckbox: toggleCheckbox,
    addCustomElement: addCustomElement,
    getCustomChanges: getCustomChanges,
    clickNext: clickNext,
    clickClose: clickClose,
    clickSend: clickSend,
    assignHandlers: assignHandlers,
    disableScreenCapture: disableScreenCapture,
    firstFocusOnLogo: firstFocusOnLogo,
    repeatFocusOnClose: repeatFocusOnClose,
    init: init,
    getPrevious: getPrevious,
    setPrevious: setPrevious,
    changeFooterStyle: changeFooterStyle,
    triggerScreenCapture: triggerScreenCapture,
    addScreenCapture: addScreenCapture,
    changeDisplay: changeDisplay,
    //addAnchorTextTop: addAnchorTextTop,
    validation: validation,
    customCompare: customCompare,
    isformIdExistOnConfig: isformIdExistOnConfig,
    //addPrivacylinks: addPrivacylinks,
    errorBox: errorBox,
    setFocus: setFocus,
    updateTextComponent: updateTextComponent,
  };
})();
(function(){

    window.KAMPYLE_CLIENT_CONFIG = {
        ROUTES: {
            disableScreenCapture: '//assets.kampyle.com/resources/clients/target/disabledScreenCapture.png',
            screenCapture: '//assets.kampyle.com/resources/clients/target/screenCaptue.png',
        }
        //errorOnTop: true

    };

})();